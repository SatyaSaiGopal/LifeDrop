import { useState } from 'react';
import { cx, initials } from '../../utils/format';

const SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

/**
 * Profile avatar with a graceful initials fallback: a broken or missing image
 * must never leave a blank hole in a card.
 */
export default function Avatar({ src, name = '', size = 'md', className = '', ring = false }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100 font-semibold text-ink-500',
        SIZES[size] || SIZES.md,
        ring && 'ring-2 ring-white',
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
