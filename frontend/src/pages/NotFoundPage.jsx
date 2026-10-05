import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

/** 404 page with real navigation options. */
export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">404</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">This page does not exist</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">
        The link may be broken, or the page may have been moved. Here is where you probably want to go.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as="link" to="/search" variant="primary">
          Find donors
        </Button>
        <Button as="link" to="/requests" variant="secondary">
          Browse blood requests
        </Button>
      </div>

      <p className="mt-8 text-xs text-ink-400">
        Or return to the{' '}
        <Link to="/" className="link">
          home page
        </Link>
        .
      </p>
    </div>
  );
}
