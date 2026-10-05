import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { BloodGroupBadge } from '../components/ui/Badge';
import RequestCard from '../components/donor/RequestCard';
import { EmptyState, ErrorState, RequestCardSkeleton } from '../components/feedback/States';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../context/AuthContext';
import { requestApi } from '../services/endpoints';
import { BLOOD_GROUPS, URGENCY_OPTIONS, cx } from '../utils/format';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open requests' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: '', label: 'All statuses' },
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All requests' },
  { value: 'mine', label: 'My requests' },
  { value: 'responded', label: 'I responded to' },
];

/** Blood request feed with real filters, scopes and distance sorting. */
export default function RequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isDonor } = useAuth();
  const geo = useGeolocation();

  const filters = useMemo(
    () => ({
      scope: searchParams.get('scope') || 'all',
      status: searchParams.get('status') ?? 'open',
      bloodGroup: searchParams.get('bloodGroup') || '',
      urgency: searchParams.get('urgency') || '',
      q: searchParams.get('q') || '',
      radius: Number(searchParams.get('radius')) || 50,
      near: searchParams.get('near') === 'true',
      lat: searchParams.get('lat') ? Number(searchParams.get('lat')) : null,
      lng: searchParams.get('lng') ? Number(searchParams.get('lng')) : null,
    }),
    [searchParams]
  );

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [searchText, setSearchText] = useState(filters.q);
  const debouncedSearchText = useDebouncedValue(searchText, 400);

  const updateParams = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
      });
      if (resetPage) next.delete('page');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const handleSearchText = (value) => {
    setSearchText(value);
    updateParams({ q: value });
  };

  const useMyLocation = async () => {
    try {
      const coords = await geo.request();
      updateParams({ lat: coords.latitude, lng: coords.longitude, near: 'true' });
    } catch {
      /* surfaced by the inline error below */
    }
  };

  const resource = useAsyncResource(
    ({ signal }) =>
      requestApi.list(
        {
          scope: filters.scope,
          status: filters.status || undefined,
          bloodGroup: filters.bloodGroup || undefined,
          urgency: filters.urgency || undefined,
          q: filters.q || undefined,
          lat: filters.near && filters.lat ? filters.lat : undefined,
          lng: filters.near && filters.lng ? filters.lng : undefined,
          radius: filters.near ? filters.radius : undefined,
          page,
          limit: 9,
        },
        { signal }
      ),
    [filters.scope, filters.status, filters.bloodGroup, filters.urgency, filters.q, filters.near, filters.lat, filters.lng, filters.radius, page]
  );

  const requests = resource.data || [];
  const meta = resource.meta;

  const needsAuth = (filters.scope === 'mine' || filters.scope === 'responded') && !isAuthenticated;

  const clearFilters = () => {
    setSearchText('');
    updateParams({ bloodGroup: '', urgency: '', q: '', near: '', lat: '', lng: '', status: 'open', radius: '' });
  };

  const activeFilterCount = (filters.bloodGroup ? 1 : 0) + (filters.urgency ? 1 : 0) + (filters.q ? 1 : 0) + (filters.near ? 1 : 0);

  return (
    <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Blood requests</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            Requests raised by people nearby. If a request matches your blood group, you can accept and coordinate
            directly.
          </p>
        </div>
        <Button as="link" to="/requests/new" variant="primary" className="shrink-0">
          Create a request
        </Button>
      </header>

      {/* Scope tabs — a real filter, not decoration */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-lg border border-ink-200 bg-white p-1" role="tablist" aria-label="Request scope">
        {SCOPE_OPTIONS.map((option) => {
          const disabled = !isAuthenticated && option.value !== 'all';
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filters.scope === option.value}
              disabled={disabled}
              onClick={() => updateParams({ scope: option.value === 'all' ? '' : option.value })}
              className={cx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filters.scope === option.value ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100',
                disabled && 'cursor-not-allowed opacity-40'
              )}
              title={disabled ? 'Sign in to use this view' : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Filters */}
        <aside className="space-y-5">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">Filter</h2>
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearFilters} className="text-xs font-medium text-brand-700 hover:underline">
                  Reset
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <Input
                label="Search"
                placeholder="Hospital, city or patient"
                value={searchText}
                onChange={(event) => handleSearchText(event.target.value)}
              />

              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={filters.status}
                onChange={(event) => updateParams({ status: event.target.value })}
              />

              <Select
                label="Urgency"
                placeholder="Any urgency"
                options={URGENCY_OPTIONS}
                value={filters.urgency}
                onChange={(event) => updateParams({ urgency: event.target.value })}
              />

              <div>
                <span className="field-label">Blood group</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {BLOOD_GROUPS.map((group) => {
                    const active = filters.bloodGroup === group;
                    return (
                      <button
                        key={group}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateParams({ bloodGroup: active ? '' : group })}
                        className={cx(
                          'flex items-center justify-center rounded-lg border p-1.5 transition-colors',
                          active ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'
                        )}
                      >
                        <BloodGroupBadge group={group} size="sm" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-ink-100 pt-4">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={filters.near}
                    onChange={(event) => {
                      if (event.target.checked) {
                        if (filters.lat && filters.lng) updateParams({ near: 'true' });
                        else useMyLocation();
                      } else {
                        updateParams({ near: '', lat: '', lng: '' });
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink-700">Near me only</span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      Uses your location to show requests within {filters.radius} km.
                    </span>
                  </span>
                </label>

                {filters.near && (
                  <div className="mt-3">
                    <Select
                      label="Radius"
                      options={[
                        { value: 10, label: '10 km' },
                        { value: 25, label: '25 km' },
                        { value: 50, label: '50 km' },
                        { value: 100, label: '100 km' },
                      ]}
                      value={filters.radius}
                      onChange={(event) => updateParams({ radius: event.target.value })}
                    />
                  </div>
                )}

                {geo.status === 'loading' && <p className="field-hint">Getting your location…</p>}
                {geo.error && <p className="field-hint text-amber-700">{geo.error}</p>}
              </div>
            </div>
          </div>

          {isDonor && (
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-ink-900">Tip</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                Turn on "Near me only" to see requests closest to you first. Requests matching your blood group are
                highlighted in your dashboard.
              </p>
              <Button as="link" to="/dashboard" variant="secondary" size="sm" className="mt-3" fullWidth>
                Go to dashboard
              </Button>
            </div>
          )}
        </aside>

        {/* Results */}
        <section aria-labelledby="request-results-heading">
          <h2 id="request-results-heading" className="sr-only">
            Request results
          </h2>

          {needsAuth && (
            <EmptyState
              title="Sign in to see this view"
              message="Your own requests and the requests you responded to are tied to your account."
              actions={
                <Button as="link" to="/login" variant="primary" size="sm">
                  Sign in
                </Button>
              }
            />
          )}

          {!needsAuth && resource.loading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <RequestCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!needsAuth && !resource.loading && resource.error && (
            <ErrorState message={resource.error.message} onRetry={resource.reload} />
          )}

          {!needsAuth && !resource.loading && !resource.error && requests.length === 0 && (
            <EmptyState
              title={emptyTitle(filters)}
              message={emptyMessage(filters)}
              actions={
                <>
                  {filters.status !== '' && (
                    <Button variant="secondary" size="sm" onClick={() => updateParams({ status: '' })}>
                      Show all statuses
                    </Button>
                  )}
                  {activeFilterCount > 0 && (
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                  <Button as="link" to="/requests/new" variant="primary" size="sm">
                    Create a request
                  </Button>
                </>
              }
            />
          )}

          {!needsAuth && !resource.loading && !resource.error && requests.length > 0 && (
            <>
              <p className="mb-3 text-xs text-ink-500">
                {meta?.total ?? requests.length} request{(meta?.total ?? requests.length) === 1 ? '' : 's'}
                {filters.near ? ' near you' : ''}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {requests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>

              {meta && meta.totalPages > 1 && (
                <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Request pages">
                  <Button variant="secondary" size="sm" disabled={!meta.hasPrev} onClick={() => updateParams({ page: page - 1 }, { resetPage: false })}>
                    Previous
                  </Button>
                  <p className="text-xs text-ink-500">
                    Page {meta.page} of {meta.totalPages}
                  </p>
                  <Button variant="secondary" size="sm" disabled={!meta.hasNext} onClick={() => updateParams({ page: page + 1 }, { resetPage: false })}>
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function emptyTitle(filters) {
  if (filters.scope === 'mine') return 'You have no blood requests';
  if (filters.scope === 'responded') return 'You have not responded to any requests yet';
  if (filters.status === 'open') return 'No open blood requests right now';
  return 'No requests match these filters';
}

function emptyMessage(filters) {
  if (filters.scope === 'mine') return 'When you raise a request it appears here, with the donors who respond.';
  if (filters.scope === 'responded') return 'Requests you accept or decline will be listed here.';
  if (filters.status === 'open') return 'Nothing is outstanding at the moment. You can still create a request if you need blood.';
  return 'Try widening your filters, or clear them to see every request.';
}
