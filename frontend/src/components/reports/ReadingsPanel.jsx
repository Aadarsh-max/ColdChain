import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { fetchReadings } from '../../api/endpoints.js';
import { useDeviceOverview } from '../../hooks/useDevices.js';
import { useFetch } from '../../hooks/useFetch.js';
import { cleanParams } from '../../utils/params.js';
import { durationText, formatDateTime, formatNumber } from '../../utils/format.js';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import DownloadButton from '../ui/DownloadButton.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Field, { inputClass } from '../ui/Field.jsx';
import Pagination from '../ui/Pagination.jsx';

const startOfDay = (value) => (value ? new Date(`${value}T00:00:00`).toISOString() : '');
const endOfDay = (value) => (value ? new Date(`${value}T23:59:59.999`).toISOString() : '');

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function ReadingsPanel({ deviceId, mode }) {
  const isSync = mode === 'sync';
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const overview = useDeviceOverview(isSync ? deviceId : '');

  const filterParams = useMemo(
    () =>
      cleanParams({
        dataSource: isSync ? 'synchronized' : source,
        from: startOfDay(from),
        to: endOfDay(to)
      }),
    [isSync, source, from, to]
  );

  const params = useMemo(() => ({ ...filterParams, page, limit: 20, sort: 'desc' }), [filterParams, page]);

  const list = useFetch(() => fetchReadings(deviceId, params), `${deviceId}:${JSON.stringify(params)}`, {
    enabled: Boolean(deviceId)
  });

  const result = list.data;
  const rows = result ? result.data : null;

  const csvParams = useMemo(() => ({ deviceId, ...filterParams }), [deviceId, filterParams]);

  const change = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const sync = overview.data ? overview.data.sync : null;

  const csvLink = (
    <DownloadButton path="/reports/readings.csv" params={csvParams} filename={`readings-${deviceId}.csv`} />
  );

  return (
    <div className="space-y-5">
      {isSync && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Records still queued on device" value={sync ? sync.queuedRecords : '--'} />
          <Stat label="Synchronized records stored" value={sync ? sync.synchronizedCount : '--'} />
          <Stat label="Last synchronized upload received" value={sync ? formatDateTime(sync.lastSynchronizedAt) : '--'} />
        </div>
      )}

      <Card title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {!isSync && (
            <Field label="Data source">
              <select className={inputClass} value={source} onChange={change(setSource)}>
                <option value="">Live and synchronized</option>
                <option value="live">Live only</option>
                <option value="synchronized">Synchronized (offline) only</option>
              </select>
            </Field>
          )}
          <Field label="From date">
            <input className={inputClass} type="date" value={from} onChange={change(setFrom)} />
          </Field>
          <Field label="To date">
            <input className={inputClass} type="date" value={to} onChange={change(setTo)} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-slate-500">CSV export is limited to a 90 day range and 200,000 rows.</p>
      </Card>

      <Card title={isSync ? 'Offline synchronization records' : 'Historical readings'} icon={History} action={csvLink}>
        {!result && list.loading && <EmptyState title="Loading readings..." />}
        {!result && !list.loading && list.error && (
          <EmptyState tone="red" title="Could not load readings" text={list.error} />
        )}
        {rows && rows.length === 0 && (
          <EmptyState
            title={isSync ? 'No synchronized records' : 'No readings match these filters'}
            text={isSync ? 'Records uploaded after a connection outage appear here.' : undefined}
          />
        )}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2">Original time</th>
                  <th className="px-3 py-2">Received at</th>
                  {isSync && <th className="px-3 py-2">Upload delay</th>}
                  <th className="px-3 py-2">Temp (°C)</th>
                  <th className="px-3 py-2">Humidity (%)</th>
                  <th className="px-3 py-2">Battery (est.)</th>
                  <th className="px-3 py-2">Lid</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Record ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const delay = (Date.parse(row.receivedAt) - Date.parse(row.timestamp)) / 1000;
                  return (
                    <tr key={row.recordId} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                        {formatDateTime(row.timestamp)}
                        {row.timeValid === false && (
                          <Badge tone="amber" className="ml-1.5 !px-1.5 !py-0 text-[10px]">
                            no clock
                          </Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDateTime(row.receivedAt)}</td>
                      {isSync && <td className="px-3 py-2 text-slate-600">{durationText(delay)}</td>}
                      <td className="px-3 py-2 font-medium text-slate-900">{formatNumber(row.temperatureC, 1)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatNumber(row.humidityPct, 0)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.batteryPct === null || row.batteryPct === undefined ? 'USB' : `${row.batteryPct}%`}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.lidOpen === null ? '--' : row.lidOpen ? 'Open' : 'Closed'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={row.dataSource === 'synchronized' ? 'blue' : 'slate'}>{row.dataSource}</Badge>
                        {row.isSimulated && (
                          <Badge tone="amber" className="ml-1 !px-1.5 !py-0 text-[10px]">
                            demo
                          </Badge>
                        )}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2 font-mono text-xs text-slate-500" title={row.recordId}>
                        {row.recordId}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {result && <Pagination meta={result.meta} onPage={setPage} />}
      </Card>
    </div>
  );
}