import { AlertTriangle, Box, CheckCircle2, DoorClosed, DoorOpen, Droplets, Thermometer } from 'lucide-react';
import { Cpu } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { formatNumber, formatTime } from '../../utils/format.js';

function Tile({ icon: Icon, value, label, ok, tone = 'text-blue-600' }) {
  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      {ok !== null && (
        <span className="absolute right-2 top-2">
          {ok ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </span>
      )}
      <Icon className={`h-9 w-9 shrink-0 ${tone}`} strokeWidth={1.6} />
      <div className="min-w-0">
        <div className="truncate text-lg font-bold text-slate-900">{value}</div>
        <div className="truncate text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

const sensorOk = (latest, key) => (latest ? latest.sensors && latest.sensors[key] === 'ok' : null);

export default function SensorReadings({ latest, stale }) {
  const accel = latest && latest.accel ? latest.accel : null;
  const mpuOk = sensorOk(latest, 'mpu6050');
  const axis = (value) => (accel && value !== null && value !== undefined ? `${formatNumber(value, 1)} g` : '--');

  let doorValue = '--';
  let doorIcon = DoorClosed;
  if (latest && latest.lidOpen === true) {
    doorValue = 'Open';
    doorIcon = DoorOpen;
  } else if (latest && latest.lidOpen === false) {
    doorValue = 'Closed';
  }

  const updated = (
    <span className={`text-xs ${stale ? 'font-semibold text-amber-600' : 'text-slate-500'}`}>
      {stale ? 'Stale · ' : ''}Last Updated: {latest ? formatTime(latest.timestamp, true) : '--'}
    </span>
  );

  return (
    <Card title="Sensor Readings" icon={Cpu} action={updated}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          icon={Thermometer}
          value={latest && latest.temperatureC !== null ? `${formatNumber(latest.temperatureC, 1)} °C` : '--'}
          label="Temperature"
          ok={sensorOk(latest, 'ds18b20')}
          tone="text-red-500"
        />
        <Tile
          icon={Droplets}
          value={latest && latest.humidityPct !== null ? `${formatNumber(latest.humidityPct, 0)} %` : '--'}
          label="Humidity"
          ok={sensorOk(latest, 'dht22')}
        />
        <Tile icon={Box} value={axis(accel && accel.x)} label="Motion (X)" ok={mpuOk} />
        <Tile icon={Box} value={axis(accel && accel.y)} label="Motion (Y)" ok={mpuOk} />
        <Tile icon={Box} value={axis(accel && accel.z)} label="Motion (Z)" ok={mpuOk} />
        <Tile
          icon={doorIcon}
          value={doorValue}
          label="Door Status"
          ok={latest ? latest.lidOpen !== null && latest.lidOpen !== undefined : null}
          tone="text-slate-700"
        />
      </div>
    </Card>
  );
}