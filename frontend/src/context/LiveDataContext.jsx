import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { socket } from '../socket/socket.js';
import { fetchDevices, fetchSummary } from '../api/endpoints.js';

const LiveDataContext = createContext(null);

const STORAGE_KEY = 'ccg.selectedDevice';

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const writeStored = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
};

const createRunner = (task, gapMs) => {
  let last = 0;
  let timer = null;
  const run = () => {
    if (timer) return;
    const wait = Math.max(0, gapMs - (Date.now() - last));
    timer = setTimeout(async () => {
      timer = null;
      last = Date.now();
      await task();
    }, wait);
  };
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return { run, cancel };
};

export const LiveDataProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(false);
  const [devices, setDevices] = useState([]);
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [latestByDevice, setLatestByDevice] = useState({});
  const [ticks, setTicks] = useState({ telemetry: 0, alerts: 0, shipments: 0 });
  const [selectedDeviceId, setSelectedDeviceIdState] = useState(readStored);

  const setSelectedDeviceId = useCallback((id) => {
    setSelectedDeviceIdState(id);
    writeStored(id);
  }, []);

  useEffect(() => {
    const summaryRunner = createRunner(async () => {
      try {
        setSummary(await fetchSummary());
        setSummaryError(false);
      } catch {
        setSummaryError(true);
      }
    }, 4000);

    const devicesRunner = createRunner(async () => {
      try {
        setDevices(await fetchDevices());
      } catch {
        setSummaryError(true);
      } finally {
        setDevicesLoaded(true);
      }
    }, 4000);

    const bump = (key) => setTicks((prev) => ({ ...prev, [key]: prev[key] + 1 }));

    const refreshAll = () => {
      summaryRunner.run();
      devicesRunner.run();
    };

    const onConnect = () => {
      setConnected(true);
      refreshAll();
      bump('telemetry');
      bump('alerts');
      bump('shipments');
    };

    const onDisconnect = () => setConnected(false);

    const onTelemetry = (payload) => {
      if (!payload || !payload.deviceId) return;
      setLatestByDevice((prev) => {
        const current = prev[payload.deviceId];
        if (current && Date.parse(current.timestamp) > Date.parse(payload.timestamp)) return prev;
        return { ...prev, [payload.deviceId]: payload };
      });
      bump('telemetry');
      refreshAll();
    };

    const onAlert = () => {
      bump('alerts');
      summaryRunner.run();
    };

    const onDeviceStatus = () => {
      devicesRunner.run();
      summaryRunner.run();
    };

    const onShipment = () => {
      bump('shipments');
      refreshAll();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('telemetry:new', onTelemetry);
    socket.on('alert:opened', onAlert);
    socket.on('alert:updated', onAlert);
    socket.on('alert:closed', onAlert);
    socket.on('device:status', onDeviceStatus);
    socket.on('shipment:updated', onShipment);

    socket.connect();
    refreshAll();
    const poll = setInterval(refreshAll, 30000);

    return () => {
      clearInterval(poll);
      summaryRunner.cancel();
      devicesRunner.cancel();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('telemetry:new', onTelemetry);
      socket.off('alert:opened', onAlert);
      socket.off('alert:updated', onAlert);
      socket.off('alert:closed', onAlert);
      socket.off('device:status', onDeviceStatus);
      socket.off('shipment:updated', onShipment);
      socket.disconnect();
    };
  }, []);

  const value = useMemo(
    () => ({
      connected,
      summary,
      summaryError,
      devices,
      devicesLoaded,
      latestByDevice,
      ticks,
      selectedDeviceId,
      setSelectedDeviceId
    }),
    [connected, summary, summaryError, devices, devicesLoaded, latestByDevice, ticks, selectedDeviceId, setSelectedDeviceId]
  );

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
};

export const useLive = () => useContext(LiveDataContext);