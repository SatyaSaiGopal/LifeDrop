import { cx } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

const VARIANTS = {
  success: {
    container: 'border-emerald-200 bg-white',
    icon: 'text-emerald-600',
    path: 'M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm4 6.2-4.7 4.7a.75.75 0 0 1-1.06 0L6 10.1l1.06-1.06 1.7 1.7 4.18-4.18L14 7.7Z',
  },
  error: {
    container: 'border-brand-200 bg-white',
    icon: 'text-brand-600',
    path: 'M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-.75 4h1.5v6h-1.5v-6Zm0 7.5h1.5V14.5h-1.5V13Z',
  },
  info: {
    container: 'border-sky-200 bg-white',
    icon: 'text-sky-600',
    path: 'M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm1 13h-2v-6h2v6Zm0-7.5h-2v-2h2v2Z',
  },
};

/** Toast viewport. Rendered once, near the root of the app. */
export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-5"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const variant = VARIANTS[toast.variant] || VARIANTS.info;
        return (
          <div
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3.5 shadow-pop animate-toast-in',
              variant.container
            )}
          >
            <svg viewBox="0 0 20 20" className={cx('mt-0.5 h-5 w-5 shrink-0', variant.icon)} fill="currentColor" aria-hidden="true">
              <path d={variant.path} />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-ink-800">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action.onClick();
                    dismiss(toast.id);
                  }}
                  className="mt-1.5 text-sm font-semibold text-brand-700 hover:underline"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-mr-1 -mt-1 rounded p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
              aria-label="Dismiss notification"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M4.28 3.22 3.22 4.28 6.94 8l-3.72 3.72 1.06 1.06L8 9.06l3.72 3.72 1.06-1.06L9.06 8l3.72-3.72-1.06-1.06L8 6.94 4.28 3.22Z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
