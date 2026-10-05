import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints';
import { setToken, clearToken } from '../services/tokenStore';

const AuthContext = createContext(null);

/**
 * Authentication state for the whole app.
 *
 * The session lives in an httpOnly cookie the JS cannot read, so on mount we
 * ask the API who we are (`/auth/me`). That call is the single source of truth
 * for "am I signed in" and it doubles as the session-expiry check.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [sessionNotice, setSessionNotice] = useState(null);

  const bootstrap = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      setStatus('authenticated');
    } catch (err) {
      if (err.isAuth) {
        // A 401 here is the normal "not signed in" case, not an error.
        setUser(null);
        setStatus('anonymous');
      } else {
        // Network/5xx: stay signed-out but tell the user why.
        setUser(null);
        setStatus('anonymous');
      }
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setToken(data.token);
    setUser(data.user);
    setStatus('authenticated');
    setSessionNotice(null);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setToken(data.token);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Clear local state regardless of the server response: the user asked to
      // sign out and must not remain signed in on this device.
      clearToken();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  /** Merge a partial user (e.g. after a profile update) without a refetch. */
  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const updateProfile = useCallback((profile) => {
    setUser((prev) => (prev ? { ...prev, profile: { ...prev.profile, ...profile } } : prev));
  }, []);

  /** Called by the API layer when a request returns 401 mid-session. */
  const handleSessionExpired = useCallback(
    (message = 'Your session expired. Please sign in again.') => {
      clearToken();
      setUser(null);
      setStatus('anonymous');
      setSessionNotice(message);
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isDonor: Boolean(user?.profile) || user?.role === 'donor',
      isReady: status !== 'loading',
      sessionNotice,
      clearSessionNotice: () => setSessionNotice(null),
      login,
      register,
      logout,
      updateUser,
      updateProfile,
      refresh: bootstrap,
      handleSessionExpired,
    }),
    [user, status, sessionNotice, login, register, logout, updateUser, updateProfile, bootstrap, handleSessionExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
