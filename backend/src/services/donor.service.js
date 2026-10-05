const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');
const config = require('../config/env');

/**
 * Geospatial donor search. All radius filtering, distance calculation and
 * distance sorting happen inside MongoDB via a $geoNear aggregation stage, so
 * the database only returns the slice of donors we actually need — the API
 * never pulls the whole collection into memory to filter in JavaScript.
 */

const KM_TO_METERS = 1000;

/** Build the $geoNear + $match pipeline for a radius search. */
function buildNearbyPipeline({ lat, lng, radiusKm, bloodGroup, available, sort, q, skip, limit, excludeUserId }) {
  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * KM_TO_METERS,
        spherical: true,
        // Only index-backed fields may appear in `query`; the remaining
        // filters run as a $match after, where they can use their own indexes.
        key: 'location',
      },
    },
    { $match: { user: { $ne: excludeUserId } } },
  ];

  if (bloodGroup) pipeline.push({ $match: { bloodGroup } });
  if (available === 'true') pipeline.push({ $match: { available: true } });

  if (q) {
    // Case-insensitive match across the display name and area labels.
    const rx = new RegExp(escapeRegex(q), 'i');
    pipeline.push({ $match: { $or: [{ donorName: rx }, { city: rx }, { areaLabel: rx }, { state: rx }] } });
  }

  // "recent" keeps the geo ordering as a tiebreak but prioritises active donors.
  const sortStage =
    sort === 'recent'
      ? { $sort: { updatedAt: -1, distanceMeters: 1 } }
      : { $sort: { distanceMeters: 1, updatedAt: -1 } };

  pipeline.push({
    $facet: {
      results: [sortStage, { $skip: skip }, { $limit: limit }],
      total: [{ $count: 'count' }],
    },
  });

  return pipeline;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @returns {{ donors: Array, total: number, distanceKm: number }}
 */
async function findNearbyDonors(params, viewerId = null) {
  const {
    lat,
    lng,
    radius = config.search.defaultRadiusKm,
    bloodGroup = null,
    available = 'all',
    sort = 'distance',
    q = null,
    page = 1,
    limit = 12,
    excludeSelf = true,
  } = params;

  const radiusKm = Math.min(radius, config.search.maxRadiusKm);
  const skip = (page - 1) * limit;

  const pipeline = buildNearbyPipeline({
    lat,
    lng,
    radiusKm,
    bloodGroup,
    available,
    sort,
    q,
    skip,
    limit,
    excludeUserId: excludeSelf && viewerId ? viewerId : null,
  });

  const [agg] = await DonorProfile.aggregate(pipeline);
  const rows = agg?.results || [];
  const total = agg?.total?.[0]?.count || 0;

  // $geoNear gives metres; convert once here so serializers stay dumb.
  const donors = rows.map((row) => ({ ...row, distanceKm: row.distanceMeters / KM_TO_METERS }));

  return { donors, total, radiusKm };
}

/** Non-geo listing used for browse/search-by-text without a location. */
async function listDonors(params, viewerId = null) {
  const { bloodGroup, city, country, available, q, sort, page, limit } = params;
  const filter = {};
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (country) filter.country = new RegExp(`^${escapeRegex(country)}$`, 'i');
  if (available === 'true') filter.available = true;
  if (available === 'false') filter.available = false;
  if (viewerId) filter.user = { $ne: viewerId };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ donorName: rx }, { city: rx }, { areaLabel: rx }, { state: rx }, { country: rx }];
  }

  const sortStage = sort === 'name' ? { donorName: 1 } : { updatedAt: -1 };

  const [rows, total] = await Promise.all([
    DonorProfile.find(filter).sort(sortStage).skip((page - 1) * limit).limit(limit),
    DonorProfile.countDocuments(filter),
  ]);

  return { donors: rows, total };
}

/** Load a single donor plus the owning user (for contact, gated by the caller). */
async function getDonorById(id) {
  const donor = await DonorProfile.findById(id).populate('user', 'name email phone role');
  return donor;
}

/**
 * Distinct cities that actually have donors — powers the "search by city"
 * autocomplete without a hardcoded list. Also returns a representative
 * coordinate per city (the average donor position) so a city can be selected
 * without a geocoding round-trip.
 */
async function listDonorCities(query = '', limit = 20) {
  const match = query ? { city: new RegExp(escapeRegex(query), 'i') } : {};
  const rows = await DonorProfile.aggregate([
    { $match: match },
    {
      $group: {
        _id: { city: '$city', state: '$state', country: '$country' },
        donors: { $sum: 1 },
        // Average the [lng, lat] pairs of donors in the city.
        avgLng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
        avgLat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
      },
    },
    { $sort: { donors: -1, '_id.city': 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        city: '$_id.city',
        state: '$_id.state',
        country: '$_id.country',
        donorCount: '$donors',
        latitude: '$avgLat',
        longitude: '$avgLng',
      },
    },
  ]);
  return rows;
}

/** Aggregate counts used on the dashboard and landing stats. */
async function donorStats() {
  const [row] = await DonorProfile.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        available: { $sum: { $cond: ['$available', 1, 0] } },
        cities: { $addToSet: '$city' },
      },
    },
    { $project: { _id: 0, total: 1, available: 1, cityCount: { $size: '$cities' } } },
  ]);
  const byGroup = await DonorProfile.aggregate([
    { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
    { $project: { _id: 0, bloodGroup: '$_id', count: 1 } },
    { $sort: { bloodGroup: 1 } },
  ]);
  return { total: row?.total || 0, available: row?.available || 0, cityCount: row?.cityCount || 0, byGroup };
}

module.exports = { findNearbyDonors, listDonors, getDonorById, listDonorCities, donorStats };
