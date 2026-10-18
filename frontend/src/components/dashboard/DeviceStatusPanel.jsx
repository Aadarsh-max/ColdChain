import { AlertTriangle, CheckCircle2, HardDrive, MapPin, Server, Wifi } from 'lucide-react';
import { Satellite } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { secondsSince, timeAgo } from '../../utils/format.js';

function Row({ icon: Icon, label, status, ok }) {
  return (
    <li className="flex items-center gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <Icon className="h-5 w-5 shrink-0 text-blue-600" />
      <span className="flex-1 font-medium text-slate-700">{label}</span>
      {status && <span className={`text-xs font-semibold ${ok ? 'text-blue-600' : 'text-amber-600'}`}>{status}</span>}
      {ok ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
      )}
    </li>
  );
}

export default function DeviceStatusPanel({ latest, device }) {
  const wifi = latest ? latest.network && latest.network.wifiConnected : false;
  const mqtt = latest ? latest.network && latest.network.mqttConnected : false;
  const gps = latest && latest.sensors ? latest.sensors.gps : 'unknown';
  const queued = latest ? latest.queuedRecords || 0 : 0;
  const seen = device ? secondsSince(device.lastSeenAt) : null;

  return (
    <Card title="Device Status" icon={Satellite}>
      <ul>
        <Row icon={Wifi} label="Wi-Fi" status={wifi ? 'Connected' : 'Disconnected'} ok={Boolean(wifi)} />
        <Row icon={Server} label="MQTT Broker" status={mqtt ? 'Connected' : 'Disconnected'} ok={Boolean(mqtt)} />
        <Row
          icon={MapPin}
          label="GPS"
          status={gps === 'ok' ? `Fix (${latest.gpsSatellites} sats)` : gps === 'no_fix' ? 'No fix' : gps}
          ok={gps === 'ok'}
        />
        <Row
          icon={HardDrive}
          label="MicroSD Queue"
          status={queued === 0 ? 'Empty' : `${queued} pending`}
          ok={queued === 0}
        />
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">
        Reported by the device in its last reading. Device last seen {timeAgo(seen)}.
      </p>
    </Card>
  );
}