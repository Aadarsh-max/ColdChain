import { useState } from 'react';
import { BarChart3, Clock, Unplug } from 'lucide-react';
import { useSelectedDevice, useSeries } from '../hooks/useDevices.js';
import Card from '../components/ui/Card.jsx';
import DemoBadge from '../components/ui/DemoBadge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Badge from '../components/ui/Badge.jsx';
import DeviceSelect from '../components/device/DeviceSelect.jsx';
import TemperatureChart from '../components/charts/TemperatureChart.jsx';
import HumidityChart from '../components/charts/HumidityChart.jsx';
import { ALERT_LABELS, alertValue } from '../utils/alertMeta.js';
import { durationText, formatDateTime, formatNumber, secondsSince } from '../utils/format.js';

const SEVERITY_TONE = { critical: 'red', warning: 'amber', info: 'blue' };

function Stat({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { devices, device, deviceId, setDeviceId } = useSelectedDevice();
  const [range, setRange] = useState('1D');
  const series = useSeries(deviceId, range);
  const data = series.data;
  const stats = data ? data.stats : null;
  const limits = data ? data.limits : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500">Temperature and humidity history, excursions, and data gaps</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {data && data.hasSimulated && <DemoBadge />}
          <DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} />
        </div>
      </header>

      {!device && (
        <Card>
          <EmptyState icon={BarChart3} title="No devices have reported yet" />
        </Card>
      )}

      {device && (
        <>
          {limits && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Safe range used: <strong>{limits.minTempC} to {limits.maxTempC} °C</strong>{' '}
              {limits.source === 'shipment' ? `(from shipment ${limits.shipmentId})` : '(default setting, no active shipment)'}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Stat label="Minimum (°C)" value={stats ? formatNumber(stats.minTempC) : '--'} />
            <Stat label="Maximum (°C)" value={stats ? formatNumber(stats.maxTempC) : '--'} />
            <Stat label="Average (°C)" value={stats ? formatNumber(stats.avgTempC) : '--'} />
            <Stat
              label="Time outside limits"
              value={stats ? durationText(stats.outsideSeconds) : '--'}
              tone={stats && stats.outsideSeconds > 0 ? 'text-red-600' : 'text-slate-900'}
            />
            <Stat label="Readings" value={stats ? stats.count : '--'} />
            <Stat
              label="Data gaps"
              value={data ? data.gaps.length : '--'}
              tone={data && data.gaps.length > 0 ? 'text-amber-600' : 'text-slate-900'}
            />
          </div>

          <TemperatureChart series={data} loading={series.loading} error={series.error} range={range} onRangeChange={setRange} />
          <HumidityChart series={data} loading={series.loading} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Excursion periods" icon={Clock}>
              {!data && <EmptyState title="Loading..." />}
              {data && data.excursions.length === 0 && <EmptyState title="No excursions in this range" />}
              {data && data.excursions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Started</th>
                        <th className="px-3 py-2">Duration</th>
                        <th className="px-3 py-2">Peak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.excursions.map((item) => (
                        <tr key={item._id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2">
                            <Badge tone={SEVERITY_TONE[item.severity] || 'slate'} className="mr-2 capitalize">
                              {item.severity}
                            </Badge>
                            <span className="font-semibold text-slate-900">{ALERT_LABELS[item.type] || item.type}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDateTime(item.startedAt)}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {item.status === 'active'
                              ? `${durationText(secondsSince(item.startedAt))} (active)`
                              : durationText(item.durationSeconds)}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{alertValue(item) || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Missing data" icon={Unplug}>
              {!data && <EmptyState title="Loading..." />}
              {data && data.gaps.length === 0 && (
                <EmptyState title="No gaps in this range" text="Telemetry arrived continuously." />
              )}
              {data && data.gaps.length > 0 && (
                <ul className="divide-y divide-slate-100 text-sm">
                  {data.gaps.map((gap) => (
                    <li key={gap.from} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-slate-600">
                        {formatDateTime(gap.from)} to {formatDateTime(gap.to)}
                      </span>
                      <span className="font-semibold text-amber-700">{durationText(gap.seconds)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Gaps are shown as grey bands on the charts. The line is never drawn across missing data. Offline
                records uploaded later fill a gap when they arrive.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}