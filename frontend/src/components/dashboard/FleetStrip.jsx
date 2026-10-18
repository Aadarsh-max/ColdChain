import { formatTime } from '../../utils/format.js';

export default function FleetStrip({ summary }) {
  if (!summary) return null;

  const { devices, shipments, alerts, risk, latestTelemetry } = summary;

  const items = [
    { label: 'Devices online', value: `${devices.online} / ${devices.total}` },
    { label: 'Active shipments', value: shipments.active },
    { label: 'Critical alerts', value: alerts.critical, tone: alerts.critical > 0 ? 'text-red-600' : '' },
    { label: 'Active excursions', value: alerts.activeExcursions, tone: alerts.activeExcursions > 0 ? 'text-red-600' : '' },
    { label: 'Highest risk', value: `${risk.maxScore} (${risk.maxLevel})` },
    { label: 'Latest telemetry', value: latestTelemetry ? formatTime(latestTelemetry.at, true) : '--' }
  ];

  return (
    <div className="grid grid-cols-2 divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <div className="text-xs font-medium text-slate-500">{item.label}</div>
          <div className={`text-lg font-bold capitalize text-slate-900 ${item.tone || ''}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}