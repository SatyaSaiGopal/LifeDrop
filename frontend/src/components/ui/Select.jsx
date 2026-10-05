import { forwardRef, useId } from 'react';
import { cx } from '../../utils/format';
import FieldError from './FieldError';

/** Native select with the same label/hint/error treatment as Input. */
const Select = forwardRef(function Select(
  { label, error, hint, id, required = false, options = [], placeholder, className = '', containerClassName = '', children, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id || `select-${generatedId}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={selectId} className="field-label">
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
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={cx('input', error && 'input-error', className)}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
});

export default Select;
