import { fetchAlerts } from '../api/endpoints.js';
import { useFetch } from './useFetch.js';
import { useLiveRefresh } from './useLiveRefresh.js';

export const useRecentAlerts = (deviceId, limit = 3) => {
  const refreshKey = useLiveRefresh();
  return useFetch(
    async () => (await fetchAlerts({ deviceId, limit })).data,
    `${deviceId}:${limit}`,
    { enabled: Boolean(deviceId), refreshKey }
  );
};