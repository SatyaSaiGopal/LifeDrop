import { forwardRef, useId } from 'react';
import { cx } from '../../utils/format';
import FieldError from './FieldError';

/**
 * Text input with an accessible label, hint and error wiring.
 * The error is linked with aria-describedby and marked aria-invalid so screen
 * readers announce it when the field receives focus.
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    id,
    required = false,
    leftAddon = null,
    rightAddon = null,
    className = '',
    containerClassName = '',
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || `field-${generatedId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && (
            <span className="ml-0.5 text-brand-600" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}

      <div className="relative">
        {leftAddon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cx('input', leftAddon && 'pl-9', rightAddon && 'pr-10', error && 'input-error', className)}
          {...rest}
        />
        {rightAddon && <span className="absolute inset-y-0 right-0 flex items-center pr-3">{rightAddon}</span>}
      </div>

      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
});

export default Input;
