export const ALERT_TYPES = [
  'temperature_high',
  'temperature_low',
  'excursion_duration',
  'sensor_failure',
  'lid_opened',
  'shock_detected',
  'low_battery',
  'device_offline',
  'stale_telemetry',
  'gps_unavailable'
];

export const SEVERITIES = ['info', 'warning', 'critical'];

export const ALERT_STATUSES = ['active', 'resolved'];

export const SENSOR_STATUSES = ['ok', 'error', 'stale', 'no_fix', 'not_found', 'disabled', 'unknown'];

export const SHIPMENT_STATUSES = ['planned', 'at_warehouse', 'in_transit', 'delivered', 'cancelled'];

export const DATA_SOURCES = ['live', 'synchronized'];

export const CONNECTION_STATUSES = ['online', 'offline', 'unknown'];