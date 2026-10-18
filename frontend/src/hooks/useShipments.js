import { fetchShipmentHistory } from '../api/endpoints.js';
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