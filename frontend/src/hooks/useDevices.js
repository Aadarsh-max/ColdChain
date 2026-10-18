import { useEffect } from 'react';
import { useLive } from '../context/LiveDataContext.jsx';
import { fetchDevice, fetchReadings, fetchSeries } from '../api/endpoints.js';
import { RANGES } from '../utils/constants.js';
import { useFetch } from './useFetch.js';
import { useLiveRefresh } from './useLiveRefresh.js';

export const useSelectedDevice = () => {
  const { devices, selectedDeviceId, setSelectedDeviceId } = useLive();

  useEffect(() => {
    if (devices.length === 0) return;
    if (devices.some((item) => item.deviceId === selectedDeviceId)) return;
    const newest = [...devices].sort(
      (a, b) => new Date(b.lastTelemetryAt || 0).getTime() - new Date(a.lastTelemetryAt || 0).getTime()
    )[0];
    setSelectedDeviceId(newest.deviceId);
  }, [devices, selectedDeviceId, setSelectedDeviceId]);

  const device = devices.find((item) => item.deviceId === selectedDeviceId) || null;

  return {
    devices,
    device,
    deviceId: device ? device.deviceId : '',
    setDeviceId: setSelectedDeviceId
  };
};

export const useDeviceOverview = (deviceId) => {
  const refreshKey = useLiveRefresh();
  return useFetch(() => fetchDevice(deviceId), deviceId, {
    enabled: Boolean(deviceId),
    refreshKey,
    pollMs: 20000
  });
};

export const useLatest = (deviceId, overviewLatest) => {
  const { latestByDevice } = useLive();
  const live = latestByDevice[deviceId];
  if (!live) return overviewLatest || null;
  if (!overviewLatest) return live;
  return Date.parse(live.timestamp) >= Date.parse(overviewLatest.timestamp) ? live : overviewLatest;
};

export const useSeries = (deviceId, rangeKey) => {
  const { ticks } = useLive();
  const range = RANGES.find((item) => item.key === rangeKey) || RANGES[2];

  return useFetch(
    () => {
      const to = new Date();
      const from = new Date(to.getTime() - range.ms);
      return fetchSeries(deviceId, { from: from.toISOString(), to: to.toISOString(), points: 240 });
    },
    `${deviceId}:${rangeKey}`,
    { enabled: Boolean(deviceId), pollMs: 15000, refreshKey: ticks.alerts }
  );
};

export const useReadings = (deviceId, limit = 5) => {
  const refreshKey = useLiveRefresh();
  return useFetch(
    async () => (await fetchReadings(deviceId, { limit, sort: 'desc' })).data,
    `${deviceId}:${limit}`,
    { enabled: Boolean(deviceId), refreshKey }
  );
};