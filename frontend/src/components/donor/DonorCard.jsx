import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Badge, { AvailabilityBadge, BloodGroupBadge } from '../ui/Badge';
import { cx, formatDistance, formatDate, relativeTime } from '../../utils/format';

/**
 * Donor result card.
 * Shows only what helps someone decide and act: who, which group, how far,
 * where, whether available, and when they last donated.
 */
export default function DonorCard({ donor, onRequest, onSelect, selected = false, className = '' }) {
  const eligible = donor.eligibility?.eligible !== false;
  const distance = formatDistance(donor.distanceKm);
  const area = donor.areaLabel || [donor.city, donor.state].filter(Boolean).join(', ');

  return (
    <article
      className={cx(
        'card-interactive flex flex-col p-4',
        selected && 'border-brand-400 ring-1 ring-brand-300',
        className
      )}
      aria-label={`Donor ${donor.name}`}
    >
      <div className="flex items-start gap-3">
        <Avatar src={donor.profilePhoto} name={donor.name} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink-900">
                <Link
                  to={`/donors/${donor.id}`}
                  className="hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                >
                  {donor.name}
                </Link>
                {donor.isSelf && <span className="ml-1.5 text-xs font-medium text-ink-400">(you)</span>}
              </h3>
              {area && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
                    <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.25a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
                  </svg>
                  <span className="truncate">{area}</span>
                </p>
              )}
            </div>
            <BloodGroupBadge group={donor.bloodGroup} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <AvailabilityBadge available={donor.available} size="sm" />
        {distance && (
          <Badge
            tone="info"
            size="sm"
            icon={
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden="true">
                <path d="M6 0 1 11h4.5v1h1v-1H11L6 0Zm0 4.5L7.9 9H4.1L6 4.5Z" />
              </svg>
            }
          >
            {distance} away
          </Badge>
        )}
        {!eligible && (
          <Badge tone="warning" size="sm">
            Not currently eligible
          </Badge>
        )}
      </div>

      <dl className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink-100 pt-3 text-xs">
        <div>
          <dt className="text-ink-400">Last donation</dt>
          <dd className="mt-0.5 font-medium text-ink-700">
            {donor.lastDonationDate ? (
              <span title={formatDate(donor.lastDonationDate)}>{relativeTime(donor.lastDonationDate)}</span>
            ) : (
              'First-time donor'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-400">Donations</dt>
          <dd className="mt-0.5 font-medium text-ink-700">
            {donor.totalDonations > 0 ? donor.totalDonations : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <Button as="link" to={`/donors/${donor.id}`} variant="secondary" size="sm" className="flex-1">
          View profile
        </Button>
        {onRequest && !donor.isSelf && (
          <Button variant="primary" size="sm" className="flex-1" onClick={() => onRequest(donor)}>
            Request blood
          </Button>
        )}
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(donor)}
            className={cx(
              'btn btn-secondary btn-sm px-2.5',
              selected && 'border-brand-300 bg-brand-50 text-brand-700'
            )}
            aria-label={selected ? `Hide ${donor.name} on the map` : `Show ${donor.name} on the map`}
            aria-pressed={selected}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.25a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
