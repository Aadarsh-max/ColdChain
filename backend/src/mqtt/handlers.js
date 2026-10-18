import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { deviceIdSchema, statusSchema } from '../validators/telemetry.schema.js';
import { deviceEventSchema } from '../validators/deviceEvent.schema.js';
import { ingestTelemetry } from '../services/telemetryService.js';
import { applyDeviceStatus } from '../services/deviceService.js';
import { resolveConnectivityAlerts } from '../services/alertEngine.js';
import { publishAck } from './publisher.js';
import { bus, BUS_EVENTS } from '../utils/events.js';

const MAX_PAYLOAD_BYTES = 8192;
const ACKABLE_REJECTIONS = new Set(['invalid_payload', 'timestamp_in_future', 'timestamp_too_old']);

const parseJson = (buffer) => {
  try {
    return { ok: true, value: JSON.parse(buffer.toString('utf8')) };
  } catch {
    return { ok: false };
  }
};

const handleTelemetry = async (deviceId, payload) => {
  const result = await ingestTelemetry({ payload, topicDeviceId: deviceId });

  if (result.status === 'stored' || result.status === 'duplicate') {
    logger.debug(`Telemetry ${result.status}: ${deviceId} ${result.recordId}`);
    await publishAck(deviceId, { recordId: result.recordId, status: result.status });
    return;
  }

  logger.warn(`Telemetry rejected for ${deviceId}: ${result.reason}`, { details: result.details });

  if (result.recordId && ACKABLE_REJECTIONS.has(result.reason)) {
    await publishAck(deviceId, { recordId: result.recordId, status: 'rejected', reason: result.reason });
  }
};

const handleStatus = async (deviceId, payload) => {
  const parsed = statusSchema.safeParse(payload);
  if (!parsed.success || parsed.data.deviceId !== deviceId) {
    logger.warn(`Invalid status payload from ${deviceId}`);
    return;
  }
  const receivedAt = new Date();
  await applyDeviceStatus(parsed.data, receivedAt);
  if (parsed.data.online) {
    await resolveConnectivityAlerts(deviceId, receivedAt);
  }
};

const handleEvent = async (deviceId, payload) => {
  const parsed = deviceEventSchema.safeParse(payload);
  if (!parsed.success || parsed.data.deviceId !== deviceId) {
    logger.warn(`Invalid event payload from ${deviceId}`);
    return;
  }
  logger.info(`Device event ${deviceId}: ${parsed.data.event}${parsed.data.detail ? ` - ${parsed.data.detail}` : ''}`);
  bus.emit(BUS_EVENTS.DEVICE_EVENT, { ...parsed.data, receivedAt: new Date() });
};

export const handleMessage = async (topic, buffer) => {
  if (buffer.length > MAX_PAYLOAD_BYTES) {
    logger.warn(`Dropped oversized MQTT payload on ${topic} (${buffer.length} bytes)`);
    return;
  }

  const parts = topic.split('/');
  if (parts.length !== 3 || parts[0] !== env.MQTT_TOPIC_PREFIX) return;

  const [, deviceId, channel] = parts;
  if (!deviceIdSchema.safeParse(deviceId).success) {
    logger.warn(`Dropped message with invalid device id in topic: ${topic}`);
    return;
  }

  const parsed = parseJson(buffer);
  if (!parsed.ok) {
    logger.warn(`Malformed JSON on ${topic}`);
    return;
  }

  if (channel === 'telemetry') return handleTelemetry(deviceId, parsed.value);
  if (channel === 'status') return handleStatus(deviceId, parsed.value);
  if (channel === 'events') return handleEvent(deviceId, parsed.value);
};