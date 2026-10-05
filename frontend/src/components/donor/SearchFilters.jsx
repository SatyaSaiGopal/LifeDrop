import { BLOOD_GROUPS, RADIUS_OPTIONS, cx } from '../../utils/format';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

/**
 * Search filters for the donor search page.
 * Every control maps to a real query parameter and takes effect immediately.
 */
export default function SearchFilters({
  filters,
  onChange,
  onUseMyLocation,
  locationStatus,
  locationLabel,
  disabled = false,
  className = '',
}) {
  const set = (patch) => onChange({ ...filters, ...patch });

  const locationBusy = locationStatus === 'loading';

  return (
    <div className={cx('space-y-5', className)}>
      {/* --- Location --- */}
      <fieldset disabled={disabled}>
        <legend className="field-label">Location</legend>
        <div className="space-y-2">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={onUseMyLocation}
            loading={locationBusy}
            leftIcon={
              !locationBusy && (
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 14.5A6.5 6.5 0 1 1 8 1.5a6.5 6.5 0 0 1 0 13Zm3.25-6.5a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Zm-4.5 0a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0Z" />
                </svg>
              )
            }
          >
            {locationBusy ? 'Getting location…' : 'Use my current location'}
          </Button>

          {locationLabel && (
            <p className="flex items-start gap-1.5 text-xs text-ink-500">
              <svg viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" fill="currentColor" aria-hidden="true">
                <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.25a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
              </svg>
              <span className="min-w-0 break-words">{locationLabel}</span>
            </p>
          )}
        </div>
      </fieldset>

      {/* --- Blood group: segmented, keyboard-navigable --- */}
      <fieldset disabled={disabled}>
        <legend className="field-label">Blood group</legend>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Blood group">
          <FilterChip
            label="All"
            active={!filters.bloodGroup}
            onClick={() => set({ bloodGroup: '' })}
            className="col-span-3"
          />
          {BLOOD_GROUPS.map((group) => (
            <FilterChip
              key={group}
              label={group}
              active={filters.bloodGroup === group}
              onClick={() => set({ bloodGroup: filters.bloodGroup === group ? '' : group })}
            />
          ))}
        </div>
      </fieldset>

      {/* --- Radius --- */}
      <fieldset disabled={disabled}>
        <legend className="field-label">Search radius</legend>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Search radius">
          {RADIUS_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={Number(filters.radius) === option.value}
              onClick={() => set({ radius: option.value })}
            />
          ))}
        </div>
      </fieldset>

      {/* --- Availability --- */}
      <fieldset disabled={disabled}>
        <legend className="field-label">Availability</legend>
        <div className="space-y-1.5">
          <RadioRow
            name="availability"
            label="Available now"
            description="Only donors who can donate today"
            checked={filters.available === 'true'}
            onChange={() => set({ available: 'true' })}
          />
          <RadioRow
            name="availability"
            label="All donors"
            description="Include donors who are temporarily unavailable"
            checked={filters.available !== 'true'}
            onChange={() => set({ available: 'all' })}
          />
        </div>
      </fieldset>

      {/* --- Sort --- */}
      <fieldset disabled={disabled}>
        <legend className="field-label">Sort by</legend>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Sort order">
          <FilterChip
            label="Nearest"
            active={filters.sort === 'distance'}
            onClick={() => set({ sort: 'distance' })}
          />
          <FilterChip
            label="Recently active"
            active={filters.sort === 'recent'}
            onClick={() => set({ sort: 'recent' })}
          />
        </div>
      </fieldset>

      {locationBusy && (
        <p className="flex items-center gap-2 text-xs text-ink-500">
          <Spinner size="xs" /> Waiting for your browser's location…
        </p>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="radio"
      aria-checked={active}
      className={cx(
        'rounded-lg border px-2 py-2 text-xs font-semibold tabular-nums transition-colors duration-150',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-ink-300 bg-white text-ink-600 hover:border-ink-400 hover:bg-ink-50',
        className
      )}
    >
      {label}
    </button>
  );
}

function RadioRow({ name, label, description, checked, onChange }) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors duration-150',
        checked ? 'border-brand-300 bg-brand-50/60' : 'border-ink-200 bg-white hover:bg-ink-50'
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 border-ink-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-ink-800">{label}</span>
        <span className="mt-0.5 block text-2xs leading-snug text-ink-500">{description}</span>
      </span>
    </label>
  );
}
