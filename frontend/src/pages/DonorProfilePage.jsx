import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Badge, { AvailabilityBadge, BloodGroupBadge } from '../components/ui/Badge';
import { ErrorState, LoadingState } from '../components/feedback/States';
import RequestDonorModal from '../components/donor/RequestDonorModal';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useAuth } from '../context/AuthContext';
import { donorApi } from '../services/endpoints';
import {
  CONTACT_METHOD_LABELS,
  DONOR_TO_RECIPIENT,
  RECIPIENT_FROM_DONOR,
  formatDate,
  relativeTime,
} from '../utils/format';

/**
 * Public donor profile. Everything shown here is intentionally limited to what
 * helps someone decide to reach out — no email, phone, exact address or date
 * of birth.
 */
export default function DonorProfilePage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [requestOpen, setRequestOpen] = useState(false);

  const resource = useAsyncResource(({ signal }) => donorApi.get(id, { signal }), [id]);
  const donor = resource.data?.donor;

  if (resource.loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <LoadingState label="Loading donor profile…" />
      </div>
    );
  }

  if (resource.error) {
    const notFound = resource.error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState
          title={notFound ? 'Donor not found' : 'We could not load this profile'}
          message={
            notFound
              ? 'This donor profile may have been removed or the link is incorrect.'
              : resource.error.message
          }
          onRetry={notFound ? undefined : resource.reload}
        />
        <div className="mt-4 text-center">
          <Button as="link" to="/search" variant="secondary">
            Back to donor search
          </Button>
        </div>
      </div>
    );
  }

  if (!donor) return null;

  const area = donor.areaLabel || [donor.city, donor.state].filter(Boolean).join(', ');
  const isSelf = donor.isSelf || user?.profile?.id === donor.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="mb-4 text-sm" aria-label="Breadcrumb">
        <Link to="/search" className="text-ink-500 hover:text-brand-700">
          ← Back to search
        </Link>
      </nav>

      <article className="card overflow-hidden">
        {/* Header */}
        <div className="border-b border-ink-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar src={donor.profilePhoto} name={donor.name} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-ink-900">{donor.name}</h1>
                <BloodGroupBadge group={donor.bloodGroup} />
                {isSelf && <Badge tone="info">Your profile</Badge>}
              </div>

              {area && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.25a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
                  </svg>
                  {area}
                  {donor.distanceKm != null && <span className="text-ink-400">· {donor.distanceKm} km from your search</span>}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <AvailabilityBadge available={donor.available} />
                {donor.eligibility?.eligible === false && <Badge tone="warning">Not currently eligible</Badge>}
                <Badge tone="neutral">
                  Prefers {CONTACT_METHOD_LABELS[donor.preferredContactMethod]?.toLowerCase() || 'in-app message'}
                </Badge>
              </div>

              {isSelf && (
                <div className="mt-4">
                  <Button as="link" to="/profile" variant="secondary" size="sm">
                    Edit my profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Facts */}
        <dl className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-3">
          <Fact label="Last donation">
            {donor.lastDonationDate ? (
              <>
                <span>{relativeTime(donor.lastDonationDate)}</span>
                <span className="mt-0.5 block text-xs font-normal text-ink-400">{formatDate(donor.lastDonationDate)}</span>
              </>
            ) : (
              'First-time donor'
            )}
          </Fact>
          <Fact label="Total donations">
            {donor.totalDonations > 0 ? donor.totalDonations : '—'}
          </Fact>
          <Fact label="Availability">
            {donor.available ? 'Available to donate' : donor.availableAgainOn ? `Back ${relativeTime(donor.availableAgainOn)}` : 'Not available'}
          </Fact>
        </dl>

        {/* Eligibility note */}
        {donor.eligibility && (
          <div className="border-t border-ink-100 p-5 sm:p-6">
            <div
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
                donor.eligibility.eligible
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5h1.5v1.5h-1.5V4.5Zm0 3h1.5v4h-1.5v-4Z" />
              </svg>
              <span>
                <span className="block font-semibold">
                  {donor.eligibility.eligible ? 'Looks available to donate' : 'May not be eligible right now'}
                </span>
                {donor.eligibility.reason && <span className="mt-0.5 block text-xs leading-relaxed">{donor.eligibility.reason}</span>}
                <span className="mt-1 block text-xs leading-relaxed opacity-80">
                  This is general guidance only. The blood bank or a clinician makes the final decision.
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Bio */}
        {donor.bio && (
          <div className="border-t border-ink-100 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-ink-900">About</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">{donor.bio}</p>
          </div>
        )}

        {/* Compatibility */}
        <div className="border-t border-ink-100 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-ink-900">Blood compatibility</h2>
          <p className="mt-1 text-xs text-ink-500">General ABO/Rh guidance — confirm with the hospital or blood bank.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-ink-500">Can donate red cells to</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(DONOR_TO_RECIPIENT[donor.bloodGroup] || []).map((group) => (
                  <BloodGroupBadge key={group} group={group} size="sm" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500">Can receive red cells from</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(RECIPIENT_FROM_DONOR[donor.bloodGroup] || []).map((group) => (
                  <BloodGroupBadge key={group} group={group} size="sm" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy + actions */}
        <div className="border-t border-ink-100 bg-ink-50 p-5 sm:p-6">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-500">
            <svg viewBox="0 0 16 16" className="mt-px h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M8 1.5 2.5 4v4c0 3.4 2.4 6.4 5.5 7.5 3.1-1.1 5.5-4.1 5.5-7.5V4L8 1.5Zm0 2.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm2 7.3H6v-1c0-.9.7-1.5 1.5-1.5h1c.8 0 1.5.6 1.5 1.5v1Z" />
            </svg>
            For privacy, Lifeline shows an approximate area rather than this donor's exact address. Contact details
            are shared only after the donor accepts a request.
          </p>

          {!isSelf && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => setRequestOpen(true)}>
                Request blood
              </Button>
              {!isAuthenticated && (
                <Button as="link" to="/login" variant="secondary">
                  Sign in
                </Button>
              )}
            </div>
          )}
        </div>
      </article>

      <RequestDonorModal donor={donor} open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="bg-white p-4 sm:p-5">
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink-800">{children}</dd>
    </div>
  );
}
