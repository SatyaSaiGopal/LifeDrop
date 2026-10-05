import { Link } from 'react-router-dom';
import { Logo } from './Navbar';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500">
              Lifeline helps people find compatible, available blood donors nearby — and helps donors respond when
              they are needed.
            </p>
            <p className="mt-4 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              <strong className="font-semibold">Medical disclaimer:</strong> Lifeline is a donor discovery and
              coordination tool. It is not a medical service and does not replace doctors, hospitals, blood banks or
              emergency services. Final donation and transfusion eligibility must always be confirmed by a qualified
              medical professional or the relevant blood bank.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Product</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <FooterLink to="/search">Find donors</FooterLink>
              </li>
              <li>
                <FooterLink to="/requests">Blood requests</FooterLink>
              </li>
              <li>
                <FooterLink to="/register">Become a donor</FooterLink>
              </li>
              <li>
                <FooterLink to="/compatibility">Blood group guide</FooterLink>
              </li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Account</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <FooterLink to="/login">Sign in</FooterLink>
              </li>
              <li>
                <FooterLink to="/dashboard">Dashboard</FooterLink>
              </li>
              <li>
                <FooterLink to="/profile">Donor profile</FooterLink>
              </li>
              <li>
                <FooterLink to="/privacy">Privacy</FooterLink>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-ink-100 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Lifeline. A demonstration platform for blood donor coordination.</p>
          <p>Built for coordination, not medical advice.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="text-ink-600 transition-colors hover:text-brand-700">
      {children}
    </Link>
  );
}
