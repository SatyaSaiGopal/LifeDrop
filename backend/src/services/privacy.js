const { ageFromDateOfBirth, donationEligibility } = require('../utils/eligibility');

/**
 * Privacy layer. This is the only place that decides what a *different* user
 * is allowed to see about a donor. Everything returned to the client passes
 * through here, so adding a sensitive field to the schema does not
 * automatically leak it.
 */

/**
 * Coarsen exact coordinates to roughly ~1.1 km precision by rounding to two
 * decimal places, so a donor's home cannot be pinpointed from the map.
 * The stored value stays exact for distance calculations.
 */
function approximateCoordinates([lng, lat]) {
  const round = (n) => Math.round(n * 100) / 100;
  return [round(lng), round(lat)];
}

/** Shape a user document for the authenticated owner (never the hash). */
function serializeSelf(user, profile) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    profile: profile ? serializeOwnProfile(profile) : null,
  };
}

/** The owner's own full profile, including exact coordinates and preferences. */
function serializeOwnProfile(profile) {
  if (!profile) return null;
  return {
    id: profile._id.toString(),
    bloodGroup: profile.bloodGroup,
    dateOfBirth: profile.dateOfBirth,
    age: ageFromDateOfBirth(profile.dateOfBirth),
    gender: profile.gender,
    profilePhoto: profile.profilePhoto,
    available: profile.available,
    availabilityUpdatedAt: profile.availabilityUpdatedAt,
    availableAgainOn: profile.availableAgainOn,
    lastDonationDate: profile.lastDonationDate,
    totalDonations: profile.totalDonations,
    isFirstTimeDonor: profile.isFirstTimeDonor,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    areaLabel: profile.areaLabel,
    // Exact coordinates are safe here: this is the owner's own data.
    location: { type: 'Point', coordinates: profile.location.coordinates },
    preferredContactMethod: profile.preferredContactMethod,
    bio: profile.bio,
    eligibility: donationEligibility({
      lastDonationDate: profile.lastDonationDate,
      dateOfBirth: profile.dateOfBirth,
      available: profile.available,
    }),
    updatedAt: profile.updatedAt,
  };
}

/**
 * Public donor card. Deliberately excludes email, phone, date of birth, exact
 * coordinates and the raw Mongo id. Contact details are only released through
 * the request/contact flow (see serializeDonorContact).
 */
function serializePublicDonor(profile, { distanceKm = null, viewerId = null } = {}) {
  if (!profile) return null;
  const eligibility = donationEligibility({
    lastDonationDate: profile.lastDonationDate,
    dateOfBirth: profile.dateOfBirth,
    available: profile.available,
  });

  const ownerId = profile.user && profile.user._id ? profile.user._id.toString() : profile.user?.toString();

  return {
    id: profile._id.toString(),
    name: profile.donorName,
    bloodGroup: profile.bloodGroup,
    profilePhoto: profile.profilePhoto,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    areaLabel: profile.areaLabel,
    available: profile.available,
    availableAgainOn: profile.availableAgainOn,
    lastDonationDate: profile.lastDonationDate,
    totalDonations: profile.totalDonations,
    bio: profile.bio,
    preferredContactMethod: profile.preferredContactMethod,
    distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
    // Approximate marker for map display only.
    approxLocation: profile.location ? approximateCoordinates(profile.location.coordinates) : null,
    eligibility: { eligible: eligibility.eligible, reason: eligibility.reason },
    isSelf: Boolean(viewerId && ownerId && viewerId === ownerId),
    updatedAt: profile.updatedAt,
  };
}

/**
 * Contact details, released only to an authenticated viewer who has a real
 * reason to reach the donor (an accepted request, or the donor's chosen
 * method). Returns nulls when the donor has not opted in to that channel.
 */
function serializeDonorContact(profile, user) {
  if (!profile || !user) return null;
  const method = profile.preferredContactMethod;
  return {
    preferredContactMethod: method,
    email: method === 'email' || method === 'in_app' ? user.email : null,
    phone: method === 'phone' || method === 'in_app' ? user.phone : null,
  };
}

/** A blood request as seen in a public/feed listing. */
function serializeRequest(request, { viewerId = null } = {}) {
  const requesterId = request.requester && request.requester._id
    ? request.requester._id.toString()
    : request.requester?.toString();
  const responses = (request.responses || []).map((r) => ({
    donor: r.donor?._id ? r.donor._id.toString() : r.donor?.toString(),
    status: r.status,
    note: r.note,
    respondedAt: r.respondedAt,
  }));

  return {
    id: request._id.toString(),
    patientName: request.patientName,
    bloodGroup: request.bloodGroup,
    unitsRequired: request.unitsRequired,
    unitsFulfilled: request.unitsFulfilled,
    hospitalName: request.hospitalName,
    city: request.city,
    state: request.state,
    country: request.country,
    locationNote: request.locationNote,
    requiredAt: request.requiredAt,
    urgency: request.urgency,
    message: request.message,
    status: request.status,
    // Never expose the requester's private phone to the open feed; it is
    // released only to donors who have accepted the request.
    contactPhone: null,
    acceptedCount: responses.filter((r) => r.status === 'accepted' || r.status === 'donated').length,
    invitedCount: responses.filter((r) => r.status === 'invited').length,
    responses,
    approxLocation: request.location ? approximateCoordinates(request.location.coordinates) : null,
    isOwner: Boolean(viewerId && requesterId && viewerId === requesterId),
    fulfilledAt: request.fulfilledAt,
    cancelledAt: request.cancelledAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

/** The owner's own request view, including contact and exact coordinates. */
function serializeOwnRequest(request, { viewerId = null, viewerResponse = null } = {}) {
  const base = serializeRequest(request, { viewerId });
  return {
    ...base,
    contactPhone: request.contactPhone || null,
    location: request.location ? { type: 'Point', coordinates: request.location.coordinates } : null,
    myResponse: viewerResponse,
  };
}

module.exports = {
  approximateCoordinates,
  serializeSelf,
  serializeOwnProfile,
  serializePublicDonor,
  serializeDonorContact,
  serializeRequest,
  serializeOwnRequest,
};
