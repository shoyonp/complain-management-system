import axios from 'axios';

// The blueprint's versioned base path (/api/v1) is introduced in M1 together
// with the first feature endpoints.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// TODO(M1): attach the Firebase ID token before each request,
// sign out on 401 and route to /403 on 403 (§4.4).

export default api;
