import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5055';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000
});

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