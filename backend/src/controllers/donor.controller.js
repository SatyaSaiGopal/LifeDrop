const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler, sendOk, paginationMeta } = require('../utils/http');
const { serializePublicDonor, serializeOwnProfile } = require('../services/privacy');
const donorService = require('../services/donor.service');
const { compatibleDonorGroups } = require('../utils/constants');

/** GET /api/donors/nearby — geospatial radius search. */
const nearby = asyncHandler(async (req, res) => {
  const params = req.validatedQuery;
  const viewerId = req.user ? req.user._id.toString() : null;

  const { donors, total, radiusKm } = await donorService.findNearbyDonors(params, viewerId);

  return sendOk(
    res,
    donors.map((d) => serializePublicDonor(d, { distanceKm: d.distanceKm, viewerId })),
    {
      ...paginationMeta(params.page, params.limit, total),
      radiusKm,
      center: { latitude: params.lat, longitude: params.lng },
      filters: {
        bloodGroup: params.bloodGroup || null,
        available: params.available,
        sort: params.sort,
        q: params.q || null,
      },
    }
  );
});

/** GET /api/donors — browse/list without a location (text + filters). */
const list = asyncHandler(async (req, res) => {
  const params = req.validatedQuery;
  const viewerId = req.user ? req.user._id.toString() : null;
  const { donors, total } = await donorService.listDonors(params, viewerId);
  return sendOk(
    res,
    donors.map((d) => serializePublicDonor(d, { viewerId })),
    { ...paginationMeta(params.page, params.limit, total), filters: params }
  );
});

/** GET /api/donors/cities — distinct cities with donor counts. */
const cities = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '';
  const rows = await donorService.listDonorCities(q, 20);
  return sendOk(res, rows);
});

/** GET /api/donors/stats — headline counts for the landing page. */
const stats = asyncHandler(async (_req, res) => {
  return sendOk(res, await donorService.donorStats());
});

/**
 * GET /api/donors/:id — public donor profile.
 * Contact details are withheld unless the viewer is the donor themselves or
 * has an accepted response on one of their own blood requests.
 */
const getOne = asyncHandler(async (req, res) => {
  const donor = await donorService.getDonorById(req.params.id);
  if (!donor) throw ApiError.notFound('That donor profile could not be found');

  const viewerId = req.user ? req.user._id.toString() : null;
  const isSelf = viewerId && donor.user && donor.user._id.toString() === viewerId;

  const payload = serializePublicDonor(donor, { viewerId });
  // Contact is intentionally never included here; it is released through
  // GET /api/donors/:id/contact once the request flow grants access.
  return sendOk(res, { donor: payload, canViewContact: Boolean(isSelf) });
});

/** PATCH /api/donors/:id — update own donor profile. */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!user.profile || user.profile.toString() !== id) {
    throw ApiError.forbidden('You can only edit your own donor profile');
  }

  const donor = await DonorProfile.findById(id);
  if (!donor) throw ApiError.notFound('Donor profile not found');

  const data = req.body;

  // --- donor profile fields ---
  const profileFields = [
    'bloodGroup', 'dateOfBirth', 'gender', 'city', 'state', 'country',
    'areaLabel', 'preferredContactMethod', 'bio', 'profilePhoto',
  ];
  for (const field of profileFields) {
    if (data[field] !== undefined) donor[field] = data[field];
  }
  if (data.lastDonationDate !== undefined) {
    donor.lastDonationDate = data.lastDonationDate;
    donor.isFirstTimeDonor = !data.lastDonationDate;
  }
  if (data.available !== undefined) {
    donor.available = data.available;
    donor.availabilityUpdatedAt = new Date();
  }
  if (data.availableAgainOn !== undefined) donor.availableAgainOn = data.availableAgainOn;
  if (data.latitude !== undefined && data.longitude !== undefined) {
    donor.location = { type: 'Point', coordinates: [data.longitude, data.latitude] };
  }
  // Keep the denormalised name in sync when the account name changes.
  if (data.name !== undefined) donor.donorName = data.name;

  await donor.save();

  // --- user account fields ---
  const userUpdates = {};
  if (data.name !== undefined) userUpdates.name = data.name;
  if (data.phone !== undefined) userUpdates.phone = data.phone;
  if (Object.keys(userUpdates).length) {
    await User.findByIdAndUpdate(user._id, userUpdates, { runValidators: true });
    Object.assign(user, userUpdates);
  }

  return sendOk(res, { profile: serializeOwnProfile(donor) });
});

