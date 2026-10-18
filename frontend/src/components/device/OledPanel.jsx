import { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { formatNumber } from '../../utils/format.js';

const text = (value, digits = 1) => (value === null || value === undefined ? '--' : formatNumber(value, digits));

const buildPages = (deviceId, latest) => {
  if (!latest) {
    return [[deviceId || 'NO DEVICE', '', 'WAITING FOR DATA', '', '']];
  }

  const wifi = latest.network && latest.network.wifiConnected ? '+' : '-';
  const mqtt = latest.network && latest.network.mqttConnected ? '+' : '-';
  const sensors = latest.sensors || {};

  return [
    [
      `${deviceId}  W${wifi} M${mqtt}`,
      `TEMP ${text(latest.temperatureC)} C`,
      `HUM ${text(latest.humidityPct, 0)}%  AMB ${text(latest.ambientTemperatureC)}C`,
      latest.gpsFix ? `GPS ${latest.gpsSatellites} SATS` : 'GPS NO FIX',
      `BAT ${text(latest.batteryPct, 0)}%E ${text(latest.batteryVoltage, 2)}V`
    ],
    [
      `LID   ${latest.lidOpen === null ? '--' : latest.lidOpen ? 'OPEN' : 'CLOSED'}`,
      `SHOCK ${latest.shockDetected === null ? '--' : latest.shockDetected ? 'YES' : 'NO'}`,
      `QUEUE ${latest.queuedRecords || 0}`,
      `DS ${(sensors.ds18b20 || '--').toUpperCase()}  DHT ${(sensors.dht22 || '--').toUpperCase()}`,
      `MPU ${(sensors.mpu6050 || '--').toUpperCase()}  GPS ${(sensors.gps || '--').toUpperCase()}`
    ]
  ];
};

export default function OledPanel({ deviceId, latest }) {
  const [page, setPage] = useState(0);
  const pages = buildPages(deviceId, latest);

  useEffect(() => {
    const timer = setInterval(() => setPage((value) => value + 1), 4000);
    return () => clearInterval(timer);
  }, []);

  const lines = pages[page % pages.length];

  return (
    <Card title="OLED Status Panel" icon={Monitor}>
      <div className="rounded-xl bg-slate-900 p-3">
        <div className="aspect-[2/1] overflow-hidden rounded-md border border-slate-700 bg-black p-3 font-mono text-[13px] leading-6 text-cyan-300 sm:text-sm">
          {lines.map((line, index) => (
            <div key={index} className="truncate whitespace-pre">
              {line || ' '}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        On-screen approximation of the 0.96-inch SSD1306 display. The real layout is set in the firmware. Page{' '}
        {(page % pages.length) + 1} of {pages.length}. The percent sign followed by E means estimated.
      </p>
    </Card>
  );
}