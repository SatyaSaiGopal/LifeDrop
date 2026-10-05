const BloodRequest = require('../models/BloodRequest');
const DonorProfile = require('../models/DonorProfile');
const ApiError = require('../utils/ApiError');
const { asyncHandler, sendOk, sendCreated, paginationMeta } = require('../utils/http');
const { serializeRequest, serializeOwnRequest } = require('../services/privacy');
const requestService = require('../services/request.service');

/** Attach this viewer's own response (if any) to a serialized request. */
function withViewerResponse(serialized, request, viewerId) {
  if (!viewerId) return serialized;
  const mine = (request.responses || []).find((r) => r.user && r.user.toString() === viewerId);
  return { ...serialized, myResponse: mine ? { status: mine.status, respondedAt: mine.respondedAt, note: mine.note } : null };
}

/** POST /api/requests — create a blood request. */
const create = asyncHandler(async (req, res) => {
  const { request, matches } = await requestService.createRequest(req.user, req.body);
  const viewerId = req.user._id.toString();
  return sendCreated(res, {
    request: serializeOwnRequest(request, { viewerId }),
    // Compatible nearby donors are returned so the requester can act at once.
    matches,
  });
});

/** GET /api/requests — feed with scope, blood group, status and radius filters. */
const list = asyncHandler(async (req, res) => {
  const params = req.validatedQuery;
  const viewerId = req.user ? req.user._id.toString() : null;
  const { page, limit } = params;
  const skip = (page - 1) * limit;

  const filter = {};
  if (params.scope === 'mine') {
    if (!req.user) throw ApiError.unauthorized('Sign in to see your requests');
    filter.requester = req.user._id;
  }
  if (params.scope === 'responded') {
    if (!req.user) throw ApiError.unauthorized('Sign in to see your responses');
    filter['responses.user'] = req.user._id;
  }
  if (params.bloodGroup) filter.bloodGroup = params.bloodGroup;
  if (params.urgency) filter.urgency = params.urgency;
  if (params.status === 'open') filter.status = 'pending';
  else if (params.status) filter.status = params.status;

  if (params.q) {
    const rx = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ hospitalName: rx }, { city: rx }, { patientName: rx }, { locationNote: rx }];
  }

  // Radius filter around the viewer when coordinates are supplied.
  if (params.lat !== undefined && params.lng !== undefined) {
    const radiusKm = Math.min(params.radius || 50, 500);
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [params.lng, params.lat] },
        $maxDistance: radiusKm * 1000,
      },
    };
  }

  const [rows, total] = await Promise.all([
    BloodRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    BloodRequest.countDocuments(filter),
  ]);

  return sendOk(
    res,
    rows.map((r) => withViewerResponse(serializeRequest(r, { viewerId }), r, viewerId)),
    { ...paginationMeta(page, limit, total), filters: params }
  );
});

/** GET /api/requests/:id */
const getOne = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('That blood request could not be found');

  const viewerId = req.user ? req.user._id.toString() : null;
  const isOwner = viewerId && request.requester.toString() === viewerId;

  // Donors who accepted may see the requester's contact number.
  const hasAccepted = Boolean(
    viewerId && request.responses.some((r) => r.user.toString() === viewerId && ['accepted', 'donated'].includes(r.status))
  );

  const serialized = withViewerResponse(
    isOwner ? serializeOwnRequest(request, { viewerId }) : serializeRequest(request, { viewerId }),
    request,
    viewerId
  );
  if (hasAccepted && !isOwner) serialized.contactPhone = request.contactPhone || null;

  return sendOk(res, { request: serialized, canViewContact: Boolean(isOwner || hasAccepted) });
});

/** GET /api/requests/:id/matches — compatible donors near this request. */
const matches = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('That blood request could not be found');
  if (!req.user || request.requester.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the requester can view matched donors');
  }
  const radius = Math.min(Number(req.query.radius) || 50, 200);
  const rows = await requestService.findMatchingDonors(request, { radiusKm: radius, limit: 30 });
  return sendOk(res, rows, { radiusKm: radius });
});

