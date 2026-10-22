import { BatteryFull, BatteryLow, Droplets, MapPin, Plug, Thermometer } from 'lucide-react';
import StatCard from '../ui/StatCard.jsx';
import { LOW_BATTERY_UI, SITE_AREA, SITE_SHORT } from '../../utils/constants.js';
import { formatCoordinate, formatNumber } from '../../utils/format.js';

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
  const atSite = status === 'manual';
  const locationValue = status === 'current' ? 'GPS Fix' : atSite ? SITE_SHORT : status === 'last_known' ? 'Last Known' : 'Unknown';
  const locationLabel =
    status === 'current' ? 'Live Location' : atSite ? 'Location' : status === 'last_known' ? 'Last known location' : 'Location unknown';
  const locationSub = atSite
    ? SITE_AREA
    : status === 'none'
      ? 'No position received'
      : `${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)}`;

  const batteryPct = latest ? latest.batteryPct : null;
  const batteryVoltage = latest ? latest.batteryVoltage : null;
  const hasBattery = hasValue(batteryPct);
  const batteryLow = hasBattery && batteryPct <= LOW_BATTERY_UI;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        tone="red"
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
        valueClass={atSite ? 'text-xl' : 'text-3xl'}
        label={locationLabel}
        sub={locationSub}
        subClass={status === 'current' ? 'text-purple-700' : 'text-slate-500'}
        ok={status === 'current' || atSite ? true : latest ? false : null}
      />
      {hasBattery ? (
        <StatCard
          tone={batteryLow ? 'amber' : 'green'}
          icon={batteryLow ? BatteryLow : BatteryFull}
          value={formatNumber(batteryPct, 0)}
          unit="%"
          label="Battery Level (est.)"
          sub={hasValue(batteryVoltage) ? `(${formatNumber(batteryVoltage, 2)} V)` : ''}
          subClass="text-green-700"
          ok={!batteryLow}
        />
      ) : (
        <StatCard
          tone="green"
          icon={Plug}
          value="USB powered"
          valueClass="text-xl"
          label="Power"
          sub="Running on USB supply"
          subClass="text-green-700"
          ok={latest ? true : null}
        />
      )}
    </div>
  );
}