import {
  Activity,
  Battery,
  DoorClosed,
  DoorOpen,
  Droplets,
  MapPin,
  Satellite,
  Thermometer,
  Wifi
} from 'lucide-react';
import { Cpu } from 'lucide-react';
import { useLive } from '../context/LiveDataContext.jsx';
import { useDeviceOverview, useLatest, useSelectedDevice } from '../hooks/useDevices.js';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import DemoBadge from '../components/ui/DemoBadge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import MetricTile from '../components/device/MetricTile.jsx';
import OledPanel from '../components/device/OledPanel.jsx';
import { SENSOR_LABELS, SENSOR_TONES } from '../utils/constants.js';
import { durationText, formatDateTime, formatNumber, secondsSince, timeAgo } from '../utils/format.js';

const magnitude = (accel) => {
  if (!accel) return null;
  const { x, y, z } = accel;
  if ([x, y, z].some((value) => typeof value !== 'number')) return null;
  return Math.sqrt(x * x + y * y + z * z);
};

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{children}</span>
    </div>
  );
}

export default function DevicesPage() {
  const { devicesLoaded } = useLive();
  const { devices, device, deviceId, setDeviceId } = useSelectedDevice();
  const overview = useDeviceOverview(deviceId);
  const data = overview.data;
  const latest = useLatest(deviceId, data ? data.latest : null);

  const isStale = data ? data.isStale : false;
  const sensors = latest && latest.sensors ? latest.sensors : {};
  const location = data ? data.location : null;
  const accelMagnitude = latest ? magnitude(latest.accel) : null;

  let motionValue = '--';
  let motionTone = 'neutral';
  if (latest && latest.shockDetected === true) {
    motionValue = 'Shock detected';
    motionTone = 'bad';
  } else if (latest && latest.motionDetected === true) {
    motionValue = 'Motion';
    motionTone = 'warn';
  } else if (latest && latest.motionDetected === false) {
    motionValue = 'Still';
    motionTone = 'ok';
  }

  const gpsStatus = location ? location.status : 'none';

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Devices</h1>
          <p className="text-slate-500">Live status, sensor health, and connectivity of each monitoring device</p>
        </div>
        {device && device.isSimulated && <DemoBadge />}
      </header>

      {devicesLoaded && devices.length === 0 && (
        <Card>
          <EmptyState icon={Cpu} title="No devices have reported yet" text="Start the simulator or power on the ESP32." />
        </Card>
      )}

      {devices.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {devices.map((item) => {
            const selected = item.deviceId === deviceId;
            const online = item.connectionStatus === 'online';
            return (
              <button
                key={item.deviceId}
                type="button"
                onClick={() => setDeviceId(item.deviceId)}
                className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-300 ${
                  selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-slate-900">{item.deviceId}</span>
                  <Badge tone={online ? 'green' : item.connectionStatus === 'offline' ? 'red' : 'slate'} dot>
                    {item.connectionStatus}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500">Last seen {timeAgo(secondsSince(item.lastSeenAt))}</div>
                {item.isSimulated && <DemoBadge className="mt-2" />}
              </button>
            );
          })}
        </div>
      )}

      {device && isStale && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No recent telemetry from {deviceId}. Values below are the last readings received, not live data.
        </div>
      )}

      {device && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <MetricTile
                icon={Thermometer}
                label="Product temperature"
                value={latest && latest.temperatureC !== null ? `${formatNumber(latest.temperatureC, 1)} °C` : '--'}
                sub={`DS18B20 · ${sensors.ds18b20 || 'unknown'}`}
                tone={sensors.ds18b20 === 'ok' ? 'ok' : latest ? 'bad' : 'neutral'}
              />
              <MetricTile
                icon={Droplets}
                label="Humidity"
                value={latest && latest.humidityPct !== null ? `${formatNumber(latest.humidityPct, 0)} %` : '--'}
                sub={`Ambient ${formatNumber(latest ? latest.ambientTemperatureC : null, 1)} °C · ${sensors.dht22 || 'unknown'}`}
                tone={sensors.dht22 === 'ok' ? 'ok' : latest ? 'bad' : 'neutral'}
              />
              <MetricTile
                icon={Battery}
                label="Battery (estimated)"
                value={latest && latest.batteryPct !== null ? `${formatNumber(latest.batteryPct, 0)} %` : '--'}
                sub={`${formatNumber(latest ? latest.batteryVoltage : null, 2)} V measured`}
                tone={latest && latest.batteryPct !== null && latest.batteryPct <= 20 ? 'warn' : 'ok'}
              />
              <MetricTile
                icon={MapPin}
                label="GPS status"
                value={gpsStatus === 'current' ? 'Fix' : gpsStatus === 'last_known' ? 'Last known' : 'No fix'}
                sub={location ? `${location.satellites || 0} satellites` : ''}
                tone={gpsStatus === 'current' ? 'ok' : 'warn'}
              />
              <MetricTile
                icon={latest && latest.lidOpen ? DoorOpen : DoorClosed}
                label="Lid"
                value={!latest || latest.lidOpen === null ? '--' : latest.lidOpen ? 'Open' : 'Closed'}
                tone={latest && latest.lidOpen ? 'warn' : latest ? 'ok' : 'neutral'}
              />
              <MetricTile
                icon={Activity}
                label="Motion / shock"
                value={motionValue}
                sub={accelMagnitude !== null ? `${formatNumber(accelMagnitude, 2)} g total` : 'No accelerometer data'}
                tone={motionTone}
              />
              <MetricTile
                icon={Wifi}
                label="Wi-Fi"
                value={latest && latest.network && latest.network.wifiConnected ? 'Connected' : 'Disconnected'}
                tone={latest && latest.network && latest.network.wifiConnected ? 'ok' : 'warn'}
              />
              <MetricTile
                icon={Satellite}
                label="MQTT"
                value={latest && latest.network && latest.network.mqttConnected ? 'Connected' : 'Disconnected'}
                tone={latest && latest.network && latest.network.mqttConnected ? 'ok' : 'warn'}
              />
            </div>

            <Card title="Sensor Health" icon={Cpu}>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.keys(SENSOR_LABELS).map((key) => {
                  const status = sensors[key] || 'unknown';
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-700">{SENSOR_LABELS[key]}</span>
                      <Badge tone={SENSOR_TONES[status] || 'slate'} dot>
                        {status.replace('_', ' ')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                A sensor that fails shows as an error with no value. The system never substitutes a made-up reading.
              </p>
            </Card>

            <Card title="Device Details" icon={Cpu}>
              <InfoRow label="Device ID">{device.deviceId}</InfoRow>
              <InfoRow label="Connection">
                <Badge tone={device.connectionStatus === 'online' ? 'green' : 'red'} dot>
                  {device.connectionStatus}
                </Badge>
              </InfoRow>
              <InfoRow label="Firmware">{device.firmwareVersion || '--'}</InfoRow>
              <InfoRow label="Hardware">{device.hardwareVersion || '--'}</InfoRow>
              <InfoRow label="Last seen">{formatDateTime(device.lastSeenAt)}</InfoRow>
              <InfoRow label="Last telemetry age">{data ? timeAgo(data.telemetryAgeSeconds) : '--'}</InfoRow>
              <InfoRow label="Latest record source">{latest ? latest.dataSource : '--'}</InfoRow>
              <InfoRow label="Offline queue">{data ? `${data.sync.queuedRecords} pending` : '--'}</InfoRow>
              <InfoRow label="Synchronized records">{data ? data.sync.synchronizedCount : '--'}</InfoRow>
              <InfoRow label="Last sync received">{data ? formatDateTime(data.sync.lastSynchronizedAt) : '--'}</InfoRow>
              <InfoRow label="Active alerts">
                {data
                  ? `${data.activeAlerts.total} (${data.activeAlerts.critical} critical, ${data.activeAlerts.warning} warning)`
                  : '--'}
              </InfoRow>
              <InfoRow label="Current shipment">{device.currentShipmentId || 'None'}</InfoRow>
              {gpsStatus === 'last_known' && location && (
                <InfoRow label="Last known position age">{durationText(location.ageSeconds)}</InfoRow>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <OledPanel deviceId={deviceId} latest={latest} />
          </div>
        </div>
      )}
    </div>
  );
}