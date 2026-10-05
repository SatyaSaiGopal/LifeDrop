const mongoose = require('mongoose');
const { BLOOD_GROUPS, URGENCY_LEVELS, REQUEST_STATUSES, RESPONSE_STATUSES } = require('../utils/constants');

const { Schema } = mongoose;

const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite),
        message: 'Location coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

/**
 * A donor's response to a request. `donor` references the DonorProfile and
 * `user` the owning account so authorization checks need no extra join.
 */
const responseSchema = new Schema(
  {
    donor: { type: Schema.Types.ObjectId, ref: 'DonorProfile', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: { values: RESPONSE_STATUSES, message: 'Invalid response status' },
      default: 'invited',
    },
    note: { type: String, trim: true, maxlength: 400, default: null },
    respondedAt: { type: Date, default: null },
  },
  { _id: true, timestamps: true }
);

const bloodRequestSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Name of the patient or the person coordinating, shown to donors.
    patientName: { type: String, required: true, trim: true, maxlength: 80 },
    bloodGroup: {
      type: String,
      required: true,
      enum: { values: BLOOD_GROUPS, message: 'Select a valid blood group' },
      index: true,
    },
    unitsRequired: { type: Number, required: true, min: 1, max: 20, default: 1 },
    unitsFulfilled: { type: Number, default: 0, min: 0 },

    hospitalName: { type: String, required: true, trim: true, maxlength: 140 },
    location: { type: pointSchema, required: true },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80, default: null },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    // Free-text landmark shown alongside the hospital name.
    locationNote: { type: String, trim: true, maxlength: 160, default: null },

    requiredAt: { type: Date, required: true },
    urgency: {
      type: String,
      enum: { values: URGENCY_LEVELS, message: 'Select a valid urgency level' },
      default: 'normal',
      index: true,
    },
    message: { type: String, trim: true, maxlength: 600, default: null },
    contactPhone: { type: String, trim: true, maxlength: 20, default: null },

    status: {
      type: String,
      enum: { values: REQUEST_STATUSES, message: 'Invalid request status' },
      default: 'pending',
      index: true,
    },
    responses: { type: [responseSchema], default: [] },

    // Set when the requester confirms the need was met.
    fulfilledAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Geospatial index so a request can surface its own nearby donor pool.
bloodRequestSchema.index({ location: '2dsphere' });
// Feed queries: open requests, newest / most urgent first.
bloodRequestSchema.index({ status: 1, requiredAt: 1 });
bloodRequestSchema.index({ status: 1, createdAt: -1 });

/** Number of donors who accepted so far. */
bloodRequestSchema.virtual('acceptedCount').get(function acceptedCount() {
  return (this.responses || []).filter((r) => r.status === 'accepted' || r.status === 'donated').length;
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
