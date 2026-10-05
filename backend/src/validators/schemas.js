const { z } = require('zod');
const {
  BLOOD_GROUPS,
  GENDERS,
  CONTACT_METHODS,
  URGENCY_LEVELS,
  REQUEST_STATUSES,
} = require('../utils/constants');

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(160);

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s\-()]{6,19}$/, 'Enter a valid phone number');

/**
 * Password policy: at least 8 chars with a letter and a number. Deliberately
 * avoids forcing symbol soup while still rejecting trivially weak secrets.
 */
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const bloodGroup = z.enum(BLOOD_GROUPS, {
  errorMap: () => ({ message: 'Select a valid blood group' }),
});

const gender = z.enum(GENDERS, {
  errorMap: () => ({ message: 'Select a valid gender' }),
});

const contactMethod = z.enum(CONTACT_METHODS, {
  errorMap: () => ({ message: 'Select a valid contact method' }),
});

const urgency = z.enum(URGENCY_LEVELS, {
  errorMap: () => ({ message: 'Select a valid urgency level' }),
});

const requestStatus = z.enum(REQUEST_STATUSES, {
  errorMap: () => ({ message: 'Invalid request status' }),
});

const latitude = z.coerce.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90');
const longitude = z.coerce.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180');

const dateOfBirth = z
  .union([z.string(), z.date()])
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), 'Enter a valid date of birth')
  .refine((d) => d.getTime() < Date.now(), 'Date of birth must be in the past')
  .refine((d) => d.getUTCFullYear() > 1900, 'Enter a valid date of birth');

const futureOrNow = (label) =>
  z
    .union([z.string(), z.date()])
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), `Enter a valid ${label}`)
    .refine((d) => d.getTime() > Date.now() - 60 * 60 * 1000, `${label} must be in the future`);

const pastOrNull = (label) =>
  z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined || v === '' ? null : new Date(v)))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), `Enter a valid ${label}`)
    .refine((d) => d === null || d.getTime() < Date.now() + 24 * 60 * 60 * 1000, `${label} cannot be in the future`);

const bio = z.string().trim().max(400, 'Bio must be 400 characters or fewer').optional().nullable();

const photoUrl = z.string().trim().max(500).optional().nullable();

// ---------------------------------------------------------------- auth
const registerSchema = z.object({
  name,
  email,
  phone,
  password,
  role: z.enum(['donor', 'seeker']).optional().default('seeker'),
  // Donor fields are required when role === 'donor'; enforced in .superRefine.
  bloodGroup: bloodGroup.optional(),
  dateOfBirth: dateOfBirth.optional(),
  gender: gender.optional(),
  city: z.string().trim().min(1, 'City is required').max(80).optional(),
  state: z.string().trim().min(1, 'State is required').max(80).optional(),
  country: z.string().trim().min(1, 'Country is required').max(80).optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  areaLabel: z.string().trim().max(120).optional().nullable(),
  available: z.boolean().optional().default(true),
  lastDonationDate: pastOrNull('last donation date'),
  preferredContactMethod: contactMethod.optional().default('in_app'),
  bio,
  profilePhoto: photoUrl,
}).superRefine((data, ctx) => {
  if (data.role !== 'donor') return;
  const required = ['bloodGroup', 'dateOfBirth', 'gender', 'city', 'state', 'country', 'latitude', 'longitude'];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'This field is required for donor accounts' });
    }
  }
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

// ---------------------------------------------------------------- donors
const donorUpdateSchema = z
  .object({
    name,
    phone,
    bloodGroup,
    dateOfBirth,
    gender,
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().min(1).max(80),
    country: z.string().trim().min(1).max(80),
    latitude,
    longitude,
    areaLabel: z.string().trim().max(120).nullable(),
    available: z.boolean(),
    availableAgainOn: pastOrNull('availability return date'),
    lastDonationDate: pastOrNull('last donation date'),
    preferredContactMethod: contactMethod,
    bio,
    profilePhoto: photoUrl,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update' })
  .refine((data) => {
    // Location must move as a pair, otherwise a partial update would leave
    // coordinates and city inconsistent.
    const hasLat = data.latitude !== undefined;
    const hasLng = data.longitude !== undefined;
    return hasLat === hasLng;
  }, { message: 'Latitude and longitude must be provided together' });

const availabilitySchema = z.object({
  available: z.boolean({ required_error: 'Availability is required' }),
  availableAgainOn: pastOrNull('availability return date'),
  lastDonationDate: pastOrNull('last donation date'),
});

const nearbyQuerySchema = z.object({
  lat: latitude,
  lng: longitude,
  radius: z.coerce
    .number()
    .min(1, 'Radius must be at least 1 km')
    .max(500, 'Radius must be 500 km or less')
    .optional(),
  bloodGroup: bloodGroup.optional(),
  available: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((v) => (v === undefined ? 'all' : v)),
  sort: z.enum(['distance', 'recent']).optional().default('distance'),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
  excludeSelf: z.enum(['true', 'false']).optional().default('true').transform((v) => v === 'true'),
});

const donorListQuerySchema = z.object({
  bloodGroup: bloodGroup.optional(),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  available: z.enum(['true', 'false', 'all']).optional().default('all'),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(['recent', 'name']).optional().default('recent'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

// ---------------------------------------------------------------- requests
const createRequestSchema = z.object({
  patientName: name,
  bloodGroup,
  unitsRequired: z.coerce.number().int().min(1, 'At least 1 unit is required').max(20, 'Contact the blood bank for more than 20 units'),
  hospitalName: z.string().trim().min(2, 'Hospital name is required').max(140),
  city: z.string().trim().min(1, 'City is required').max(80),
  state: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().min(1, 'Country is required').max(80),
  latitude,
  longitude,
  locationNote: z.string().trim().max(160).optional().nullable(),
  requiredAt: futureOrNow('required date'),
  urgency: urgency.optional().default('normal'),
  message: z.string().trim().max(600).optional().nullable(),
  contactPhone: phone.optional().nullable(),
});

const updateRequestSchema = z
  .object({
    patientName: name,
    bloodGroup,
    unitsRequired: z.coerce.number().int().min(1).max(20),
    hospitalName: z.string().trim().min(2).max(140),
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().max(80).nullable(),
    country: z.string().trim().min(1).max(80),
    latitude,
    longitude,
    locationNote: z.string().trim().max(160).nullable(),
    requiredAt: futureOrNow('required date'),
    urgency,
    message: z.string().trim().max(600).nullable(),
    contactPhone: phone.nullable(),
    status: requestStatus,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update' });

const requestListQuerySchema = z.object({
  bloodGroup: bloodGroup.optional(),
  status: z.enum([...REQUEST_STATUSES, 'open']).optional(),
  urgency: urgency.optional(),
  scope: z.enum(['all', 'mine', 'responded']).optional().default('all'),
  lat: latitude.optional(),
  lng: longitude.optional(),
  radius: z.coerce.number().min(1).max(500).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

const respondSchema = z.object({
  action: z.enum(['accept', 'decline'], { errorMap: () => ({ message: 'Action must be accept or decline' }) }),
  note: z.string().trim().max(400).optional().nullable(),
});

module.exports = {
  registerSchema,
  loginSchema,
  donorUpdateSchema,
  availabilitySchema,
  nearbyQuerySchema,
  donorListQuerySchema,
  createRequestSchema,
  updateRequestSchema,
  requestListQuerySchema,
  respondSchema,
  objectId,
};
