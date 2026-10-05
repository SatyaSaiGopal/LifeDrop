import { forwardRef } from 'react';
import { cx } from '../../utils/format';
import Spinner from './Spinner';

const TONES = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  info: 'bg-sky-50 text-sky-900 ring-sky-200',
};

/**
 * Status pill. `icon` is expected wherever the badge communicates state that
 * must not rely on colour alone (e.g. availability).
 */
const Badge = forwardRef(function Badge({ tone = 'neutral', icon = null, size = 'md', className = '', children, ...rest }, ref) {
  return (
    <span
      ref={ref}
      className={cx(
        'badge ring-1 ring-inset',
        TONES[tone] || TONES.neutral,
        size === 'sm' && 'px-1.5 py-0.5 text-2xs',
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
});

export function AvailabilityBadge({ available, availableAgainOn, size = 'md' }) {
  if (available) {
    return (
      <Badge
        tone="success"
        size={size}
        icon={
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden="true">
            <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0Zm2.8 4.6L5.6 7.8 3.7 6l.8-.8 1.1 1.1 2.4-2.4.8.7Z" />
          </svg>
        }
      >
        Available
      </Badge>
    );
  }
  return (
    <Badge
      tone="neutral"
      size={size}
      icon={
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0ZM2 6a4 4 0 0 1 4-4c.9 0 1.7.3 2.4.8L3.4 8.4A4 4 0 0 1 2 6Zm4 4c-.9 0-1.7-.3-2.4-.8l5-5A4 4 0 0 1 6 10Z" />
        </svg>
      }
    >
      {availableAgainOn ? 'Unavailable' : 'Not available'}
    </Badge>
  );
}

export function BloodGroupBadge({ group, size = 'md', className = '' }) {
  const negative = group?.endsWith('-');
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center rounded-md font-bold tabular-nums',
        size === 'sm' ? 'h-6 min-w-[2rem] px-1 text-xs' : size === 'lg' ? 'h-11 min-w-[3.5rem] px-2 text-lg' : 'h-8 min-w-[2.75rem] px-1.5 text-sm',
        negative ? 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200' : 'bg-brand-600 text-white',
        className
      )}
      aria-label={`Blood group ${group}`}
    >
      {group}
    </span>
  );
}

export default Badge;
