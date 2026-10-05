import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import AppRoutes from './routes/AppRoutes';

/**
 * Watches for a mid-session 401 broadcast by the API layer and surfaces it as
 * a toast, so an expired session is explained rather than silently dropping
 * the user to the login page.
 */
function SessionWatcher() {
  const { sessionNotice, clearSessionNotice } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!sessionNotice) return;
    toast.error(sessionNotice);
    clearSessionNotice();
  }, [sessionNotice, toast, clearSessionNotice]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SessionWatcher />
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
