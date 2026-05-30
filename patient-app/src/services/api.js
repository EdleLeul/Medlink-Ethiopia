import axios    from 'axios';
import { Platform } from 'react-native';
import { auth }     from '../firebaseConfig';
import { saveCache, loadCache } from './offlineCache';

const API_BASE = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://10.0.2.2:5000/api';

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

// ── Attach Firebase ID token to every request ─────────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken(true);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Token attach failed:', e.message);
  }
  return config;
});

// ── Response interceptor: cache successful GET responses ──────────────────────
api.interceptors.response.use(
  (response) => {
    // Only cache GET requests
    if (response.config.method === 'get') {
      const url = response.config.url || '';
      saveCache(url, response.data); // fire and forget
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    // On network error or timeout, try to serve from cache (GET only)
    const isNetworkError = !error.response;
    const isGET          = config?.method === 'get';

    if (isNetworkError && isGET && config?.url) {
      const cached = await loadCache(config.url);
      if (cached) {
        console.log('Serving from cache:', config.url);
        // Return a mock response object with isCache flag
        return Promise.resolve({
          data:    cached.data,
          status:  200,
          headers: {},
          config,
          isCache: true,
          savedAt: cached.savedAt,
        });
      }
    }

    return Promise.reject(error);
  }
);

// ─── Patient ──────────────────────────────────────────────────────────────────
export const registerPatient  = (data)          => api.post('/patients/register', data);
export const getPatient       = (id)            => api.get(`/patients/${id}`);
export const updatePatient    = (id, d)         => api.put(`/patients/${id}`, d);

// ─── EMR Records ──────────────────────────────────────────────────────────────
export const getRecords       = (pid, type)     => api.get(`/records/${pid}/${type}`);
export const addRecord        = (pid, type, d)  => api.post(`/records/${pid}/${type}`, d);
export const updateRecord     = (pid, type, rid, d) => api.put(`/records/${pid}/${type}/${rid}`, d);

// ─── OTP ──────────────────────────────────────────────────────────────────────
export const getPendingOTPs   = ()              => api.get('/otp/pending');
export const denyOTP          = (id)            => api.post('/otp/deny', { otpDocID: id });

// ─── Children ─────────────────────────────────────────────────────────────────
export const registerChild    = (data)          => api.post('/children/register', data);
export const getChildren      = ()              => api.get('/children');
export const getChild         = (id)            => api.get(`/children/${id}`);
export const deleteChild      = (id)            => api.delete(`/children/${id}`);

// ─── Audit Log ────────────────────────────────────────────────────────────────
export const getAccessLog     = (pid)           => api.get(`/patients/${pid}/auditlog`);

// ─── Travel Share Pass ────────────────────────────────────────────────────────
export const createSharePass  = (patientID, duration) =>
  api.post('/share/create', { patientID, duration });

export const listSharePasses  = (patientID)     => api.get(`/share/list/${patientID}`);
export const revokeSharePass  = (passID)        => api.delete(`/share/revoke/${passID}`);

export default api;