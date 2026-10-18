import { EventEmitter } from 'events';

export const bus = new EventEmitter();
bus.setMaxListeners(50);

export const BUS_EVENTS = Object.freeze({
  TELEMETRY: 'telemetry:new',
  ALERT_OPENED: 'alert:opened',
  ALERT_UPDATED: 'alert:updated',
  ALERT_CLOSED: 'alert:closed',
  DEVICE_STATUS: 'device:status',
  DEVICE_EVENT: 'device:event'
});