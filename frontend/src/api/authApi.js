import { api } from './client.js';

export const login = (email, password) => api.post('/auth/login', { email, password }).then((res) => res.data.data);

export const signup = (body) => api.post('/auth/signup', body).then((res) => res.data.data);

export const fetchMe = () => api.get('/auth/me').then((res) => res.data.data);

export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/password', { currentPassword, newPassword }).then((res) => res.data.data);

export const fetchUsers = () => api.get('/users').then((res) => res.data.data);

export const createUser = (body) => api.post('/users', body).then((res) => res.data.data);

export const updateUser = (userId, body) => api.patch(`/users/${userId}`, body).then((res) => res.data.data);

export const resetUserPassword = (userId, password) =>
  api.post(`/users/${userId}/password`, { password }).then((res) => res.data.data);