import Button from '../ui/Button';
import { cx } from '../../utils/format';

/** Centred spinner for a whole panel/page while data loads. */
export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 py-16 text-center', className)} role="status">
      <svg className="h-7 w-7 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
      </svg>
      <p className="text-sm font-medium text-ink-500">{label}</p>
    </div>
  );
}

/** Skeleton placeholder for a donor card while results load. */
export function DonorCardSkeleton() {
  return (
    <div className="card p-4" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="skeleton h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-3 w-1/3" />
        </div>
        <div className="skeleton h-8 w-11" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-9 flex-1" />
        <div className="skeleton h-9 flex-1" />
      </div>
    </div>
  );
}

export function DonorListSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DonorCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="card p-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-6 w-16 rounded-md" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Empty state with a real next action. The `actions` prop is required in
 * practice: an empty state without a way forward is a dead end.
 */
export function EmptyState({ icon = null, title, message, actions = null, className = '' }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        {icon || (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink-800">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">{message}</p>}
      {actions && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}

/** Error state that surfaces the real message and offers a retry. */
export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again', className = '' }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-14 text-center', className)} role="alert">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M12 8v5" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
          <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink-800">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
        {message || 'We could not load this right now. Please try again.'}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
