import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ToastViewport from '../components/feedback/ToastViewport';

/** Public shell: nav, routed page, footer. */
export default function MainLayout() {
  const { pathname } = useLocation();

  // Reset scroll on navigation; without this, a long results list leaves the
  // next page scrolled to the middle.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ToastViewport />
    </div>
  );
}
