export const RANGES = [
  { key: '1H', label: '1H', ms: 3600000 },
  { key: '6H', label: '6H', ms: 6 * 3600000 },
  { key: '1D', label: '1D', ms: 24 * 3600000 },
  { key: '7D', label: '7D', ms: 7 * 24 * 3600000 },
  { key: '30D', label: '30D', ms: 30 * 24 * 3600000 }
];

export const CURRENT_USER = { name: 'Aadarsh Shrivastav', role: 'Admin' };

export const LOW_BATTERY_UI = 20;

export const SHIPMENT_STATUS = {
  planned: { label: 'Planned', tone: 'slate' },
  at_warehouse: { label: 'At Warehouse', tone: 'blue' },
  in_transit: { label: 'In Transit', tone: 'green' },
  delivered: { label: 'Delivered', tone: 'purple' },
  cancelled: { label: 'Cancelled', tone: 'red' }
};

export const SENSOR_LABELS = {
  ds18b20: 'DS18B20 (product probe)',
  dht22: 'DHT22 (ambient, humidity)',
  mpu6050: 'MPU6050 (motion)',
  gps: 'NEO-6M (GPS)'
};

export const SENSOR_TONES = {
  ok: 'green',
  no_fix: 'amber',
  stale: 'amber',
  error: 'red',
  not_found: 'red',
  disabled: 'slate',
  unknown: 'slate'
};