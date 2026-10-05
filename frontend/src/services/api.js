/**
 * Single API client. Every network call in the app goes through here so
 * credentials, error normalisation and the base URL live in exactly one place.
 */
import { getToken } from './tokenStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/** Error carrying the HTTP status and any field-level validation details. */
export class ApiError extends Error {
  constructor(message, status, details, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details || null;
    this.code = code;
  }

  get isNetwork() {
    return this.status === 0;
  }
  get isAuth() {
    return this.status === 401;
  }
  get isValidation() {
    return this.status === 400 && Boolean(this.details);
  }
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request(method, path, { body, params, signal, isFormData = false } = {}) {
  const url = `${BASE_URL}${path}${buildQuery(params)}`;
  const headers = {};
  if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json';

  // Bearer token is a fallback for clients that cannot use cookies (e.g. a
  // native shell); the browser relies on the httpOnly cookie.
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, null, 'network');
  }

  // 204 and empty bodies are valid; do not attempt to parse them.
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (response.status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : 'Something went wrong. Please try again.');
    throw new ApiError(message, response.status, payload?.error?.details || null, payload?.error?.code);
  }

  return payload?.data ?? null;
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
  /** Meta is needed for pagination, so expose the raw envelope when required. */
  async getWithMeta(path, options) {
    const url = `${BASE_URL}${path}${buildQuery(options?.params)}`;
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let response;
    try {
      response = await fetch(url, { headers, credentials: 'include', signal: options?.signal });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, null, 'network');
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        payload?.error?.message || 'Something went wrong. Please try again.',
        response.status,
        payload?.error?.details || null,
        payload?.error?.code
      );
    }
    return { data: payload?.data ?? null, meta: payload?.meta ?? null };
  },
  upload: (path, formData, options) => request('POST', path, { ...options, body: formData, isFormData: true }),
};

export { buildQuery };
