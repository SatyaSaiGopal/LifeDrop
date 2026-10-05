const BloodRequest = require('../models/BloodRequest');
const DonorProfile = require('../models/DonorProfile');
const { asyncHandler, sendOk } = require('../utils/http');
const { serializePublicDonor, serializeRequest, serializeOwnProfile } = require('../services/privacy');
const requestService = require('../services/request.service');

/**
 * GET /api/dashboard — a single, action-oriented payload for the signed-in
 * user. Deliberately returns what the user can *do next* (nearby requests to
 * answer, donors near an open request, profile gaps to fill) rather than
 * decorative metrics.
 */
const dashboard = asyncHandler(async (req, res) => {
  const user = req.user;
  const viewerId = user._id.toString();

  const payload = { role: user.role };

  // ---- My blood requests (as a requester) ----
  const myRequests = await BloodRequest.find({ requester: user._id }).sort({ createdAt: -1 }).limit(5);
  payload.myRequests = myRequests.map((r) => serializeRequest(r, { viewerId }));

  payload.myRequestSummary = {
    open: await BloodRequest.countDocuments({ requester: user._id, status: 'pending' }),
    accepted: await BloodRequest.countDocuments({ requester: user._id, status: 'accepted' }),
    total: await BloodRequest.countDocuments({ requester: user._id }),
  };

  // ---- Requests this user responded to as a donor ----
  const responded = await BloodRequest.find({ 'responses.user': user._id }).sort({ updatedAt: -1 }).limit(5);
  payload.respondedRequests = responded.map((r) => {
    const mine = r.responses.find((x) => x.user.toString() === viewerId);
    return {
      ...serializeRequest(r, { viewerId }),
      myResponse: mine ? { status: mine.status, respondedAt: mine.respondedAt } : null,
    };
  });

  // ---- Donor-specific data ----
  if (user.profile) {
    const donor = await DonorProfile.findById(user.profile);
    if (donor) {
      payload.donor = serializeOwnProfile(donor);

      // Open, compatible requests near this donor — the primary call to action.
      const { requests, distanceById } = await requestService.findRequestsForDonor(donor, { radiusKm: 50, limit: 8 });
      payload.nearbyRequests = requests.map((r) => ({
        ...serializeRequest(r, { viewerId }),
        distanceKm: Math.round((distanceById.get(r._id.toString()) || 0) * 10) / 10,
      }));

      // Compatible donors near the donor (useful for referrals).
      const openRequest = myRequests.find((r) => r.status === 'pending');
      if (openRequest) {
        const matchRadius = 50;
        const matches = await requestService.findMatchingDonors(openRequest, { radiusKm: matchRadius, limit: 6 });
        payload.requestMatches = { requestId: openRequest._id.toString(), radiusKm: matchRadius, donors: matches };
      }
    }
  }

  // ---- Seeker-specific: donors near an open request they created ----
  if (!payload.donor && myRequests.length) {
    const openRequest = myRequests.find((r) => r.status === 'pending');
    if (openRequest) {
      const matches = await requestService.findMatchingDonors(openRequest, { radiusKm: 50, limit: 8 });
      payload.nearbyMatchingDonors = matches;
      payload.matchedForRequestId = openRequest._id.toString();
    }
  }

  return sendOk(res, payload);
});

module.exports = { dashboard };
