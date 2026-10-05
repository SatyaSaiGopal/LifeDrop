import { forwardRef, useId } from 'react';
import { cx } from '../../utils/format';
import FieldError from './FieldError';

/** Multi-line text input with the shared label/hint/error treatment. */
const Textarea = forwardRef(function Textarea(
  { label, error, hint, id, required = false, rows = 4, maxLength, value, className = '', containerClassName = '', ...rest },
  ref
) {
  const generatedId = useId();
  const fieldId = id || `textarea-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined;
  const remaining = maxLength && typeof value === 'string' ? maxLength - value.length : null;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
          {required && (
            <>
              <span className="ml-0.5 text-brand-600" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={cx('input resize-y', error && 'input-error', className)}
        {...rest}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {hint && !error && (
            <p id={hintId} className="field-hint">
              {hint}
            </p>
          )}
          {error && <FieldError id={errorId}>{error}</FieldError>}
        </div>
        {remaining !== null && (
          <span className={cx('mt-1.5 shrink-0 text-xs tabular-nums', remaining < 0 ? 'text-brand-600' : 'text-ink-400')}>
            {remaining}
          </span>
        )}
      </div>
    </div>
  );
});

export default Textarea;
