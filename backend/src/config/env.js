require('dotenv').config();

/**
 * Centralised, validated runtime configuration.
 * Fails fast in production when a required secret is missing rather than
 * silently booting with an insecure default.
 */
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isTest = env === 'test';

function required(name, fallback) {
  const value = process.env[name];
  if (value && value.trim() !== '') return value.trim();
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return fallback;
}

const config = {
  env,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/lifeline'),
  jwt: {
    secret: required('JWT_SECRET', 'dev-only-insecure-secret-do-not-use-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploads: {
    driver: process.env.UPLOAD_DRIVER || 'local',
    maxBytes: (Number(process.env.MAX_UPLOAD_MB) || 2) * 1024 * 1024,
  },
  search: {
    defaultRadiusKm: Number(process.env.DEFAULT_SEARCH_RADIUS_KM) || 25,
    maxRadiusKm: Number(process.env.MAX_SEARCH_RADIUS_KM) || 100,
  },
  donor: {
    minAge: Number(process.env.DONOR_MIN_AGE) || 18,
    maxAge: Number(process.env.DONOR_MAX_AGE) || 65,
  },
};

module.exports = config;
