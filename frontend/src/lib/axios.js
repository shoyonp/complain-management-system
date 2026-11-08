import axios from 'axios';
import { auth } from './firebase.js';

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${baseUrl}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach a fresh Firebase ID token to every request (blueprint §4.4).
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;

  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// A 401 means the session is no longer valid (expired or revoked token): drop
// the local session and let the route guards send the user to /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await auth.signOut().catch(() => {});
    }

    return Promise.reject(error);
  },
);

export default api;
