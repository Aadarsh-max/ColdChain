import { api } from './client.js';

export const fetchSummary = () => api.get('/dashboard/summary').then((res) => res.data.data);

export const fetchDevices = () => api.get('/devices').then((res) => res.data.data);

export const fetchDevice = (deviceId) => api.get(`/devices/${deviceId}`).then((res) => res.data.data);

export const fetchSeries = (deviceId, params) =>
  api.get(`/devices/${deviceId}/series`, { params }).then((res) => res.data.data);

export const fetchReadings = (deviceId, params) =>
  api.get(`/devices/${deviceId}/readings`, { params }).then((res) => res.data);

export const fetchAlerts = (params) => api.get('/alerts', { params }).then((res) => res.data);

export const acknowledgeAlert = (alertId, acknowledgedBy) =>
  api.patch(`/alerts/${alertId}/acknowledge`, acknowledgedBy ? { acknowledgedBy } : {}).then((res) => res.data.data);

export const fetchShipments = (params) => api.get('/shipments', { params }).then((res) => res.data);

export const fetchShipment = (shipmentId) =>
  api.get(`/shipments/${encodeURIComponent(shipmentId)}`).then((res) => res.data.data);

export const fetchShipmentHistory = (shipmentId) =>
  api.get(`/shipments/${encodeURIComponent(shipmentId)}/history`).then((res) => res.data.data);

export const fetchShipmentReadings = (shipmentId, params) =>
  api.get(`/shipments/${encodeURIComponent(shipmentId)}/readings`, { params }).then((res) => res.data);

export const createShipment = (body) => api.post('/shipments', body).then((res) => res.data.data);

export const updateShipment = (shipmentId, body) =>
  api.patch(`/shipments/${encodeURIComponent(shipmentId)}`, body).then((res) => res.data.data);

export const fetchSettings = () => api.get('/settings').then((res) => res.data.data);

export const updateSettings = (body) => api.patch('/settings', body).then((res) => res.data.data);