/** PATCH /api/requests/:id — owner edits an open request. */
const update = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('That blood request could not be found');
  if (!req.user || request.requester.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the requester can edit this request');
  }
  if (['cancelled', 'fulfilled'].includes(request.status) && req.body.status === undefined) {
    throw ApiError.conflict(`A ${request.status} request can no longer be edited`);
  }

  const data = req.body;
  const fields = ['patientName', 'bloodGroup', 'unitsRequired', 'hospitalName', 'city', 'state', 'country', 'locationNote', 'requiredAt', 'urgency', 'message', 'contactPhone'];
  for (const field of fields) if (data[field] !== undefined) request[field] = data[field];
  if (data.latitude !== undefined && data.longitude !== undefined) {
    request.location = { type: 'Point', coordinates: [data.longitude, data.latitude] };
  }
  if (data.status !== undefined) {
    request.status = data.status;
    if (data.status === 'fulfilled') {
      request.fulfilledAt = new Date();
      request.unitsFulfilled = request.unitsRequired;
    }
    if (data.status === 'cancelled') request.cancelledAt = new Date();
  }

  await request.save();
  const viewerId = req.user._id.toString();
  return sendOk(res, { request: serializeOwnRequest(request, { viewerId }) });
});

/**
 * POST /api/requests/:id/respond — a donor accepts or declines.
 * Idempotent per donor: responding again updates the existing entry rather
 * than appending a duplicate.
 */
const respond = asyncHandler(async (req, res) => {
  if (!req.user.profile) throw ApiError.forbidden('Only registered donors can respond to requests');
  const request = await BloodRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('That blood request could not be found');

  if (request.requester.toString() === req.user._id.toString()) {
    throw ApiError.conflict('You cannot respond to your own blood request');
  }
  if (['cancelled', 'fulfilled'].includes(request.status)) {
    throw ApiError.conflict(`This request is already ${request.status}`);
  }

  const donor = await DonorProfile.findById(req.user.profile).select('bloodGroup city');
  if (!donor) throw ApiError.forbidden('Only registered donors can respond to requests');

  const { action, note = null } = req.body;
  const status = action === 'accept' ? 'accepted' : 'declined';

  const existing = request.responses.find((r) => r.user.toString() === req.user._id.toString());
  if (existing) {
    existing.status = status;
    existing.note = note;
    existing.respondedAt = new Date();
  } else {
    request.responses.push({
      donor: donor._id,
      user: req.user._id,
      status,
      note,
      respondedAt: new Date(),
    });
  }

  // First acceptance moves a pending request into the accepted state.
  if (status === 'accepted' && request.status === 'pending') request.status = 'accepted';

  await request.save();
  const viewerId = req.user._id.toString();
  return sendOk(res, {
    request: withViewerResponse(serializeRequest(request, { viewerId }), request, viewerId),
    respondedAs: status,
  });
});

/** Convenience wrappers so the routes read naturally. */
const accept = (req, res, next) => { req.body = { ...req.body, action: 'accept' }; return respond(req, res, next); };
const decline = (req, res, next) => { req.body = { ...req.body, action: 'decline' }; return respond(req, res, next); };

/** POST /api/requests/:id/cancel — owner cancels a request. */
const cancel = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('That blood request could not be found');
  if (!req.user || request.requester.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the requester can cancel this request');
  }
  if (request.status === 'cancelled') throw ApiError.conflict('This request is already cancelled');
  if (request.status === 'fulfilled') throw ApiError.conflict('A fulfilled request cannot be cancelled');

  request.status = 'cancelled';
  request.cancelledAt = new Date();
  await request.save();

  const viewerId = req.user._id.toString();
  return sendOk(res, { request: serializeOwnRequest(request, { viewerId }) });
});

/** POST /api/requests/:id/fulfill — owner marks the need as met. */
const fulfill = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('That blood request could not be found');
  if (!req.user || request.requester.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the requester can mark this request fulfilled');
  }
  if (request.status === 'cancelled') throw ApiError.conflict('A cancelled request cannot be fulfilled');
  if (request.status === 'fulfilled') throw ApiError.conflict('This request is already fulfilled');

  request.status = 'fulfilled';
  request.fulfilledAt = new Date();
  request.unitsFulfilled = request.unitsRequired;
  await request.save();

  const viewerId = req.user._id.toString();
  return sendOk(res, { request: serializeOwnRequest(request, { viewerId }) });
});

module.exports = { create, list, getOne, matches, update, respond, accept, decline, cancel, fulfill };
