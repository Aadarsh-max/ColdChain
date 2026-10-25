import axios from 'axios';
import { getToken } from './token.js';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5055';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000
});

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const notifyUnauthorized = () => {
  if (unauthorizedHandler) unauthorizedHandler();
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (err) => {
    const status = err && err.response && err.response.status;
    const url = (err && err.config && err.config.url) || '';
    if (status === 401 && !url.startsWith('/auth/login')) notifyUnauthorized();
    return Promise.reject(err);
  }
);

export const errorMessage = (err) => {
  const body = err && err.response && err.response.data && err.response.data.error;
  if (body) {
    if (Array.isArray(body.details) && body.details.length > 0) {
      const parts = body.details.map((item) => (item.path ? `${item.path}: ${item.message}` : item.message));
      return `${body.message}. ${parts.join('; ')}`;
    }
    return body.message || 'Request failed';
  }
  return (err && err.message) || 'Request failed';
};