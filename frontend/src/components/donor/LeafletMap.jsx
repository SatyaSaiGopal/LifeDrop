import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * The Leaflet implementation, split out so the library is only fetched when a
 * map is on screen. Uses raster tiles from OpenStreetMap — no API key needed.
 */

/** A small circular div icon: avoids Leaflet's broken default marker images. */
function donorIcon({ bloodGroup, available, selected }) {
  const negative = bloodGroup?.endsWith('-');
  const bg = selected ? '#a51616' : available ? (negative ? '#fff1f1' : '#e63b3b') : '#94a0ae';
  const fg = available && !negative && !selected ? '#ffffff' : selected ? '#ffffff' : '#881717';
  const size = selected ? 34 : 28;

  return L.divIcon({
    className: 'lifeline-marker',
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${bg};color:${fg};
      font-weight:700;font-size:${selected ? 11 : 10}px;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(16,24,40,.35);
      letter-spacing:-.02em;
    ">${bloodGroup ?? ''}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const centerIcon = L.divIcon({
  className: 'lifeline-center',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:#0f766e;border:3px solid #fff;box-shadow:0 1px 5px rgba(16,24,40,.4)"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/** Imperatively pan the map when the selected donor changes. */
function MapFocus({ points, selectedId }) {
  const map = useMap();
  const lastId = useRef(null);

  useEffect(() => {
    if (!selectedId || selectedId === lastId.current) return;
    const point = points.find((p) => p.id === selectedId);
    if (point) {
      map.panTo(point.position, { animate: true, duration: 0.4 });
      lastId.current = selectedId;
    }
  }, [selectedId, points, map]);

  return null;
}

/** Keep the viewport in sync when the search centre changes. */
function Recenter({ center }) {
  const map = useMap();
  const key = `${center[0]},${center[1]}`;
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export default function LeafletMap({ center, points, selectedId, onSelectDonor, radiusKm, showRadius }) {
  const icons = useMemo(
    () =>
      points.reduce((acc, point) => {
        acc[point.id] = donorIcon({
          bloodGroup: point.bloodGroup,
          available: point.available,
          selected: point.id === selectedId,
        });
        return acc;
      }, {}),
    [points, selectedId]
  );

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full rounded-xl border border-ink-200"
      // Attribution is required by the tile provider's terms.
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <Recenter center={center} />
      <MapFocus points={points} selectedId={selectedId} />

      {showRadius && radiusKm ? (
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#0f766e', weight: 1.5, fillColor: '#0f766e', fillOpacity: 0.05 }}
        />
      ) : null}

      <Marker position={center} icon={centerIcon}>
        <Popup>
          <span className="text-xs font-semibold">Search centre</span>
        </Popup>
      </Marker>

      {points.map((point) => (
        <Marker
          key={point.id}
          position={point.position}
          icon={icons[point.id]}
          eventHandlers={{ click: () => onSelectDonor?.(point.id) }}
          keyboard
          title={`${point.name}, ${point.bloodGroup}`}
        >
          <Popup>
            <div className="min-w-[9rem]">
              <p className="text-sm font-semibold text-ink-900">{point.name}</p>
              <p className="mt-0.5 text-xs text-ink-600">
                {point.bloodGroup} · {point.distanceKm != null ? `${point.distanceKm} km away` : 'distance unknown'}
              </p>
              <p className="mt-1 text-2xs text-ink-400">Approximate location for privacy</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
