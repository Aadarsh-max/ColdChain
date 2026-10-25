import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, CheckCheck, ChevronDown, ChevronRight, X } from 'lucide-react';
import { errorMessage } from '../api/client.js';
import { acknowledgeAlert } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLive } from '../context/LiveDataContext.jsx';
import { useAlertList } from '../hooks/useAlerts.js';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import DownloadButton from '../components/ui/DownloadButton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { ALERT_ICONS, ALERT_LABELS, alertValue } from '../utils/alertMeta.js';
import { durationText, formatDateTime, secondsSince } from '../utils/format.js';
import { cleanParams } from '../utils/params.js';

const EMPTY_FILTERS = { deviceId: '', severity: '', type: '', status: '', acknowledged: '', from: '', to: '' };

const SEVERITY_TONE = { critical: 'red', warning: 'amber', info: 'blue' };

const startOfDay = (value) => (value ? new Date(`${value}T00:00:00`).toISOString() : '');
const endOfDay = (value) => (value ? new Date(`${value}T23:59:59.999`).toISOString() : '');

const durationOf = (alert) => {
  if (alert.type === 'shock_detected') return '--';
  if (alert.status === 'active') return durationText(secondsSince(alert.startedAt));
  return durationText(alert.durationSeconds);
};

function SummaryTile({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`text-3xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function AlertsPage() {
  const { devices } = useLive();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const shipmentId = searchParams.get('shipmentId') || '';

  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, deviceId: searchParams.get('deviceId') || '' }));
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [openId, setOpenId] = useState('');
  const [ackingId, setAckingId] = useState('');
  const [ackError, setAckError] = useState('');

  const params = useMemo(
    () =>
      cleanParams({
        page,
        limit: 15,
        shipmentId,
        deviceId: filters.deviceId,
        severity: filters.severity,
        type: filters.type,
        status: filters.status,
        acknowledged: filters.acknowledged,
        from: startOfDay(filters.from),
        to: endOfDay(filters.to)
      }),
    [filters, page, shipmentId]
  );

  const list = useAlertList(params, reload);
  const result = list.data;
  const rows = result ? result.data : null;

  const setFilter = (key) => (event) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.value }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSearchParams({});
  };

  const csvParams = useMemo(
    () =>
      cleanParams({
        shipmentId,
        deviceId: filters.deviceId,
        type: filters.type,
        from: startOfDay(filters.from),
        to: endOfDay(filters.to)
      }),
    [filters, shipmentId]
  );

  const acknowledge = async (alert) => {
    setAckingId(alert._id);
    setAckError('');
    try {
      await acknowledgeAlert(alert._id);
      setReload((value) => value + 1);
    } catch (err) {
      setAckError(errorMessage(err));
    } finally {
      setAckingId('');
    }
  };

  const action = <DownloadButton path="/reports/alerts.csv" params={csvParams} filename="alerts.csv" />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Alerts and Events</h1>
        <p className="text-slate-500">Temperature excursions, lid and shock events, and system warnings</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Active alerts" value={result ? result.summary.active : '--'} tone="text-slate-900" />
        <SummaryTile
          label="Active critical"
          value={result ? result.summary.activeCritical : '--'}
          tone="text-red-600"
        />
        <SummaryTile
          label="Unacknowledged"
          value={result ? result.summary.unacknowledged : '--'}
          tone="text-amber-600"
        />
      </div>

      <Card title="Filters">
        {shipmentId && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            Shipment {shipmentId}
            <button type="button" onClick={() => setSearchParams({})} aria-label="Remove shipment filter">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Device">
            <select className={inputClass} value={filters.deviceId} onChange={setFilter('deviceId')}>
              <option value="">All devices</option>
              {devices.map((item) => (
                <option key={item.deviceId} value={item.deviceId}>
                  {item.deviceId}
                  {item.isSimulated ? ' (demo)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Severity">
            <select className={inputClass} value={filters.severity} onChange={setFilter('severity')}>
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </Field>
          <Field label="Event type">
            <select className={inputClass} value={filters.type} onChange={setFilter('type')}>
              <option value="">All types</option>
              {Object.entries(ALERT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={filters.status} onChange={setFilter('status')}>
              <option value="">Active and resolved</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </Field>
          <Field label="Acknowledgement">
            <select className={inputClass} value={filters.acknowledged} onChange={setFilter('acknowledged')}>
              <option value="">Any</option>
              <option value="false">Unacknowledged</option>
              <option value="true">Acknowledged</option>
            </select>
          </Field>
          <Field label="From date">
            <input className={inputClass} type="date" value={filters.from} onChange={setFilter('from')} />
          </Field>
          <Field label="To date">
            <input className={inputClass} type="date" value={filters.to} onChange={setFilter('to')} />
          </Field>
          <div className="flex items-end">
            <Button variant="secondary" onClick={clearAll}>
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Alert history" icon={Bell} action={action}>
        {ackError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {ackError}
          </div>
        )}
        {!result && list.loading && <EmptyState title="Loading alerts..." />}
        {!result && !list.loading && list.error && (
          <EmptyState tone="red" title="Could not load alerts" text={list.error} />
        )}
        {rows && rows.length === 0 && (
          <EmptyState icon={Bell} title="No alerts match these filters" text="Try clearing the filters." />
        )}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="w-8 px-2 py-2" />
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Shipment</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((alert) => {
                  const Icon = ALERT_ICONS[alert.type] || Bell;
                  const open = openId === alert._id;
                  return (
                    <Fragment key={alert._id}>
                      <tr
                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                        onClick={() => setOpenId(open ? '' : alert._id)}
                      >
                        <td className="px-2 py-2.5 text-slate-400">
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge tone={SEVERITY_TONE[alert.severity] || 'slate'} dot className="capitalize">
                            {alert.severity}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2 font-semibold text-slate-900">
                            <Icon className="h-4 w-4 text-slate-500" />
                            {ALERT_LABELS[alert.type] || alert.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatDateTime(alert.startedAt)}</td>
                        <td className="px-3 py-2.5 text-slate-600">{durationOf(alert)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">
                          {alert.deviceId}
                          {alert.isSimulated && (
                            <Badge tone="amber" className="ml-1.5 !px-1.5 !py-0 text-[10px]">
                              demo
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{alert.shipmentId || '--'}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{alertValue(alert) || '--'}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={alert.status === 'active' ? 'red' : 'slate'} className="capitalize">
                            {alert.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {alert.acknowledged ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                              <CheckCheck className="h-4 w-4" /> Acknowledged
                            </span>
                          ) : !isAdmin ? (
                            <span className="text-xs text-slate-400">View only</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={ackingId === alert._id}
                              onClick={(event) => {
                                event.stopPropagation();
                                acknowledge(alert);
                              }}
                            >
                              {ackingId === alert._id ? 'Saving...' : 'Acknowledge'}
                            </Button>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <td />
                          <td colSpan={9} className="px-3 py-3 text-sm">
                            <p className="text-slate-700">{alert.description}</p>
                            <div className="mt-2 grid gap-x-8 gap-y-1 text-xs text-slate-500 sm:grid-cols-2">
                              <span>Ended: {alert.endedAt ? formatDateTime(alert.endedAt) : 'Still active'}</span>
                              <span>Related records: {alert.relatedRecordIds ? alert.relatedRecordIds.length : 0}</span>
                              {alert.thresholdValue !== null && alert.thresholdValue !== undefined && (
                                <span>Threshold: {alert.thresholdValue}</span>
                              )}
                              {alert.acknowledged && (
                                <span>
                                  Acknowledged by {alert.acknowledgedBy || 'unknown'} on{' '}
                                  {formatDateTime(alert.acknowledgedAt)}
                                </span>
                              )}
                            </div>
                            {alert.probableCauses && alert.probableCauses.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-semibold text-slate-600">
                                  Possible causes (not confirmed)
                                </div>
                                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
                                  {alert.probableCauses.map((cause) => (
                                    <li key={cause}>{cause}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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