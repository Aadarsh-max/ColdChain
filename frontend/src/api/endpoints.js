import { api } from './client.js';

export const fetchSummary = () => api.get('/dashboard/summary').then((res) => res.data.data);

export const fetchDevices = () => api.get('/devices').then((res) => res.data.data);

export const fetchDevice = (deviceId) => api.get(`/devices/${deviceId}`).then((res) => res.data.data);

export const fetchSeries = (deviceId, params) =>
  api.get(`/devices/${deviceId}/series`, { params }).then((res) => res.data.data);

export const fetchReadings = (deviceId, params) =>
  api.get(`/devices/${deviceId}/readings`, { params }).then((res) => res.data);

export const fetchAlerts = (params) => api.get('/alerts', { params }).then((res) => res.data);

export const fetchShipmentHistory = (shipmentId) =>
  api.get(`/shipments/${shipmentId}/history`).then((res) => res.data.data);