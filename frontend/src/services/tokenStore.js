/**
 * Small persistence helper for the bearer-token fallback.
 * The primary session is an httpOnly cookie the JS never sees; this only
 * exists so non-browser clients can authenticate.
 */
const KEY = 'lifeline.token';

export function getToken() {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(KEY, token);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage may be unavailable (private mode) — the cookie still works */
  }
}

export function clearToken() {
  setToken(null);
}
