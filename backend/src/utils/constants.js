/**
 * Domain constants shared across models, validation and the API layer.
 * Blood compatibility data follows standard ABO/Rh transfusion rules and is
 * presented in the UI as general guidance only, never as medical advice.
 */

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

const CONTACT_METHODS = ['phone', 'email', 'in_app'];

const URGENCY_LEVELS = ['low', 'normal', 'high', 'critical'];

const REQUEST_STATUSES = ['pending', 'accepted', 'fulfilled', 'cancelled'];

const RESPONSE_STATUSES = ['invited', 'accepted', 'declined', 'donated'];

/**
 * Which recipient blood groups a donor of a given group can give to.
 * e.g. O- is the universal donor.
 */
const DONOR_TO_RECIPIENT = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/**
 * Which donor blood groups a recipient of a given group can receive from.
 * e.g. AB+ is the universal recipient.
 */
const RECIPIENT_FROM_DONOR = Object.fromEntries(
  BLOOD_GROUPS.map((recipient) => [
    recipient,
    BLOOD_GROUPS.filter((donor) => DONOR_TO_RECIPIENT[donor].includes(recipient)),
  ])
);

/**
 * Donor groups compatible for a recipient. Used to widen a blood request's
 * donor search so O- recipients still see O- donors, AB+ see everyone, etc.
 */
function compatibleDonorGroups(recipientGroup) {
  return RECIPIENT_FROM_DONOR[recipientGroup] || [];
}

/**
 * Donors whose blood can be given to the given recipient, ordered from the
 * exact match outward (exact match first so it ranks highest).
 */
function compatibleDonorGroupsRanked(recipientGroup) {
  const groups = compatibleDonorGroups(recipientGroup);
  return [recipientGroup, ...groups.filter((g) => g !== recipientGroup)];
}

module.exports = {
  BLOOD_GROUPS,
  GENDERS,
  CONTACT_METHODS,
  URGENCY_LEVELS,
  REQUEST_STATUSES,
  RESPONSE_STATUSES,
  DONOR_TO_RECIPIENT,
  RECIPIENT_FROM_DONOR,
  compatibleDonorGroups,
  compatibleDonorGroupsRanked,
};
