const config = require('../config/env');

/** Whole years between a date of birth and now. */
function ageFromDateOfBirth(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

/**
 * Medical eligibility windows used widely in blood banking. These are
 * *guidance* indicators surfaced to users only; the UI always states that the
 * final decision rests with the collecting blood bank or clinician.
 */
const MIN_DAYS_BETWEEN_DONATIONS = 90; // whole-blood donation interval

/**
 * @returns {{eligible:boolean, reason:string|null, daysUntilEligible:number|null, nextEligibleDate:string|null}}
 */
function donationEligibility({ lastDonationDate, dateOfBirth, available }) {
  const age = ageFromDateOfBirth(dateOfBirth);

  if (age !== null && age < config.donor.minAge) {
    return {
      eligible: false,
      reason: `Donors must be at least ${config.donor.minAge} years old.`,
      daysUntilEligible: null,
      nextEligibleDate: null,
    };
  }
  if (age !== null && age > config.donor.maxAge) {
    return {
      eligible: false,
      reason: `Donors above ${config.donor.maxAge} need individual clearance from the blood bank.`,
      daysUntilEligible: null,
      nextEligibleDate: null,
    };
  }

  if (!lastDonationDate) {
    return {
      eligible: available !== false,
      reason: available === false ? 'This donor has marked themselves unavailable.' : null,
      daysUntilEligible: null,
      nextEligibleDate: null,
    };
  }

  const last = new Date(lastDonationDate);
  if (Number.isNaN(last.getTime())) {
    return { eligible: false, reason: 'Last donation date is invalid.', daysUntilEligible: null, nextEligibleDate: null };
  }

  const next = new Date(last);
  next.setUTCDate(next.getUTCDate() + MIN_DAYS_BETWEEN_DONATIONS);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.ceil((next.getTime() - Date.now()) / msPerDay);

  if (daysUntil > 0) {
    return {
      eligible: false,
      reason: `Usually a ${MIN_DAYS_BETWEEN_DONATIONS}-day gap is recommended between whole-blood donations.`,
      daysUntilEligible: daysUntil,
      nextEligibleDate: next.toISOString(),
    };
  }

  return {
    eligible: available !== false,
    reason: available === false ? 'This donor has marked themselves unavailable.' : null,
    daysUntilEligible: null,
    nextEligibleDate: null,
  };
}

module.exports = { ageFromDateOfBirth, donationEligibility, MIN_DAYS_BETWEEN_DONATIONS };
