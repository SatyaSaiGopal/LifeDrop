import { BLOOD_GROUPS } from './format';

/**
 * Front-end validation mirrors the server rules so users get instant feedback.
 * It is never the only check — the API re-validates everything.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,19}$/;

export function validateEmail(value) {
  if (!value) return 'Email is required';
  if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address';
  return null;
}

export function validatePhone(value) {
  if (!value) return 'Phone number is required';
  if (!PHONE_RE.test(value.trim())) return 'Enter a valid phone number (7–20 digits)';
  return null;
}

export function validatePassword(value) {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(value)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
  return null;
}

export function validateRequired(value, label = 'This field') {
  if (value === undefined || value === null || String(value).trim() === '') return `${label} is required`;
  return null;
}

export function validateName(value) {
  if (!value || !value.trim()) return 'Full name is required';
  if (value.trim().length < 2) return 'Name must be at least 2 characters';
  if (value.trim().length > 80) return 'Name is too long';
  return null;
}

export function validateBloodGroup(value) {
  if (!value) return 'Select a blood group';
  if (!BLOOD_GROUPS.includes(value)) return 'Select a valid blood group';
  return null;
}

export function validateDateOfBirth(value) {
  if (!value) return 'Date of birth is required';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Enter a valid date';
  const now = new Date();
  if (date.getTime() > now.getTime()) return 'Date of birth must be in the past';
  const age = (now.getTime() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 18) return 'Donors must be at least 18 years old';
  if (age > 100) return 'Enter a valid date of birth';
  return null;
}

/** Optional date that must not be in the future. */
export function validatePastDate(value, label = 'Date') {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `Enter a valid ${label.toLowerCase()}`;
  if (date.getTime() > Date.now() + 24 * 3600 * 1000) return `${label} cannot be in the future`;
  return null;
}

export function validateFutureDate(value, label = 'Date') {
  if (!value) return `${label} is required`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `Enter a valid ${label.toLowerCase()}`;
  if (date.getTime() < Date.now() - 60 * 60 * 1000) return `${label} must be in the future`;
  return null;
}

export function validateUnits(value) {
  if (value === '' || value === undefined || value === null) return 'Units required is required';
  const n = Number(value);
  if (!Number.isInteger(n)) return 'Enter a whole number of units';
  if (n < 1) return 'At least 1 unit is required';
  if (n > 20) return 'Contact the blood bank directly for more than 20 units';
  return null;
}

export function validateCoordinates(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 'Set your location so nearby donors can find you';
  }
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return 'Location coordinates are invalid';
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return 'Location coordinates are out of range';
  return null;
}
