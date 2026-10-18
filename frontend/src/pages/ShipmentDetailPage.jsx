import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, Clock, ListChecks, MapPin, Package, Pencil, ShieldAlert, Thermometer } from 'lucide-react';
import { updateShipment } from '../api/endpoints.js';
import { useLive } from '../context/LiveDataContext.jsx';
import { useShipmentDetail, useShipmentHistory, useShipmentReadings } from '../hooks/useShipments.js';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import DemoBadge from '../components/ui/DemoBadge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import RouteMini from '../components/map/RouteMini.jsx';
import ShipmentForm from '../components/shipments/ShipmentForm.jsx';
import { ALERT_LABELS, alertValue } from '../utils/alertMeta.js';
import { SHIPMENT_STATUS } from '../utils/constants.js';
import { durationText, formatDateTime, formatNumber, formatTime, secondsSince } from '../utils/format.js';

const RISK_TONE = { low: 'green', moderate: 'amber', high: 'red', critical: 'red' };
const BAR_TONE = { low: 'bg-green-500', moderate: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-red-600' };
const SEVERITY_TONE = { critical: 'red', warning: 'amber', info: 'blue' };

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{children}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function ShipmentDetailPage() {
  const { shipmentId } = useParams();
  const { devices } = useLive();
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(false);

  const detail = useShipmentDetail(shipmentId, reload);
  const history = useShipmentHistory(shipmentId);
  const readings = useShipmentReadings(shipmentId, 10);

  const save = async (body) => {
    await updateShipment(shipmentId, body);
    setEditing(false);
    setReload((value) => value + 1);
  };

  const data = detail.data;

  if (!data) {
    return (
      <div className="space-y-5">
        <Link to="/shipments" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
          <ArrowLeft className="h-4 w-4" /> All shipments
        </Link>
        <Card>
          {detail.loading ? (
            <EmptyState title="Loading shipment..." />
          ) : (
            <EmptyState tone="red" title="Could not load this shipment" text={detail.error} />
          )}
        </Card>
      </div>
    );
  }

  const { shipment, risk, activeAlerts, device } = data;
  const status = SHIPMENT_STATUS[shipment.status] || { label: shipment.status, tone: 'slate' };
  const stats = history.data ? history.data.stats : null;
  const route = history.data ? history.data.route : [];
  const alerts = history.data ? history.data.alerts : null;
  const lastPoint = route.length > 0 ? route[route.length - 1] : null;
  const timeline = [...shipment.history].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const rows = readings.data;

  return (
    <div className="space-y-5">
      <Link to="/shipments" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
        <ArrowLeft className="h-4 w-4" /> All shipments
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900">Shipment {shipment.shipmentId}</h1>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          {shipment.isSimulated && <DemoBadge />}
        </div>
        <div className="flex gap-2">
          <Link
            to={`/alerts?shipmentId=${encodeURIComponent(shipment.shipmentId)}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" /> Alerts ({activeAlerts} active)
          </Link>
          <Button onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Shipment details" icon={Package}>
          <Row label="Product">{shipment.productName}</Row>
          <Row label="Category">{shipment.productCategory || '--'}</Row>
          <Row label="Tracking code">{shipment.trackingCode || '--'}</Row>
          <Row label="Origin">{shipment.origin.name}</Row>
          <Row label="Destination">{shipment.destination.name}</Row>
          <Row label="Safe range">
            {shipment.minTempC} to {shipment.maxTempC} °C
          </Row>
          <Row label="Start time">{formatDateTime(shipment.startTime)}</Row>
          <Row label="Expected arrival">{formatDateTime(shipment.expectedArrival)}</Row>
          <Row label="Device">
            {device ? (
              <span className="flex items-center justify-end gap-2">
                {device.deviceId}
                <Badge tone={device.connectionStatus === 'online' ? 'green' : 'red'} dot>
                  {device.connectionStatus}
                </Badge>
              </span>
            ) : (
              'None assigned'
            )}
          </Row>
        </Card>

        <Card title="Risk score" icon={ShieldAlert}>
          {risk ? (
            <>
              <div className="flex items-end justify-between">
                <div className="text-4xl font-bold text-slate-900">
                  {risk.score}
                  <span className="text-lg font-semibold text-slate-400"> / 100</span>
                </div>
                <Badge tone={RISK_TONE[risk.level] || 'slate'} className="capitalize">
                  {risk.level}
                </Badge>
              </div>
              <ul className="mt-3 space-y-2.5">
                {risk.factors.map((factor) => (
                  <li key={factor.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{factor.label}</span>
                      <span className="text-slate-500">
                        {factor.points} / {factor.weight}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${BAR_TONE[risk.level] || 'bg-slate-400'}`}
                        style={{ width: `${Math.min(100, (factor.points / factor.weight) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{factor.detail}</div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-400">{risk.disclaimer}</p>
            </>
          ) : (
            <EmptyState title="No risk data yet" />
          )}
        </Card>
      </div>

      <Card title="Telemetry summary" icon={Thermometer}>
        {!stats && <EmptyState title="Loading summary..." />}
        {stats && stats.count === 0 && (
          <EmptyState title="No telemetry linked to this shipment yet" text="Telemetry is linked while the shipment is At Warehouse or In Transit." />
        )}
        {stats && stats.count > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Readings" value={stats.count} />
            <Stat
              label="Min / Avg / Max (°C)"
              value={`${formatNumber(stats.minTempC)} / ${formatNumber(stats.avgTempC)} / ${formatNumber(stats.maxTempC)}`}
            />
            <Stat label="Time outside limits" value={durationText(stats.outsideSeconds)} />
            <Stat label="Synchronized (offline) records" value={stats.synchronizedCount} />
            <Stat label="First reading" value={formatDateTime(stats.firstAt)} />
            <Stat label="Last reading" value={formatDateTime(stats.lastAt)} />
            <Stat label="Simulated records" value={stats.simulatedCount} />
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Route (valid GPS fixes only)" icon={MapPin}>
          <div className="h-[250px]">
            <RouteMini
              points={route}
              marker={lastPoint ? { latitude: lastPoint.latitude, longitude: lastPoint.longitude, status: 'last_known' } : null}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {route.length} GPS point{route.length === 1 ? '' : 's'}. The grey marker is the last recorded position, not
            necessarily the current one. The full map is in Phase 6B.
          </p>
        </Card>

        <Card title="Status history" icon={ListChecks}>
          <ol className="space-y-3">
            {timeline.map((item, index) => {
              const meta = SHIPMENT_STATUS[item.status] || { label: item.status };
              return (
                <li key={`${item.status}-${item.at}-${index}`} className="flex gap-3">
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-sm font-semibold text-slate-900">{meta.label}</span>
                      <span className="text-xs text-slate-500">{formatDateTime(item.at)}</span>
                    </div>
                    {(item.location || item.note) && (
                      <div className="text-xs text-slate-500">{[item.location, item.note].filter(Boolean).join(' · ')}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Alerts and events" icon={Bell}>
          {!alerts && <EmptyState title="Loading alerts..." />}
          {alerts && alerts.length === 0 && <EmptyState title="No alerts for this shipment" />}
          {alerts && alerts.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {alerts.slice(0, 8).map((alert) => (
                <li key={alert._id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={SEVERITY_TONE[alert.severity] || 'slate'} className="capitalize">
                        {alert.severity}
                      </Badge>
                      <span className="font-semibold text-slate-900">{ALERT_LABELS[alert.type] || alert.type}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(alert.startedAt)} · {alert.status}
                      {alert.status === 'active'
                        ? ` · ${durationText(secondsSince(alert.startedAt))}`
                        : alert.durationSeconds > 0
                          ? ` · ${durationText(alert.durationSeconds)}`
                          : ''}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-slate-700">{alertValue(alert)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent readings" icon={Clock}>
          {!rows && readings.loading && <EmptyState title="Loading readings..." />}
          {rows && rows.length === 0 && <EmptyState title="No readings yet" />}
          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Temp (°C)</th>
                    <th className="px-3 py-2">Humidity (%)</th>
                    <th className="px-3 py-2">Lid</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.recordId} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatTime(row.timestamp, true)}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{formatNumber(row.temperatureC, 1)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatNumber(row.humidityPct, 0)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.lidOpen === null ? '--' : row.lidOpen ? 'Open' : 'Closed'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={row.dataSource === 'synchronized' ? 'blue' : 'slate'}>{row.dataSource}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={editing} title={`Edit shipment ${shipment.shipmentId}`} onClose={() => setEditing(false)}>
        {editing && (
          <ShipmentForm shipment={shipment} devices={devices} onSubmit={save} onCancel={() => setEditing(false)} />
        )}
      </Modal>
    </div>
  );
}