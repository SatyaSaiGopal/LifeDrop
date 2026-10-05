/** Shared, side-effect-free helpers. */

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
];

export const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const CONTACT_METHOD_LABELS = {
  phone: 'Phone call',
  email: 'Email',
  in_app: 'In-app message',
};

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

/**
 * Donor -> recipient compatibility (which groups a donor's blood can help).
 * Standard ABO/Rh rules, shown as general guidance only.
 */
export const DONOR_TO_RECIPIENT = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export const RECIPIENT_FROM_DONOR = BLOOD_GROUPS.reduce((acc, recipient) => {
  acc[recipient] = BLOOD_GROUPS.filter((donor) => DONOR_TO_RECIPIENT[donor].includes(recipient));
  return acc;
}, {});

/** "2.4 km" / "850 m" from a kilometre number. */
export function formatDistance(km) {
  if (km === null || km === undefined || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

const RELATIVE_UNITS = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3600, divisor: 60, unit: 'minute' },
  { limit: 86400, divisor: 3600, unit: 'hour' },
  { limit: 604800, divisor: 86400, unit: 'day' },
  { limit: 2629800, divisor: 604800, unit: 'week' },
  { limit: 31557600, divisor: 2629800, unit: 'month' },
  { limit: Infinity, divisor: 31557600, unit: 'year' },
];

/** "3 days ago" / "in 2 hours", using the platform's relative-time formatter. */
export function relativeTime(input) {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(seconds);

  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    for (const { limit, divisor, unit } of RELATIVE_UNITS) {
      if (abs < limit) return rtf.format(Math.round(seconds / divisor), unit);
    }
  }
  return date.toLocaleDateString();
}

export function formatDate(input, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!input) return '—';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, options);
}

export function formatDateTime(input) {
  return formatDate(input, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Value for an <input type="datetime-local"> from an ISO string. */
export function toDateTimeLocalValue(input) {
  const date = input ? new Date(input) : new Date(Date.now() + 24 * 3600 * 1000);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Value for an <input type="date"> from an ISO string. */
export function toDateInputValue(input) {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Initials for an avatar fallback: "Asha Verma" -> "AV". */
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Tailwind classes for a blood group badge — consistent across the app. */
export function bloodGroupTone(group) {
  const negative = group?.endsWith('-');
  return negative
    ? 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200'
    : 'bg-brand-600 text-white';
}

export function urgencyTone(urgency) {
  switch (urgency) {
    case 'critical':
      return 'bg-brand-600 text-white';
    case 'high':
      return 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200';
    case 'low':
      return 'bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-200';
    default:
      return 'bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-200';
  }
}

export function statusTone(status) {
  switch (status) {
    case 'pending':
      return { className: 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200', label: 'Pending' };
    case 'accepted':
      return { className: 'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200', label: 'Accepted' };
    case 'fulfilled':
      return { className: 'bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-200', label: 'Fulfilled' };
    case 'cancelled':
      return { className: 'bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-200', label: 'Cancelled' };
    case 'declined':
      return { className: 'bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-200', label: 'Declined' };
    case 'invited':
      return { className: 'bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-200', label: 'Invited' };
    case 'donated':
      return { className: 'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200', label: 'Donated' };
    default:
      return { className: 'bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-200', label: status };
  }
}

/** Clamp a number into a range. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Join class names, dropping falsy values. */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
