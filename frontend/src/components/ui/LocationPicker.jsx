import { useEffect, useRef, useState } from 'react';
import Button from './Button';
import Input from './Input';
import Spinner from './Spinner';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useGeolocation } from '../../hooks/useGeolocation';
import { geocodePlace, reverseGeocode } from '../../services/geocoding';
import { donorApi } from '../../services/endpoints';
import { cx } from '../../utils/format';

/**
 * Location picker used by donor registration, profile editing and blood
 * requests. It resolves a coordinate pair plus the city/state/country fields
 * the API needs, and always offers a manual fallback so a denied location
 * permission never blocks the form.
 */
export default function LocationPicker({
  value,
  onChange,
  error,
  label = 'Location',
  hint,
  required = false,
  cityRequired = true,
}) {
  const geo = useGeolocation();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 450);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Donor cities come from the API — a reliable fallback when geocoding is
  // unavailable, and a much better experience than a blank text box.
  useEffect(() => {
    let active = true;
    donorApi
      .cities()
      .then((rows) => {
        if (active) setCityOptions(rows);
      })
      .catch(() => {
        /* non-critical: manual entry still works */
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounced place search against OpenStreetMap.
  useEffect(() => {
    if (debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      setSearchError(null);
      return undefined;
    }
    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);

    geocodePlace(debouncedQuery, { signal: controller.signal })
      .then((rows) => {
        setSuggestions(rows);
        setSearching(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setSuggestions([]);
        setSearching(false);
        setSearchError('Place lookup is unavailable — you can still pick a city from the list below.');
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    const onClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /** Reverse-geocode a coordinate pair into city/state/country where possible. */
  const applyCoordinates = async (latitude, longitude, { areaLabel } = {}) => {
    setResolving(true);
    let details = { city: value.city || '', state: value.state || '', country: value.country || '' };
    try {
      const resolved = await reverseGeocode(latitude, longitude);
      details = {
        city: resolved.city || details.city,
        state: resolved.state || details.state,
        country: resolved.country || details.country,
      };
      if (!areaLabel && resolved.areaLabel) areaLabel = resolved.areaLabel;
    } catch {
      // Reverse geocoding is best-effort; the user can complete the fields.
    }
    setResolving(false);
    onChange({ ...value, latitude, longitude, ...details, areaLabel: areaLabel ?? value.areaLabel ?? '' });
  };

  const handleUseMyLocation = async () => {
    try {
      const coords = await geo.request();
      await applyCoordinates(coords.latitude, coords.longitude);
    } catch {
      /* the hook already exposes a human-readable error via geo.error */
    }
  };

  const pickSuggestion = async (suggestion) => {
    setQuery(suggestion.shortLabel);
    setOpen(false);
    await applyCoordinates(suggestion.latitude, suggestion.longitude, { areaLabel: suggestion.shortLabel });
  };

  const pickKnownCity = async (row) => {
    setQuery(`${row.city}, ${row.country}`);
    setOpen(false);
    // Reuse a representative donor coordinate for that city.
    onChange({
      ...value,
      city: row.city,
      state: row.state || '',
      country: row.country || '',
      areaLabel: value.areaLabel || '',
    });
    // Nudge the user to pin the exact area if we have no coordinates yet.
  };

  const hasCoords = typeof value.latitude === 'number' && typeof value.longitude === 'number';
  const showSuggestions = open && (suggestions.length > 0 || cityOptions.length > 0 || searching);

  return (
    <div ref={containerRef} className={cx('space-y-3', error && 'rounded-lg')}>
      <div>
        <span className="field-label">
          {label}
          {required && (
            <span className="ml-0.5 text-brand-600" aria-hidden="true">
              *
            </span>
          )}
        </span>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={handleUseMyLocation}
            loading={geo.status === 'loading' || resolving}
            className="sm:w-auto"
            leftIcon={
              geo.status !== 'loading' && !resolving ? (
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 14.5A6.5 6.5 0 1 1 8 1.5a6.5 6.5 0 0 1 0 13Zm3.25-6.5a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Zm-4.5 0a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0Z" />
                </svg>
              ) : null
            }
          >
            Use my current location
          </Button>

          <div className="relative flex-1">
            <Input
              aria-label="Search for a city or area"
              placeholder="Or search a city or area…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              autoComplete="off"
              rightAddon={searching ? <Spinner size="sm" /> : null}
            />

            {showSuggestions && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white py-1 shadow-pop">
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.latitude},${suggestion.longitude}`}
                    type="button"
                    onClick={() => pickSuggestion(suggestion)}
                    className="block w-full px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                  >
                    {suggestion.shortLabel}
                  </button>
                ))}

                {suggestions.length === 0 && cityOptions.length > 0 && (
                  <>
                    <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                      Cities with donors
                    </p>
                    {cityOptions.slice(0, 6).map((row) => (
                      <button
                        key={`${row.city}-${row.country}`}
                        type="button"
                        onClick={() => pickKnownCity(row)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                      >
                        <span>
                          {row.city}
                          {row.state ? `, ${row.state}` : ''}
                        </span>
                        <span className="text-xs text-ink-400">{row.donorCount} donors</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {searchError && <p className="field-hint text-amber-700">{searchError}</p>}
        {geo.error && <p className="field-hint text-amber-700">{geo.error}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="City"
          required={cityRequired}
          value={value.city || ''}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          placeholder="e.g. Bengaluru"
        />
        <Input
          label="State / region"
          value={value.state || ''}
          onChange={(event) => onChange({ ...value, state: event.target.value })}
          placeholder="e.g. Karnataka"
        />
        <Input
          label="Country"
          required={cityRequired}
          value={value.country || ''}
          onChange={(event) => onChange({ ...value, country: event.target.value })}
          placeholder="e.g. India"
        />
      </div>

      <Input
        label="Area or landmark"
        value={value.areaLabel || ''}
        onChange={(event) => onChange({ ...value, areaLabel: event.target.value })}
        placeholder="e.g. Koramangala"
        hint="Shown to other users instead of your exact address. Never enter your full home address."
        maxLength={120}
      />

      <div
        className={cx(
          'flex items-start gap-2 rounded-lg border p-2.5 text-xs',
          hasCoords ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-ink-200 bg-ink-50 text-ink-500'
        )}
        role="status"
      >
        {hasCoords ? (
          <>
            <svg viewBox="0 0 16 16" className="mt-px h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.25a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
            </svg>
            <span>
              Coordinates set ({value.latitude.toFixed(3)}, {value.longitude.toFixed(3)}). These are used only to
              calculate distance and are never shown to other users.
            </span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" className="mt-px h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5h1.5v1.5h-1.5V4.5Zm0 3h1.5v4h-1.5v-4Z" />
            </svg>
            <span>Use your current location or search a city so we can match you with people nearby.</span>
          </>
        )}
      </div>

      {error && <p className="field-error">{error}</p>}
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  );
}
