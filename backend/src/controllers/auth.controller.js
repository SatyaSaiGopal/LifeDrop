const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const ApiError = require('../utils/ApiError');
const { asyncHandler, sendOk, sendCreated } = require('../utils/http');
const { signToken, cookieOptions } = require('../services/token.service');
const { serializeSelf } = require('../services/privacy');
const { COOKIE_NAME } = require('../middleware/auth');
const logger = require('../utils/logger');

/** Build a DonorProfile document from validated registration input. */
async function createDonorProfile(user, data) {
  return DonorProfile.create({
    user: user._id,
    donorName: user.name,
    bloodGroup: data.bloodGroup,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    profilePhoto: data.profilePhoto || null,
    lastDonationDate: data.lastDonationDate || null,
    isFirstTimeDonor: !data.lastDonationDate,
    available: data.available !== false,
    location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
    city: data.city,
    state: data.state,
    country: data.country,
    areaLabel: data.areaLabel || null,
    preferredContactMethod: data.preferredContactMethod || 'in_app',
    bio: data.bio || null,
  });
}

const register = asyncHandler(async (req, res) => {
  const data = req.body;

  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw ApiError.conflict('An account with that email already exists', { email: 'Email already registered' });
  }

  const passwordHash = await User.hashPassword(data.password);
  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash,
    role: data.role || 'seeker',
  });

  let profile = null;
  if (user.role === 'donor') {
    try {
      profile = await createDonorProfile(user, data);
      user.profile = profile._id;
      await user.save();
    } catch (err) {
      // Keep the account and profile consistent: roll the user back if the
      // profile could not be created.
      await User.deleteOne({ _id: user._id });
      throw err;
    }
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  logger.info(`New ${user.role} registered: ${user._id}`);

  return sendCreated(res, { user: serializeSelf(user, profile), token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // passwordHash has select:false, so ask for it explicitly.
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same generic message for unknown email and wrong password: no user enumeration.
  const invalid = ApiError.unauthorized('Incorrect email or password');
  if (!user || !user.isActive) throw invalid;

  const ok = await user.verifyPassword(password);
  if (!ok) throw invalid;

  let profile = null;
  if (user.profile) profile = await DonorProfile.findById(user.profile);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return sendOk(res, { user: serializeSelf(user, profile), token });
});

const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  return sendOk(res, { message: 'Signed out' });
});

const me = asyncHandler(async (req, res) => {
  let profile = null;
  if (req.user.profile) profile = await DonorProfile.findById(req.user.profile);
  return sendOk(res, { user: serializeSelf(req.user, profile) });
});

module.exports = { register, login, logout, me };
