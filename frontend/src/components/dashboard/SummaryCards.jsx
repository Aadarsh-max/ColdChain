import { Droplets, MapPin, Thermometer } from 'lucide-react';
import { BatteryFull, BatteryLow } from 'lucide-react';
import StatCard from '../ui/StatCard.jsx';
import { LOW_BATTERY_UI } from '../../utils/constants.js';
import { durationText, formatCoordinate, formatNumber } from '../../utils/format.js';

const hasValue = (value) => value !== null && value !== undefined;

export default function SummaryCards({ latest, location, limits }) {
  const temperature = latest ? latest.temperatureC : null;
  const tempSensorOk = latest ? latest.sensors && latest.sensors.ds18b20 === 'ok' : false;
  const inRange = hasValue(temperature) && limits ? temperature >= limits.minTempC && temperature <= limits.maxTempC : null;

  let tempSub = 'No reading yet';
  let tempSubClass = 'text-slate-500';
  if (latest && !hasValue(temperature)) tempSub = 'Sensor unavailable';
  else if (hasValue(temperature) && limits) {
    tempSub = inRange ? `(${limits.minTempC}°C – ${limits.maxTempC}°C)` : `Outside ${limits.minTempC}°C – ${limits.maxTempC}°C`;
    tempSubClass = inRange ? 'text-green-600' : 'text-red-600';
  }

  const humidity = latest ? latest.humidityPct : null;
  const ambient = latest ? latest.ambientTemperatureC : null;
  const humiditySensorOk = latest ? latest.sensors && latest.sensors.dht22 === 'ok' : false;

  const status = location ? location.status : 'none';
  const locationValue = status === 'current' ? 'GPS Fix' : status === 'last_known' ? 'Last Known' : 'No Fix';
  const locationLabel = status === 'current' ? 'Live Location' : status === 'last_known' ? 'Location is not current' : 'Location unknown';
  const locationSub =
    status === 'none'
      ? 'No valid GPS position yet'
      : `${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)}`;

  const batteryPct = latest ? latest.batteryPct : null;
  const batteryVoltage = latest ? latest.batteryVoltage : null;
  const batteryLow = hasValue(batteryPct) && batteryPct <= LOW_BATTERY_UI;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        tone={inRange === false ? 'red' : 'red'}
        icon={Thermometer}
        value={formatNumber(temperature, 1)}
        unit={hasValue(temperature) ? '°C' : ''}
        label="Temperature"
        sub={tempSub}
        subClass={tempSubClass}
        ok={latest ? tempSensorOk && inRange !== false : null}
      />
      <StatCard
        tone="blue"
        icon={Droplets}
        value={formatNumber(humidity, 0)}
        unit={hasValue(humidity) ? '%' : ''}
        label="Humidity"
        sub={hasValue(ambient) ? `Ambient ${formatNumber(ambient, 1)} °C` : latest ? 'Sensor unavailable' : ''}
        subClass="text-sky-700"
        ok={latest ? humiditySensorOk : null}
      />
      <StatCard
        tone="purple"
        icon={MapPin}
        value={locationValue}
        label={locationLabel}
        sub={locationSub}
        subClass={status === 'current' ? 'text-purple-700' : 'text-slate-500'}
        ok={status === 'current' ? true : latest ? false : null}
      />
      <StatCard
        tone={batteryLow ? 'amber' : 'green'}
        icon={batteryLow ? BatteryLow : BatteryFull}
        value={formatNumber(batteryPct, 0)}
        unit={hasValue(batteryPct) ? '%' : ''}
        label="Battery Level (est.)"
        sub={hasValue(batteryVoltage) ? `(${formatNumber(batteryVoltage, 2)} V)` : ''}
        subClass="text-green-700"
        ok={latest ? hasValue(batteryPct) && !batteryLow : null}
      />
    </div>
  );
}

export { durationText };