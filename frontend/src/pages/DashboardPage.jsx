import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge, { AvailabilityBadge, BloodGroupBadge } from '../components/ui/Badge';
import RequestCard from '../components/donor/RequestCard';
import { EmptyState, ErrorState, LoadingState } from '../components/feedback/States';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/endpoints';
import { formatDistance, relativeTime, formatDate } from '../utils/format';

/**
 * Dashboard. Deliberately action-oriented: what needs a response, what the
 * user should fix, and the shortest path to the next useful action. No vanity
 * metrics.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const resource = useAsyncResource(({ signal }) => dashboardApi.get({ signal }), []);
  const data = resource.data;

  if (resource.loading) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <LoadingState label="Loading your dashboard…" />
      </div>
    );
  }

  if (resource.error) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <ErrorState message={resource.error.message} onRetry={resource.reload} />
      </div>
    );
  }

  if (!data) return null;

  const donor = data.donor;
  const profileIssues = donor ? profileGaps(donor) : [];

  return (
    <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Hello, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            {donor
              ? 'Your donor status, nearby requests and the people who need your blood group.'
              : 'Your blood requests and the donors who can help.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button as="link" to="/requests/new" variant="primary" size="sm">
            Create a request
          </Button>
          {donor && (
            <Button as="link" to="/profile" variant="secondary" size="sm">
              Edit profile
            </Button>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {/* ---- Donor: nearby matching requests (the main call to action) ---- */}
          {donor && (
            <section className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">Requests matching your blood group nearby</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    Open requests within 50 km that a {donor.bloodGroup} donor can help with.
                  </p>
                </div>
                <Button as="link" to="/requests" variant="secondary" size="sm">
                  See all requests
                </Button>
              </div>

              <div className="mt-4">
                {data.nearbyRequests?.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.nearbyRequests.map((request) => (
                      <RequestCard key={request.id} request={request} distanceKm={request.distanceKm} compact />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    className="!py-8"
                    title="No matching requests right now"
                    message="Nothing near you currently needs your blood group. We will show it here as soon as something comes up."
                    actions={
                      <Button as="link" to="/requests" variant="secondary" size="sm">
                        Browse all requests
                      </Button>
                    }
                  />
                )}
              </div>
            </section>
          )}

          {/* ---- Matching donors for the user's own open request ---- */}
          {data.requestMatches?.donors?.length > 0 && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink-900">Donors who can help with your request</h2>
              <p className="mt-1 text-xs text-ink-500">
                Compatible donors within {data.requestMatches.radiusKm} km of your open request.
              </p>
              <ul className="mt-4 divide-y divide-ink-100">
                {data.requestMatches.donors.map((match) => (
                  <li key={match.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <BloodGroupBadge group={match.bloodGroup} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{match.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {match.areaLabel || match.city} · {formatDistance(match.distanceKm)} away
                        {match.exactMatch && <span className="ml-1 text-emerald-700">· exact match</span>}
                      </p>
                    </div>
                    <Button as="link" to={`/donors/${match.id}`} variant="secondary" size="sm">
                      View
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <Button as="link" to={`/requests/${data.requestMatches.requestId}`} variant="secondary" size="sm">
                  Open the request
                </Button>
              </div>
            </section>
          )}

          {/* ---- My requests ---- */}
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">Your blood requests</h2>
                {data.myRequestSummary && (
                  <p className="mt-1 text-xs text-ink-500">
                    {data.myRequestSummary.open} open · {data.myRequestSummary.accepted} accepted ·{' '}
                    {data.myRequestSummary.total} total
                  </p>
                )}
              </div>
              <Button as="link" to="/requests?scope=mine" variant="secondary" size="sm">
                Manage
              </Button>
            </div>

            <div className="mt-4">
              {data.myRequests?.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.myRequests.map((request) => (
                    <RequestCard key={request.id} request={request} compact />
                  ))}
                </div>
              ) : (
                <EmptyState
                  className="!py-8"
                  title="You have not raised a request"
                  message="If you or someone you know needs blood, create a request and we will surface compatible donors nearby."
                  actions={
                    <Button as="link" to="/requests/new" variant="primary" size="sm">
                      Create a request
                    </Button>
                  }
                />
              )}
            </div>
          </section>

          {/* ---- Responded ---- */}
          {data.respondedRequests?.length > 0 && (
            <section className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-900">Requests you responded to</h2>
                <Button as="link" to="/requests?scope=responded" variant="secondary" size="sm">
                  See all
                </Button>
              </div>
              <ul className="mt-4 divide-y divide-ink-100">
                {data.respondedRequests.map((request) => (
                  <li key={request.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <BloodGroupBadge group={request.bloodGroup} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/requests/${request.id}`} className="block truncate text-sm font-medium text-ink-800 hover:text-brand-700">
                        {request.hospitalName}, {request.city}
                      </Link>
                      <p className="truncate text-xs text-ink-500">
                        Needed {relativeTime(request.requiredAt)}
                        {request.myResponse?.respondedAt && ` · you responded ${relativeTime(request.myResponse.respondedAt)}`}
                      </p>
                    </div>
                    <Badge tone={request.myResponse?.status === 'accepted' ? 'success' : 'neutral'}>
                      {request.myResponse?.status === 'accepted' ? 'Accepted' : 'Declined'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ---- Sidebar: status + actions ---- */}
        <aside className="space-y-6">
          {donor ? (
            <>
              <section className="card p-5">
                <h2 className="text-sm font-semibold text-ink-900">Your donor status</h2>
                <div className="mt-3 flex items-center gap-3">
                  <BloodGroupBadge group={donor.bloodGroup} size="lg" />
                  <div>
                    <AvailabilityBadge available={donor.available} availableAgainOn={donor.availableAgainOn} />
                    <p className="mt-1.5 text-xs text-ink-500">
                      {donor.available
                        ? 'You appear in searches for available donors.'
                        : 'You are hidden from "available now" searches.'}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 space-y-2.5 border-t border-ink-100 pt-4 text-sm">
                  <Row label="Last donation">
                    {donor.lastDonationDate ? formatDate(donor.lastDonationDate) : 'Never donated'}
                  </Row>
                  <Row label="Total donations">{donor.totalDonations || '—'}</Row>
                  <Row label="Location">{donor.city ? `${donor.city}, ${donor.country}` : 'Not set'}</Row>
                  <Row label="Contact preference">{donor.preferredContactMethod.replace('_', ' ')}</Row>
                </dl>

                {donor.eligibility?.eligible === false && donor.eligibility.reason && (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    {donor.eligibility.reason}
                  </p>
                )}

                <Button as="link" to="/profile" variant="secondary" size="sm" fullWidth className="mt-4">
                  Manage availability
                </Button>
              </section>

              <section className="card p-5">
                <h2 className="text-sm font-semibold text-ink-900">Profile completeness</h2>
                {profileIssues.length === 0 ? (
                  <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-emerald-800">
                    <svg viewBox="0 0 16 16" className="mt-px h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" aria-hidden="true">
                      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm3 4.8-4 4a.6.6 0 0 1-.9 0L4.5 8.6l.9-.9 1.2 1.2 3.5-3.5.9.9Z" />
                    </svg>
                    Your profile is complete. People can find you by group, area and availability.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-ink-500">
                      Adding these makes it easier for people to reach you at the right time.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {profileIssues.map((issue) => (
                        <li key={issue} className="flex items-start gap-2 text-xs text-ink-600">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                    <Button as="link" to="/profile" variant="primary" size="sm" fullWidth className="mt-3">
                      Complete profile
                    </Button>
                  </>
                )}
              </section>
            </>
          ) : (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink-900">Become a donor</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                You are using Lifeline to find donors. If you are able to give blood, registering takes a minute and
                lets people nearby find you.
              </p>
              <Button as="link" to="/register" variant="primary" size="sm" fullWidth className="mt-3">
                Register as a donor
              </Button>
              <p className="mt-2 text-2xs text-ink-400">
                You will need to sign out and create a donor account, or contact support to convert this account.
              </p>
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900">Quick actions</h2>
            <div className="mt-3 space-y-2">
              <Button as="link" to="/search" variant="secondary" size="sm" fullWidth>
                Find donors nearby
              </Button>
              <Button as="link" to="/requests" variant="secondary" size="sm" fullWidth>
                Browse blood requests
              </Button>
              <Button as="link" to="/compatibility" variant="secondary" size="sm" fullWidth>
                Blood group compatibility
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="truncate text-xs font-medium capitalize text-ink-700">{children}</dd>
    </div>
  );
}

/** Which optional-but-useful fields are still missing. */
function profileGaps(donor) {
  const gaps = [];
  if (!donor.bio) gaps.push('Add a short note so people know when you are reachable.');
  if (!donor.areaLabel) gaps.push('Add your area or a nearby landmark.');
  if (!donor.lastDonationDate && !donor.isFirstTimeDonor) gaps.push('Add your last donation date.');
  if (donor.available && donor.preferredContactMethod === 'in_app') {
    gaps.push('Set a contact preference so donors and requesters know how to reach you.');
  }
  return gaps;
}
