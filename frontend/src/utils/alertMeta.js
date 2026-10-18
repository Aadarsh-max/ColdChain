import { Activity, BatteryLow, Clock, Cpu, DoorOpen, MapPin, Thermometer, WifiOff } from 'lucide-react';
import { durationText, formatNumber } from './format.js';

export const ALERT_LABELS = {
  temperature_high: 'Temperature High',
  temperature_low: 'Temperature Low',
  excursion_duration: 'Long Excursion',
  sensor_failure: 'Sensor Failure',
  lid_opened: 'Door Opened',
  shock_detected: 'High Impact Detected',
  low_battery: 'Low Battery',
  device_offline: 'Device Offline',
  stale_telemetry: 'Stale Telemetry',
  gps_unavailable: 'GPS Unavailable'
};

export const ALERT_ICONS = {
  temperature_high: Thermometer,
  temperature_low: Thermometer,
  excursion_duration: Clock,
  sensor_failure: Cpu,
  lid_opened: DoorOpen,
  shock_detected: Activity,
  low_battery: BatteryLow,
  device_offline: WifiOff,
  stale_telemetry: Clock,
  gps_unavailable: MapPin
};

export const SEVERITY_STYLES = {
  critical: { box: 'border-red-200 bg-red-50', icon: 'bg-red-100 text-red-600', title: 'text-red-600' },
  warning: { box: 'border-orange-200 bg-orange-50', icon: 'bg-orange-100 text-orange-600', title: 'text-orange-600' },
  info: { box: 'border-sky-200 bg-sky-50', icon: 'bg-sky-100 text-sky-600', title: 'text-sky-600' }
};

export const alertValue = (alert) => {
  switch (alert.type) {
    case 'temperature_high':
      return alert.peakValue === null || alert.peakValue === undefined ? '' : `${formatNumber(alert.peakValue, 1)} °C`;
    case 'temperature_low':
      return alert.lowestValue === null || alert.lowestValue === undefined ? '' : `${formatNumber(alert.lowestValue, 1)} °C`;
    case 'shock_detected':
      return alert.peakValue === null || alert.peakValue === undefined ? '' : `${formatNumber(alert.peakValue, 1)} g`;
    case 'lid_opened':
      return alert.durationSeconds > 0 ? durationText(alert.durationSeconds) : alert.status === 'active' ? 'Open' : '';
    case 'excursion_duration':
      return alert.peakValue === null || alert.peakValue === undefined ? '' : `${alert.peakValue} min`;
    case 'low_battery':
      return alert.lowestValue === null || alert.lowestValue === undefined ? '' : `${alert.lowestValue}%`;
    default:
      return '';
  }
};