import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge, { BloodGroupBadge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/Modal';
import { ErrorState, LoadingState } from '../components/feedback/States';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { requestApi } from '../services/endpoints';
import {
  formatDateTime,
  relativeTime,
  statusTone,
  urgencyTone,
} from '../utils/format';

/**
 * Blood request detail.
 *
 * This is where the request lifecycle actually happens: a donor accepts or
 * declines, the requester cancels or marks it fulfilled, and contact details
 * are revealed once a donor has accepted.
 */
export default function RequestDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated, isDonor } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const resource = useAsyncResource(({ signal }) => requestApi.get(id, { signal }), [id]);
  const request = resource.data?.request;
  const canViewContact = resource.data?.canViewContact;

  const [responding, setResponding] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'cancel' | 'fulfill'
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const isOwner = request?.isOwner;
  const myResponse = request?.myResponse;

  if (resource.loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <LoadingState label="Loading request…" />
      </div>
    );
  }

  if (resource.error) {
    const notFound = resource.error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState
          title={notFound ? 'Request not found' : 'We could not load this request'}
          message={notFound ? 'This request may have been removed or the link is incorrect.' : resource.error.message}
          onRetry={notFound ? undefined : resource.reload}
        />
        <div className="mt-4 text-center">
          <Button as="link" to="/requests" variant="secondary">
            Back to requests
          </Button>
        </div>
      </div>
    );
  }

  if (!request) return null;

  const status = statusTone(request.status);
  const isOpen = request.status === 'pending' || request.status === 'accepted';

  const respond = async (action) => {
    setResponding(true);
    try {
      const data = await requestApi.respond(id, action, null);
      toast.success(action === 'accept' ? 'You accepted this request.' : 'You declined this request.');
      resource.reload();
      // The refreshed payload will include contact details for accepted donors.
      void data;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResponding(false);
    }
  };

  const runConfirm = async () => {
    setConfirmLoading(true);
    try {
      if (confirm === 'cancel') {
        await requestApi.cancel(id);
        toast.success('Request cancelled.');
      } else {
        await requestApi.fulfill(id);
        toast.success('Request marked as fulfilled.');
      }
      setConfirm(null);
      resource.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const loadMatches = async (radius = 50) => {
    setMatchesLoading(true);
    try {
      const rows = await requestApi.matches(id, { radius });
      setMatches(rows);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMatchesLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="mb-4 text-sm" aria-label="Breadcrumb">
        <Link to="/requests" className="text-ink-500 hover:text-brand-700">
          ← Back to requests
        </Link>
      </nav>

      <article className="card overflow-hidden">
        {/* Header */}
        <div className="border-b border-ink-100 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <BloodGroupBadge group={request.bloodGroup} />
                <h1 className="text-xl font-bold tracking-tight text-ink-900">
                  {request.unitsRequired} unit{request.unitsRequired === 1 ? '' : 's'} needed
                </h1>
                <span className={`badge ${status.className}`}>{status.label}</span>
              </div>

              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-600">
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-ink-400" fill="currentColor" aria-hidden="true">
                  <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.25a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
                </svg>
                <span>
                  {request.hospitalName}
                  {request.locationNote && ` · ${request.locationNote}`}
                  {request.city && `, ${request.city}`}
                </span>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge className={urgencyTone(request.urgency)}>
                  {request.urgency === 'critical'
                    ? 'Critical'
                    : request.urgency === 'high'
                      ? 'High priority'
                      : request.urgency === 'low'
                        ? 'Low priority'
                        : 'Normal priority'}
                </Badge>
                <Badge tone="neutral">Needed {relativeTime(request.requiredAt)}</Badge>
                {request.acceptedCount > 0 && (
                  <Badge tone="success">
                    {request.acceptedCount} donor{request.acceptedCount === 1 ? '' : 's'} accepted
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {request.message && (
            <p className="mt-4 whitespace-pre-line rounded-lg border border-ink-200 bg-ink-50 p-3.5 text-sm leading-relaxed text-ink-700">
              {request.message}
            </p>
          )}
        </div>

        {/* Facts */}
        <dl className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-4">
          <Fact label="Required by">{formatDateTime(request.requiredAt)}</Fact>
          <Fact label="Patient">{request.patientName}</Fact>
          <Fact label="Units">{request.unitsRequired}</Fact>
          <Fact label="Posted">{relativeTime(request.createdAt)}</Fact>
        </dl>

        {/* Contact — revealed only when permitted */}
        {canViewContact && request.contactPhone && (
          <div className="border-t border-ink-100 p-5 sm:p-6">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="text-sm font-semibold text-emerald-900">Contact details</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                {isOwner
                  ? 'Donors who accept can see the number below.'
                  : 'You accepted this request, so the requester\u2019s contact details are now available.'}
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-emerald-900">{request.contactPhone}</p>
            </div>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="border-t border-ink-100 bg-ink-50 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-ink-900">Manage this request</h2>
            <p className="mt-1 text-xs text-ink-500">
              {request.status === 'fulfilled'
                ? 'This request is closed as fulfilled.'
                : request.status === 'cancelled'
                  ? 'This request has been cancelled.'
                  : 'Mark it fulfilled once the need is met, or cancel it if it is no longer required.'}
            </p>

            <div className="mt-3.5 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => loadMatches(50)}
                loading={matchesLoading}
                disabled={!isOpen}
              >
                Find matching donors
              </Button>
              {request.status !== 'fulfilled' && request.status !== 'cancelled' && (
                <>
                  <Button variant="success" onClick={() => setConfirm('fulfill')}>
                    Mark as fulfilled
                  </Button>
                  <Button variant="danger" onClick={() => setConfirm('cancel')}>
                    Cancel request
                  </Button>
                </>
              )}
            </div>

            {matches && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Compatible donors within 50 km
                </h3>
                {matches.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-ink-200 bg-white p-3 text-sm text-ink-600">
                    No compatible donors found within 50 km right now. Your request is still visible to donors.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200 bg-white">
                    {matches.map((match) => (
                      <li key={match.id} className="flex items-center gap-3 p-3">
                        <BloodGroupBadge group={match.bloodGroup} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-800">{match.name}</p>
                          <p className="truncate text-xs text-ink-500">
                            {match.areaLabel || match.city} · {match.distanceKm} km away
                            {match.exactMatch && <span className="ml-1 text-emerald-700">· exact match</span>}
                          </p>
                        </div>
                        <Button as="link" to={`/donors/${match.id}`} variant="secondary" size="sm">
                          View
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Donor actions */}
        {!isOwner && isAuthenticated && (
          <div className="border-t border-ink-100 p-5 sm:p-6">
            {!isDonor ? (
              <div className="rounded-lg border border-ink-200 bg-ink-50 p-3.5 text-sm text-ink-600">
                Only registered donors can respond to requests.{' '}
                <Link to="/register" className="link">
                  Register as a donor
                </Link>{' '}
                to help.
              </div>
            ) : !isOpen ? (
              <div className="rounded-lg border border-ink-200 bg-ink-50 p-3.5 text-sm text-ink-600">
                This request is {request.status} and no longer accepting responses.
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-ink-900">Can you help?</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Accepting shares your preferred contact method with the requester so you can coordinate directly.
                  You can change your mind until the request is fulfilled.
                </p>

                <div className="mt-3.5 flex flex-wrap gap-2">
                  <Button
                    variant={myResponse?.status === 'accepted' ? 'success' : 'primary'}
                    onClick={() => respond('accept')}
                    loading={responding}
                    disabled={myResponse?.status === 'accepted'}
                  >
                    {myResponse?.status === 'accepted' ? 'You accepted this request' : 'Accept request'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => respond('decline')}
                    disabled={responding || myResponse?.status === 'declined'}
                  >
                    {myResponse?.status === 'declined' ? 'You declined' : 'Decline'}
                  </Button>
                </div>

                {myResponse && (
                  <p className="mt-3 text-xs text-ink-500">
                    Your response: <span className="font-medium text-ink-700">{myResponse.status}</span>
                    {myResponse.respondedAt && ` · ${relativeTime(myResponse.respondedAt)}`}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Signed-out */}
        {!isOwner && !isAuthenticated && isOpen && (
          <div className="border-t border-ink-100 bg-ink-50 p-5 sm:p-6">
            <p className="text-sm text-ink-600">
              <Link to="/login" className="link">
                Sign in
              </Link>{' '}
              as a registered donor to accept this request.
            </p>
          </div>
        )}
      </article>

      <p className="mt-6 rounded-lg border border-ink-200 bg-ink-50 p-3 text-xs leading-relaxed text-ink-500">
        Lifeline does not verify medical need or blood availability. Always confirm requirements with the hospital or
        blood bank. In an emergency, contact them directly.
      </p>

      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title="Cancel this blood request?"
        message="The request will be closed and no longer visible to donors. You cannot undo this."
        confirmLabel="Cancel request"
        cancelLabel="Keep it open"
        loading={confirmLoading}
      />
      <ConfirmDialog
        open={confirm === 'fulfill'}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title="Mark this request as fulfilled?"
        message="Use this once the need has been met. The request will be closed to further responses."
        confirmLabel="Mark fulfilled"
        cancelLabel="Not yet"
        variant="success"
        loading={confirmLoading}
      />
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-ink-800" title={typeof children === 'string' ? children : undefined}>
        {children}
      </dd>
    </div>
  );
}
