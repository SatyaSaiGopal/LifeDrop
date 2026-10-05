import { cx } from '../../utils/format';

const SIZES = { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };

/** Accessible inline spinner. Hidden from the a11y tree when a label exists. */
export default function Spinner({ size = 'md', className = '', label = 'Loading' }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <svg
        className={cx('animate-spin', SIZES[size] || SIZES.md, className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Zm2 5.3A8 8 0 0 1 4 12H0c0 3 .9 5.8 2.4 8.2l3.6-2.9Z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
