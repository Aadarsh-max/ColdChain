import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ published: [], client: null }));

vi.mock('mqtt', async () => {
  const { EventEmitter } = await import('node:events');
  return {
    default: {
      connect: () => {
        const client = new EventEmitter();
        client.connected = true;
        client.publish = (topic, payload, options, callback) => {
          mocks.published.push({ topic, payload: JSON.parse(payload) });
          if (typeof callback === 'function') callback();
        };
        client.subscribe = () => {};
        client.end = (force, options, callback) => {
          if (typeof callback === 'function') callback();
        };
        mocks.client = client;
        setTimeout(() => client.emit('connect'), 0);
        return client;
      }
    }
  };
});

import { createLink } from '../src/link.js';

const TELEMETRY = 'coldchain/SIM-001/telemetry';

const rec = (recordId) => ({
  recordId,
  deviceId: 'SIM-001',
  network: { wifiConnected: true, mqttConnected: true },
  dataSource: 'live',
  queuedRecords: 0
});

const makeLink = async (overrides = {}) => {
  const link = createLink({
    url: 'mqtt://test',
    prefix: 'coldchain',
    deviceId: 'SIM-001',
    ackTimeoutMs: 60000,
    ...overrides
  });
  await link.connect();
  return link;
};

const sentTelemetry = () => mocks.published.filter((p) => p.topic === TELEMETRY);

const sendAck = (recordId, status) =>
  mocks.client.emit(
    'message',
    'coldchain/SIM-001/ack',
    Buffer.from(JSON.stringify({ recordId, status }))
  );

beforeEach(() => {
  mocks.published.length = 0;
});

describe('simulator link', () => {
  it('publishes pending records in order as live data', async () => {
    const link = await makeLink();
    link.enqueue(rec('a'));
    link.enqueue(rec('b'));
    expect(link.flush()).toBe(2);
    const sent = sentTelemetry();
    expect(sent.map((p) => p.payload.recordId)).toEqual(['a', 'b']);
    expect(sent[0].payload.dataSource).toBe('live');
    expect(sent[1].payload.queuedRecords).toBe(1);
  });

  it('removes records only when an ack arrives and counts the status', async () => {
    const link = await makeLink();
    link.enqueue(rec('a'));
    link.enqueue(rec('b'));
    link.flush();
    sendAck('a', 'stored');
    expect(link.pendingCount()).toBe(1);
    sendAck('b', 'duplicate');
    expect(link.pendingCount()).toBe(0);
    expect(link.stats.stored).toBe(1);
    expect(link.stats.duplicate).toBe(1);
  });

  it('treats a rejected ack as final and ignores unknown statuses', async () => {
    const link = await makeLink();
    link.enqueue(rec('a'));
    link.enqueue(rec('b'));
    link.flush();
    sendAck('a', 'rejected');
    sendAck('b', 'weird');
    expect(link.pendingCount()).toBe(1);
    expect(link.stats.rejected).toBe(1);
  });

  it('buffers while offline and uploads as synchronized with offline network flags', async () => {
    const link = await makeLink();
    link.setOffline(true);
    link.enqueue(rec('o1'));
    expect(link.flush()).toBe(0);
    expect(sentTelemetry()).toHaveLength(0);

    link.setOffline(false);
    expect(link.flush()).toBe(1);
    const sent = sentTelemetry()[0].payload;
    expect(sent.recordId).toBe('o1');
    expect(sent.dataSource).toBe('synchronized');
    expect(sent.network.wifiConnected).toBe(false);
  });

  it('resends unacknowledged records as synchronized', async () => {
    const link = await makeLink({ ackTimeoutMs: 0 });
    link.enqueue(rec('r1'));
    link.flush();
    link.flush();
    const sent = sentTelemetry();
    expect(sent).toHaveLength(2);
    expect(sent[0].payload.dataSource).toBe('live');
    expect(sent[1].payload.dataSource).toBe('synchronized');
    expect(link.stats.resends).toBe(1);
  });

  it('sends a second copy for duplicate records', async () => {
    const link = await makeLink();
    link.enqueue(rec('d1'), { duplicate: true });
    link.flush();
    expect(sentTelemetry()).toHaveLength(2);
    expect(link.stats.duplicateCopies).toBe(1);
  });

  it('publishes a simulated status message', async () => {
    const link = await makeLink();
    await link.publishStatus(true);
    const status = mocks.published.find((p) => p.topic === 'coldchain/SIM-001/status').payload;
    expect(status.online).toBe(true);
    expect(status.isSimulated).toBe(true);
    expect(status.deviceId).toBe('SIM-001');
  });
});