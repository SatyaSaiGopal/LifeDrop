const BloodRequest = require('../models/BloodRequest');
const DonorProfile = require('../models/DonorProfile');
const { compatibleDonorGroupsRanked } = require('../utils/constants');

const KM_TO_METERS = 1000;

/**
 * Find donors whose blood is compatible with a request, ranked by distance and
 * then by exact-group match. Uses $geoNear so the radius filter and distance
 * sort are executed by MongoDB.
 */
async function findMatchingDonors(request, { radiusKm = 25, limit = 25, onlyAvailable = true } = {}) {
  const [lng, lat] = request.location.coordinates;
  const groups = compatibleDonorGroupsRanked(request.bloodGroup);

  const match = {
    bloodGroup: { $in: groups },
    // Never match the requester's own donor profile.
    user: { $ne: request.requester },
  };
  if (onlyAvailable) match.available = true;

  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * KM_TO_METERS,
        spherical: true,
        key: 'location',
      },
    },
    { $match: match },
    {
      $addFields: {
        // 0 for an exact group match, 1 otherwise, so exact matches win ties.
        groupRank: { $indexOfArray: [groups, '$bloodGroup'] },
      },
    },
    { $sort: { distanceMeters: 1, groupRank: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        donorName: 1,
        bloodGroup: 1,
        city: 1,
        state: 1,
        areaLabel: 1,
        available: 1,
        lastDonationDate: 1,
        profilePhoto: 1,
        distanceMeters: 1,
      },
    },
  ];

  const rows = await DonorProfile.aggregate(pipeline);
  return rows.map((r) => ({
    id: r._id.toString(),
    name: r.donorName,
    bloodGroup: r.bloodGroup,
    city: r.city,
    state: r.state,
    areaLabel: r.areaLabel,
    available: r.available,
    lastDonationDate: r.lastDonationDate,
    profilePhoto: r.profilePhoto,
    distanceKm: Math.round((r.distanceMeters / KM_TO_METERS) * 10) / 10,
    exactMatch: r.bloodGroup === request.bloodGroup,
  }));
}

/**
 * Create a request and, when a location is known, seed it with the compatible
 * donors found nearby so the requester immediately sees who can help.
 */
async function createRequest(requester, data) {
  const request = await BloodRequest.create({
    requester: requester._id,
    patientName: data.patientName,
    bloodGroup: data.bloodGroup,
    unitsRequired: data.unitsRequired,
    hospitalName: data.hospitalName,
    location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
    city: data.city,
    state: data.state || null,
    country: data.country,
    locationNote: data.locationNote || null,
    requiredAt: data.requiredAt,
    urgency: data.urgency || 'normal',
    message: data.message || null,
    contactPhone: data.contactPhone || requester.phone || null,
  });

  const matches = await findMatchingDonors(request, { radiusKm: 50, limit: 25 });
  return { request, matches };
}

/**
 * Open requests relevant to a donor: compatible groups, optionally limited to
 * those near the donor. Returns requests ordered by urgency then recency.
 */
async function findRequestsForDonor(donor, { radiusKm = 50, limit = 20 } = {}) {
  const groups = compatibleDonorGroupsRanked(donor.bloodGroup);
  const [lng, lat] = donor.location.coordinates;

  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * KM_TO_METERS,
        spherical: true,
        key: 'location',
      },
    },
    {
      $match: {
        status: 'pending',
        bloodGroup: { $in: groups },
        requester: { $ne: donor.user },
      },
    },
    {
      $addFields: {
        urgencyRank: {
          $switch: {
            branches: [
              { case: { $eq: ['$urgency', 'critical'] }, then: 0 },
              { case: { $eq: ['$urgency', 'high'] }, then: 1 },
              { case: { $eq: ['$urgency', 'normal'] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },
    { $sort: { urgencyRank: 1, requiredAt: 1, distanceMeters: 1 } },
    { $limit: limit },
  ];

  const rows = await BloodRequest.aggregate(pipeline);
  // Re-hydrate through the model so virtuals (acceptedCount) are available.
  const ids = rows.map((r) => r._id);
  const distanceById = new Map(rows.map((r) => [r._id.toString(), r.distanceMeters / KM_TO_METERS]));
  const docs = await BloodRequest.find({ _id: { $in: ids } });
  docs.sort((a, b) => ids.indexOf(a._id) - ids.indexOf(b._id));
  return { requests: docs, distanceById };
}

module.exports = { findMatchingDonors, createRequest, findRequestsForDonor };
