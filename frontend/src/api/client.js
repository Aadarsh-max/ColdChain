import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5055';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000
});

export const errorMessage = (err) =>
  (err && err.response && err.response.data && err.response.data.error && err.response.data.error.message) ||
  (err && err.message) ||
  'Request failed';