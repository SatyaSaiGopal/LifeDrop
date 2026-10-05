const mongoose = require('mongoose');
const { BLOOD_GROUPS, GENDERS, CONTACT_METHODS } = require('../utils/constants');

const { Schema } = mongoose;

const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    // GeoJSON order is [longitude, latitude] — the opposite of how it is spoken.
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length === 2 &&
          Number.isFinite(v[0]) &&
          Number.isFinite(v[1]) &&
          v[0] >= -180 && v[0] <= 180 &&
          v[1] >= -90 && v[1] <= 90,
        message: 'Location coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false }
);

const donorProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: { values: BLOOD_GROUPS, message: 'Select a valid blood group' },
      index: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: { values: GENDERS, message: 'Select a valid gender' },
      required: true,
    },
    profilePhoto: { type: String, default: null },

    // ---- Donation history ----
    lastDonationDate: { type: Date, default: null },
    totalDonations: { type: Number, default: 0, min: 0 },
    isFirstTimeDonor: { type: Boolean, default: false },

    // ---- Availability ----
    available: { type: Boolean, default: true, index: true },
    availabilityUpdatedAt: { type: Date, default: Date.now },
    // When a donor is temporarily unavailable they can set a return date.
    availableAgainOn: { type: Date, default: null },

    // ---- Location ----
    // Exact coordinates are stored for geospatial matching but are never
    // returned verbatim to other users — see services/privacy.js.
    location: { type: pointSchema, required: true },
    city: { type: String, required: true, trim: true, maxlength: 80, index: true },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    country: { type: String, required: true, trim: true, maxlength: 80, index: true },
    // A coarse, human-readable area label (e.g. "Koramangala, Bengaluru").
    areaLabel: { type: String, trim: true, maxlength: 120, default: null },

    // ---- Contact preference ----
    preferredContactMethod: {
      type: String,
      enum: { values: CONTACT_METHODS, message: 'Select a valid contact method' },
      default: 'in_app',
    },

    bio: { type: String, trim: true, maxlength: 400, default: null },

    // Denormalised pointer so donor cards render without a join.
    donorName: { type: String, required: true, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Geospatial index powering $near / $geoNear radius searches.
donorProfileSchema.index({ location: '2dsphere' });

// Compound index for the common "available donors in a blood group" filter.
donorProfileSchema.index({ bloodGroup: 1, available: 1 });
// Supports the "recently active" sort without a collection scan.
donorProfileSchema.index({ updatedAt: -1 });

/** Stable public identifier that does not leak the Mongo ObjectId. */
donorProfileSchema.virtual('publicId').get(function publicId() {
  return this._id ? this._id.toString() : null;
});

module.exports = mongoose.model('DonorProfile', donorProfileSchema);
