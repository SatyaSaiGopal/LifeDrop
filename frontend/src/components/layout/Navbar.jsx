import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { cx } from '../../utils/format';

/** Product wordmark — a small, consistent mark used in the nav and footer. */
export function Logo({ className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-3 3.4-5.5 6-5.5 9a5.5 5.5 0 0 0 11 0c0-3-2.5-5.6-5.5-9Z" />
        </svg>
      </span>
      <span className="text-base font-bold tracking-tight text-ink-900">Lifeline</span>
    </span>
  );
}

const NAV_LINKS = [
  { to: '/search', label: 'Find donors' },
  { to: '/requests', label: 'Blood requests' },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  // Close any open menus on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onClick = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setAccountOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  const handleLogout = async () => {
    await logout();
    toast.info('You have been signed out.');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only-focusable absolute left-4 top-3 z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
        Skip to content
      </a>

      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Lifeline home" className="rounded-lg">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button as="link" to="/requests/new" size="sm" variant="primary" className="hidden sm:inline-flex">
                Need blood?
              </Button>

              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-ink-100"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  aria-label="Account menu"
                >
                  <Avatar src={user?.profile?.profilePhoto} name={user?.name} size="sm" />
                  <span className="hidden max-w-[8rem] truncate text-sm font-medium text-ink-700 sm:block">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-ink-400" fill="currentColor" aria-hidden="true">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>

                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-pop animate-slide-up"
                  >
                    <div className="border-b border-ink-100 px-4 py-2.5">
                      <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
                      <p className="truncate text-xs text-ink-500">{user?.email}</p>
                      {user?.profile && (
                        <p className="mt-1 text-2xs font-medium text-brand-700">
                          Donor · {user.profile.bloodGroup}
                        </p>
                      )}
                    </div>
                    <MenuLink to="/dashboard">Dashboard</MenuLink>
                    {user?.profile && <MenuLink to="/profile">My donor profile</MenuLink>}
                    <MenuLink to="/requests?scope=mine">My blood requests</MenuLink>
                    {user?.profile && <MenuLink to="/requests?scope=responded">Requests I responded to</MenuLink>}
                    <div className="my-1 border-t border-ink-100" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button as="link" to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
              <Button as="link" to="/register" size="sm" variant="primary">
                Become a donor
              </Button>
            </>
          )}

          <button
            type="button"
            className="rounded-lg p-2 text-ink-600 transition-colors hover:bg-ink-100 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              {menuOpen ? (
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              ) : (
                <path d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm.75 3.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-ink-200 bg-white px-4 pb-4 pt-2 md:hidden" aria-label="Mobile">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cx(
                    'block rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-50'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <MenuLink to="/dashboard">Dashboard</MenuLink>
                {user?.profile && <MenuLink to="/profile">My donor profile</MenuLink>}
                <MenuLink to="/requests/new">Create a blood request</MenuLink>
                <MenuLink to="/requests?scope=mine">My blood requests</MenuLink>
              </>
            ) : (
              <>
                <MenuLink to="/login">Sign in</MenuLink>
                <MenuLink to="/register">Register as a donor</MenuLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuLink({ to, children }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="block rounded-lg px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 md:rounded-none md:px-4"
    >
      {children}
    </Link>
  );
}
