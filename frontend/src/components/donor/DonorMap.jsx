import { Suspense, lazy, useMemo } from 'react';
import Spinner from '../ui/Spinner';

// Leaflet is ~150 kB; keep it out of the main bundle and load it only when a
// map is actually rendered.
const LeafletMap = lazy(() => import('./LeafletMap'));

const MAP_ENABLED = import.meta.env.VITE_MAP_ENABLED !== 'false';

/**
 * Donor map. Renders approximate donor locations and the search centre.
 *
 * The map is an optional enhancement: when it is disabled by configuration or
 * fails to load, the surrounding page still works and we show a short note
 * rather than a broken embed.
 */
export default function DonorMap({
  center,
  donors = [],
  selectedId = null,
  onSelectDonor,
  radiusKm,
  height = '100%',
  className = '',
  showRadius = true,
}) {
  const points = useMemo(
    () =>
      donors
        .filter((d) => Array.isArray(d.approxLocation) && d.approxLocation.length === 2)
        .map((d) => ({
          id: d.id,
          name: d.name,
          bloodGroup: d.bloodGroup,
          distanceKm: d.distanceKm,
          // approxLocation is [lng, lat]; Leaflet wants [lat, lng].
          position: [d.approxLocation[1], d.approxLocation[0]],
          available: d.available,
        })),
    [donors]
  );

  if (!MAP_ENABLED) {
    return (
      <MapFallback
        height={height}
        className={className}
        message="The map is disabled in this environment. Donor results and distances are still shown in the list."
      />
    );
  }

  if (!center) {
    return (
      <MapFallback
        height={height}
        className={className}
        message="Set a search location to see donors on the map."
      />
    );
  }

  return (
    <div className={className} style={{ height }}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center rounded-xl border border-ink-200 bg-ink-100">
            <Spinner className="text-ink-400" />
          </div>
        }
      >
        <LeafletMap
          center={[center.latitude, center.longitude]}
          points={points}
          selectedId={selectedId}
          onSelectDonor={onSelectDonor}
          radiusKm={radiusKm}
          showRadius={showRadius}
        />
      </Suspense>
    </div>
  );
}

function MapFallback({ height, className, message }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50 p-6 text-center ${className}`}
      style={{ height }}
    >
      <p className="max-w-xs text-sm text-ink-500">{message}</p>
    </div>
  );
}
