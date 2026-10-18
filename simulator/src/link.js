import mqtt from 'mqtt';

export const createLink = ({
  url,
  username = '',
  password = '',
  prefix,
  deviceId,
  ackTimeoutMs,
  firmwareVersion = 'sim-1.0.0',
  onAck = () => {},
  onLog = () => {}
}) => {
  const topics = {
    telemetry: `${prefix}/${deviceId}/telemetry`,
    status: `${prefix}/${deviceId}/status`,
    ack: `${prefix}/${deviceId}/ack`
  };

  const pending = new Map();
  const stats = {
    created: 0,
    transmissions: 0,
    resends: 0,
    duplicateCopies: 0,
    stored: 0,
    duplicate: 0,
    rejected: 0
  };

  let offline = false;
  let client = null;
  let wasConnected = false;

  const statusPayload = (online) => ({
    deviceId,
    online,
    timestamp: new Date().toISOString(),
    firmwareVersion,
    hardwareVersion: 'SIM',
    queuedRecords: pending.size,
    isSimulated: true
  });

  const handleMessage = (topic, buffer) => {
    let ack;
    try {
      ack = JSON.parse(buffer.toString('utf8'));
    } catch {
      return;
    }
    if (!ack || typeof ack.recordId !== 'string') return;

    if (ack.status === 'stored') stats.stored += 1;
    else if (ack.status === 'duplicate') stats.duplicate += 1;
    else if (ack.status === 'rejected') stats.rejected += 1;
    else return;

    pending.delete(ack.recordId);
    onAck(ack);
  };

  const connect = () =>
    new Promise((resolve, reject) => {
      const options = {
        clientId: `ccg-sim-${deviceId}-${Date.now().toString(36)}`,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 8000,
        keepalive: 30,
        will: {
          topic: topics.status,
          payload: JSON.stringify({ deviceId, online: false, isSimulated: true }),
          qos: 1,
          retain: false
        }
      };
      if (username) {
        options.username = username;
        options.password = password;
      }

      client = mqtt.connect(url, options);

      const timer = setTimeout(() => {
        client.end(true);
        reject(new Error(`Could not connect to ${url}`));
      }, 10000);

      client.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      client.on('connect', () => {
        wasConnected = true;
        client.subscribe(topics.ack, { qos: 1 });
      });

      client.on('message', handleMessage);

      client.on('close', () => {
        if (wasConnected) {
          wasConnected = false;
          onLog('Broker connection lost, reconnecting');
        }
      });

      client.on('error', (err) => onLog(`MQTT error: ${err.message}`));
    });

  const transmit = (entry) => {
    if (offline || !client || !client.connected) return false;

    const synchronized = entry.backlog || entry.attempts > 0;
    const payload = JSON.stringify({
      ...entry.record,
      queuedRecords: Math.max(0, pending.size - 1),
      dataSource: synchronized ? 'synchronized' : 'live'
    });

    client.publish(topics.telemetry, payload, { qos: 1 });
    entry.lastSentAt = Date.now();
    entry.attempts += 1;
    stats.transmissions += 1;
    if (entry.attempts > 1) stats.resends += 1;

    if (entry.duplicate && entry.attempts === 1) {
      client.publish(topics.telemetry, payload, { qos: 1 });
      stats.duplicateCopies += 1;
    }
    return true;
  };

  const enqueue = (record, { duplicate = false } = {}) => {
    const entry = {
      record: offline
        ? { ...record, network: { wifiConnected: false, mqttConnected: false } }
        : record,
      backlog: offline,
      duplicate,
      attempts: 0,
      lastSentAt: 0
    };
    pending.set(record.recordId, entry);
    stats.created += 1;
  };

  const flush = ({ maxBatch = 200 } = {}) => {
    const now = Date.now();
    let sent = 0;
    for (const entry of pending.values()) {
      if (sent >= maxBatch) break;
      const due = entry.lastSentAt === 0 || now - entry.lastSentAt >= ackTimeoutMs;
      if (!due) continue;
      if (!transmit(entry)) break;
      sent += 1;
    }
    return sent;
  };

  const drain = async (timeoutMs, shouldStop = () => false, onProgress = null) => {
    const deadline = Date.now() + timeoutMs;
    let lastReport = 0;
    while (pending.size > 0 && Date.now() < deadline && !shouldStop()) {
      flush();
      if (onProgress && Date.now() - lastReport >= 2000) {
        onProgress(pending.size);
        lastReport = Date.now();
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return pending.size;
  };

  const publishStatus = (online) =>
    new Promise((resolve) => {
      if (!client || !client.connected) return resolve(false);
      client.publish(topics.status, JSON.stringify(statusPayload(online)), { qos: 1 }, (err) =>
        resolve(!err)
      );
    });

  const close = () =>
    new Promise((resolve) => {
      if (!client) return resolve();
      client.end(false, {}, () => resolve());
    });

  return {
    stats,
    connect,
    enqueue,
    flush,
    drain,
    publishStatus,
    close,
    setOffline: (value) => {
      offline = Boolean(value);
    },
    isOffline: () => offline,
    pendingCount: () => pending.size
  };
};