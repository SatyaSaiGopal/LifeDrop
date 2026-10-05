import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../feedback/States';
import { useToast } from '../../context/ToastContext';

/**
 * Gate for authenticated routes.
 *
 * While the session is being resolved we render a loading state instead of
 * bouncing to /login, so a signed-in user never sees a flash of the login page
 * on refresh.
 */
export default function ProtectedRoute({ children, requireDonor = false }) {
  const { isAuthenticated, isReady, isDonor } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireDonor && !isDonor) {
    return <DonorRequired />;
  }

  return children;
}

/** Explains why a signed-in non-donor cannot open a donor-only page. */
function DonorRequired() {
  const toast = useToast();
  useEffect(() => {
    toast.error('That page is only available to registered donors.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Navigate to="/dashboard" replace />;
}
