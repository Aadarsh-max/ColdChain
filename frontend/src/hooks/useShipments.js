import {
  fetchShipment,
  fetchShipmentHistory,
  fetchShipmentReadings,
  fetchShipments
} from '../api/endpoints.js';
import { useFetch } from './useFetch.js';
import { useLiveRefresh } from './useLiveRefresh.js';

export const useShipmentHistory = (shipmentId) => {
  const refreshKey = useLiveRefresh(8000);
  return useFetch(() => fetchShipmentHistory(shipmentId), shipmentId || '', {
    enabled: Boolean(shipmentId),
    refreshKey,
    pollMs: 20000
  });
};

export const useShipmentList = (params, reload = 0) => {
  const refreshKey = useLiveRefresh(5000);
  return useFetch(() => fetchShipments(params), JSON.stringify(params), { refreshKey: refreshKey + reload });
};

export const useShipmentDetail = (shipmentId, reload = 0) => {
  const refreshKey = useLiveRefresh(5000);
  return useFetch(() => fetchShipment(shipmentId), `detail:${shipmentId}`, {
    enabled: Boolean(shipmentId),
    refreshKey: refreshKey + reload
  });
};

export const useShipmentReadings = (shipmentId, limit = 10) => {
  const refreshKey = useLiveRefresh(5000);
  return useFetch(
    async () => (await fetchShipmentReadings(shipmentId, { limit, sort: 'desc' })).data,
    `readings:${shipmentId}:${limit}`,
    { enabled: Boolean(shipmentId), refreshKey }
  );
};