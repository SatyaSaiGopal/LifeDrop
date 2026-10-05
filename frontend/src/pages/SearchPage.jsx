import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { BloodGroupBadge } from '../components/ui/Badge';
import DonorCard from '../components/donor/DonorCard';
import DonorMap from '../components/donor/DonorMap';
import SearchFilters from '../components/donor/SearchFilters';
import { EmptyState, ErrorState, DonorListSkeleton } from '../components/feedback/States';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useGeolocation } from '../hooks/useGeolocation';
import { donorApi } from '../services/endpoints';
import { reverseGeocode } from '../services/geocoding';
import { cx } from '../utils/format';
import RequestDonorModal from '../components/donor/RequestDonorModal';

const DEFAULT_FILTERS = {
  bloodGroup: '',
  radius: 25,
  available: 'all',
  sort: 'distance',
  q: '',
};

/**
 * Donor search. The URL is the source of truth for filters and the search
 * centre, so a search is shareable and the browser back button behaves.
 */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const geo = useGeolocation();

  // --- Read state from the URL ---
  const center = useMemo(() => {
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    if (Number.isFinite(lat) && Number.isFinite(lng) && searchParams.has('lat')) {
      return { latitude: lat, longitude: lng };
    }
    return null;
  }, [searchParams]);

  const filters = useMemo(
    () => ({
      bloodGroup: searchParams.get('bloodGroup') || DEFAULT_FILTERS.bloodGroup,
      radius: Number(searchParams.get('radius')) || DEFAULT_FILTERS.radius,
      available: searchParams.get('available') || DEFAULT_FILTERS.available,
      sort: searchParams.get('sort') || DEFAULT_FILTERS.sort,
      q: searchParams.get('q') || DEFAULT_FILTERS.q,
    }),
    [searchParams]
  );

  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [locationLabel, setLocationLabel] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // list | map
  const [showFilters, setShowFilters] = useState(false);
  const [requestTarget, setRequestTarget] = useState(null);
  const [searchText, setSearchText] = useState(filters.q);
  const debouncedSearchText = useDebouncedValue(searchText, 400);

  // Keep the text box in sync when the URL changes from elsewhere.
  useEffect(() => {
    setSearchText(filters.q);
  }, [filters.q]);

  /** Merge patch into the URL, resetting pagination on any filter change. */
  const updateParams = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
      });
      if (resetPage) next.delete('page');
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  // Push the debounced text search into the URL.
  useEffect(() => {
    if (debouncedSearchText === filters.q) return;
    updateParams({ q: debouncedSearchText || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchText]);

  // Resolve a readable label for the current centre (best-effort).
  useEffect(() => {
    if (!center) {
      setLocationLabel(null);
      return undefined;
    }
    let active = true;
    reverseGeocode(center.latitude, center.longitude)
      .then((resolved) => {
        if (!active) return;
        const label = [resolved.city, resolved.state, resolved.country].filter(Boolean).join(', ');
        setLocationLabel(label || `${center.latitude.toFixed(3)}, ${center.longitude.toFixed(3)}`);
      })
      .catch(() => {
        if (active) setLocationLabel(`${center.latitude.toFixed(3)}, ${center.longitude.toFixed(3)}`);
      });
    return () => {
      active = false;
    };
  }, [center]);

  // --- The query itself ---
  const enabled = Boolean(center);
  const results = useAsyncResource(
    ({ signal }) =>
      donorApi.nearby(
        {
          lat: center.latitude,
          lng: center.longitude,
          radius: filters.radius,
          bloodGroup: filters.bloodGroup || undefined,
          available: filters.available,
          sort: filters.sort,
          q: filters.q || undefined,
          page,
          limit: 12,
        },
        { signal }
      ),
    [center?.latitude, center?.longitude, filters.radius, filters.bloodGroup, filters.available, filters.sort, filters.q, page],
    { enabled }
  );

  const donors = results.data || [];
  const meta = results.meta;

  const handleUseMyLocation = async () => {
    try {
      const coords = await geo.request();
      updateParams({ lat: coords.latitude, lng: coords.longitude });
    } catch {
      /* geo.error is rendered by SearchFilters */
    }
  };

  const clearLocation = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('lat');
    next.delete('lng');
    setSearchParams(next);
  };

  const activeFilterCount =
    (filters.bloodGroup ? 1 : 0) +
    (filters.available === 'true' ? 1 : 0) +
    (filters.radius !== DEFAULT_FILTERS.radius ? 1 : 0) +
    (filters.q ? 1 : 0);

  const resetFilters = () => {
    setSearchText('');
    updateParams({ bloodGroup: '', available: '', radius: DEFAULT_FILTERS.radius, sort: DEFAULT_FILTERS.sort, q: '' });
  };

  return (
    <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Find blood donors nearby</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            Search by blood group and distance. Distances are calculated from your chosen location.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFilters(true)}
            leftIcon={
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M1.5 3.5h13M3.5 8h9M6 12.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
            }
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>
      </header>

      {/* --- No location yet: the primary action is setting one --- */}
      {!center && (
        <section className="mt-8" aria-labelledby="set-location-heading">
          <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </div>
            <h2 id="set-location-heading" className="mt-4 text-lg font-semibold text-ink-900">
              Where should we search?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">
              Share your location to find the closest donors, or search by city below. We only use your coordinates to
              calculate distance — they are not stored on your behalf.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="primary"
                onClick={handleUseMyLocation}
                loading={geo.status === 'loading'}
              >
                Use my current location
              </Button>
            </div>

            {geo.error && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs leading-relaxed text-amber-900" role="alert">
                {geo.error}
              </p>
            )}

            <div className="mt-6 border-t border-ink-100 pt-6 text-left">
              <CitySearch onPick={(city) => updateParams({ lat: city.latitude, lng: city.longitude })} />
            </div>
          </div>
        </section>
      )}

      {/* --- Results --- */}
      {center && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          {/* Filters: sidebar on desktop, sheet on mobile */}
          <aside className="hidden lg:block">
            <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-900">Filters</h2>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={resetFilters} className="text-xs font-medium text-brand-700 hover:underline">
                    Reset
                  </button>
                )}
              </div>
              <SearchFilters
                filters={filters}
                onChange={(next) => updateParams(next)}
                onUseMyLocation={handleUseMyLocation}
                locationStatus={geo.status}
                locationLabel={locationLabel}
              />
            </div>
          </aside>

          {/* Results column */}
          <section aria-labelledby="results-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 id="results-heading" className="text-sm font-semibold text-ink-900">
                  {results.loading
                    ? 'Searching…'
                    : meta
                      ? `${meta.total} donor${meta.total === 1 ? '' : 's'} found`
                      : 'Donors'}
                </h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                  {locationLabel && <span className="truncate">near {locationLabel}</span>}
                  <span>·</span>
                  <span>within {filters.radius} km</span>
                  {filters.bloodGroup && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        group <BloodGroupBadge group={filters.bloodGroup} size="sm" />
                      </span>
                    </>
                  )}
                  <button type="button" onClick={clearLocation} className="font-medium text-brand-700 hover:underline">
                    Change location
                  </button>
                </p>
              </div>

              {/* Mobile: list/map toggle — a real view switch, not decoration */}
              <div className="flex rounded-lg border border-ink-200 p-0.5 lg:hidden" role="tablist" aria-label="View">
                <ToggleButton active={mobileView === 'list'} onClick={() => setMobileView('list')}>
                  List
                </ToggleButton>
                <ToggleButton active={mobileView === 'map'} onClick={() => setMobileView('map')}>
                  Map
                </ToggleButton>
              </div>
            </div>

            {/* Map on mobile */}
            {mobileView === 'map' && (
              <div className="mt-4 h-[60vh] lg:hidden">
                <DonorMap
                  center={center}
                  donors={donors}
                  selectedId={selectedId}
                  onSelectDonor={setSelectedId}
                  radiusKm={filters.radius}
                  height="100%"
                />
              </div>
            )}

            <div className={cx('mt-4', mobileView === 'map' && 'hidden lg:block')}>
              {results.loading && <DonorListSkeleton count={6} />}

              {!results.loading && results.error && (
                <ErrorState
                  title="We could not run that search"
                  message={results.error.message}
                  onRetry={results.reload}
                />
              )}

              {!results.loading && !results.error && donors.length === 0 && (
                <EmptyState
                  title={emptyTitle(filters)}
                  message={emptyMessage(filters)}
                  actions={
                    <>
                      {filters.radius < 50 && (
                        <Button variant="primary" size="sm" onClick={() => updateParams({ radius: nextRadius(filters.radius) })}>
                          Increase radius to {nextRadius(filters.radius)} km
                        </Button>
                      )}
                      {filters.bloodGroup && (
                        <Button variant="secondary" size="sm" onClick={() => updateParams({ bloodGroup: '' })}>
                          Search all blood groups
                        </Button>
                      )}
                      {filters.available === 'true' && (
                        <Button variant="secondary" size="sm" onClick={() => updateParams({ available: 'all' })}>
                          Include unavailable donors
                        </Button>
                      )}
                    </>
                  }
                />
              )}

              {!results.loading && !results.error && donors.length > 0 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {donors.map((donor) => (
                      <DonorCard
                        key={donor.id}
                        donor={donor}
                        selected={selectedId === donor.id}
                        onSelect={(d) => setSelectedId((prev) => (prev === d.id ? null : d.id))}
                        onRequest={setRequestTarget}
                      />
                    ))}
                  </div>

                  {meta && meta.totalPages > 1 && (
                    <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Search results pages">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!meta.hasPrev}
                        onClick={() => updateParams({ page: page - 1 }, { resetPage: false })}
                      >
                        Previous
                      </Button>
                      <p className="text-xs text-ink-500">
                        Page {meta.page} of {meta.totalPages}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!meta.hasNext}
                        onClick={() => updateParams({ page: page + 1 }, { resetPage: false })}
                      >
                        Next
                      </Button>
                    </nav>
                  )}

                  <p className="mt-6 rounded-lg border border-ink-200 bg-ink-50 p-3 text-xs leading-relaxed text-ink-500">
                    Donor locations are approximate. Contact details are shared only after a donor accepts your
                    request. Always confirm eligibility and compatibility with the hospital or blood bank.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Map on desktop */}
          <aside className="hidden xl:block">
            <div className="sticky top-20 h-[calc(100vh-6rem)]">
              <DonorMap
                center={center}
                donors={donors}
                selectedId={selectedId}
                onSelectDonor={setSelectedId}
                radiusKm={filters.radius}
                height="100%"
              />
            </div>
          </aside>
        </div>
      )}

      {/* Mobile filter sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setShowFilters(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Filters</h2>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
                aria-label="Close filters"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <SearchFilters
              filters={filters}
              onChange={(next) => updateParams(next)}
              onUseMyLocation={handleUseMyLocation}
              locationStatus={geo.status}
              locationLabel={locationLabel}
            />
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={resetFilters}>
                Reset
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setShowFilters(false)}>
                Show {meta?.total ?? ''} results
              </Button>
            </div>
          </div>
        </div>
      )}

      <RequestDonorModal
        donor={requestTarget}
        open={Boolean(requestTarget)}
        onClose={() => setRequestTarget(null)}
      />
    </div>
  );
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
        active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'
      )}
    >
      {children}
    </button>
  );
}

/** Inline city search used before a location is set. */
function CitySearch({ onPick }) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 400);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState([]);

  useEffect(() => {
    donorApi.cities().then(setFallback).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounced.trim().length < 3) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    import('../services/geocoding')
      .then(({ geocodePlace }) => geocodePlace(debounced, { signal: controller.signal }))
      .then((rows) => {
        setResults(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setResults([]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [debounced]);

  const shown = results.length > 0 ? results.map((r) => ({ key: r.label, label: r.shortLabel, lat: r.latitude, lng: r.longitude })) : [];

  return (
    <div>
      <Input
        label="Search by city"
        placeholder="e.g. Bengaluru, Pune, Mumbai"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rightAddon={loading ? <span className="text-xs text-ink-400">…</span> : null}
        autoComplete="off"
      />

      {shown.length > 0 && (
        <ul className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200">
          {shown.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onPick({ latitude: item.lat, longitude: item.lng })}
                className="block w-full px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {shown.length === 0 && query.trim().length < 3 && fallback.length > 0 && (
        <div className="mt-3">
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Cities with donors</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fallback.slice(0, 8).map((row) => (
              <button
                key={`${row.city}-${row.country}`}
                type="button"
                onClick={() => onPick({ latitude: row.latitude ?? 0, longitude: row.longitude ?? 0, city: row })}
                disabled={row.latitude === undefined}
                className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-ink-300 hover:bg-ink-50 disabled:opacity-50"
              >
                {row.city} · {row.donorCount}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function emptyTitle(filters) {
  if (filters.bloodGroup) {
    return `No ${filters.bloodGroup} donors found within ${filters.radius} km`;
  }
  if (filters.available === 'true') {
    return `No available donors found within ${filters.radius} km`;
  }
  return `No donors found within ${filters.radius} km`;
}

function emptyMessage(filters) {
  const parts = ['Try widening the search radius'];
  if (filters.bloodGroup) parts.push('searching all blood groups');
  if (filters.available === 'true') parts.push('including donors who are temporarily unavailable');
  return `${parts.join(', or ')}. You can also raise a blood request so matching donors can come to you.`;
}

function nextRadius(current) {
  const steps = [5, 10, 25, 50];
  return steps.find((r) => r > current) || 50;
}
