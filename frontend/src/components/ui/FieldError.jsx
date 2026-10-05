/** Inline field error with an icon, so status is not conveyed by colour alone. */
export default function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="field-error" role="alert">
      <svg viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5h1.5v5h-1.5v-5Zm0 6h1.5v1.5h-1.5v-1.5Z" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
