import { api } from './api';

/** Thin, typed-by-convention wrappers around the REST endpoints. */

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const donorApi = {
  /** Radius search. Returns { data, meta } — meta carries the total and filters. */
  nearby: (params, options) => api.getWithMeta('/donors/nearby', { ...options, params }),
  get: (id, options) => api.get(`/donors/${id}`, options),
  cities: (q) => api.get('/donors/cities', { params: { q } }),
  stats: () => api.get('/donors/stats'),
  update: (id, payload) => api.patch(`/donors/${id}`, payload),
  setAvailability: (id, payload) => api.patch(`/donors/${id}/availability`, payload),
};

export const requestApi = {
  /** Create a request; the response includes compatible donors found nearby. */
  create: (payload) => api.post('/requests', payload),
  list: (params, options) => api.getWithMeta('/requests', { ...options, params }),
  get: (id, options) => api.get(`/requests/${id}`, options),
  matches: (id, params) => api.get(`/requests/${id}/matches`, { params }),
  respond: (id, action, note) => api.post(`/requests/${id}/respond`, { action, note }),
  cancel: (id) => api.post(`/requests/${id}/cancel`),
  fulfill: (id) => api.post(`/requests/${id}/fulfill`),
};

export const dashboardApi = {
  get: (options) => api.get('/dashboard', options),
};