/** PATCH /api/donors/:id/availability — quick availability toggle. */
const updateAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  if (!user.profile || user.profile.toString() !== id) {
    throw ApiError.forbidden('You can only change your own availability');
  }

  const donor = await DonorProfile.findById(id);
  if (!donor) throw ApiError.notFound('Donor profile not found');

  const { available, availableAgainOn = null, lastDonationDate } = req.body;
  donor.available = available;
  donor.availabilityUpdatedAt = new Date();
  donor.availableAgainOn = available ? null : availableAgainOn;
  if (lastDonationDate !== undefined) {
    donor.lastDonationDate = lastDonationDate;
    donor.isFirstTimeDonor = !lastDonationDate;
  }
  await donor.save();

  return sendOk(res, { profile: serializeOwnProfile(donor) });
});

/**
 * GET /api/donors/:id/contact — release contact details.
 * Allowed only for the donor themselves, or for a requester who owns a blood
 * request this donor has accepted. Everyone else gets the donor's preferred
 * channel through the in-app request flow instead.
 */
const contact = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized('Sign in to contact a donor');
  const donor = await donorService.getDonorById(req.params.id);
  if (!donor) throw ApiError.notFound('That donor profile could not be found');

  const viewerId = req.user._id.toString();
  const isSelf = donor.user && donor.user._id.toString() === viewerId;

  const BloodRequest = require('../models/BloodRequest');
  const donorUserId = donor.user._id;
  // Contact is released in both directions once a request connects the two
  // people: the requester may see a donor who accepted, and that donor may see
  // the requester. Any other viewer is sent through the request flow instead.
  const [acceptedMyRequest, iAcceptedTheirs] = await Promise.all([
    BloodRequest.exists({
      requester: req.user._id,
      responses: { $elemMatch: { donor: donor._id, status: { $in: ['accepted', 'donated'] } } },
    }),
    BloodRequest.exists({
      requester: donorUserId,
      responses: { $elemMatch: { user: req.user._id, status: { $in: ['accepted', 'donated'] } } },
    }),
  ]);
  const hasAccepted = Boolean(acceptedMyRequest || iAcceptedTheirs);

  if (!isSelf && !hasAccepted) {
    throw ApiError.forbidden(
      'Contact details are shared once a donor accepts your blood request. Send a request to get in touch.'
    );
  }

  const { serializeDonorContact } = require('../services/privacy');
  return sendOk(res, {
    contact: serializeDonorContact(donor, donor.user),
    reason: isSelf ? 'self' : 'accepted_request',
  });
});

/** GET /api/donors/:id/compatibility — which groups this donor can give to. */
const compatibility = asyncHandler(async (req, res) => {
  const donor = await DonorProfile.findById(req.params.id).select('bloodGroup');
  if (!donor) throw ApiError.notFound('That donor profile could not be found');
  const { DONOR_TO_RECIPIENT } = require('../utils/constants');
  return sendOk(res, {
    bloodGroup: donor.bloodGroup,
    canDonateTo: DONOR_TO_RECIPIENT[donor.bloodGroup] || [],
    canReceiveFrom: compatibleDonorGroups(donor.bloodGroup),
  });
});

module.exports = { nearby, list, cities, stats, getOne, update, updateAvailability, contact, compatibility };
