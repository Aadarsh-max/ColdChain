import { Printer } from 'lucide-react';
import { fetchShipmentSummary } from '../../api/endpoints.js';
import { useFetch } from '../../hooks/useFetch.js';
import { ALERT_LABELS, alertValue } from '../../utils/alertMeta.js';
import { SHIPMENT_STATUS } from '../../utils/constants.js';
import { durationText, formatDateTime, formatNumber } from '../../utils/format.js';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import DemoBadge from '../ui/DemoBadge.jsx';
import DownloadButton from '../ui/DownloadButton.jsx';
import EmptyState from '../ui/EmptyState.jsx';

const RISK_TONE = { low: 'green', moderate: 'amber', high: 'red', critical: 'red' };

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0">
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

export default function ShipmentReport({ shipmentId }) {
  const { data, loading, error } = useFetch(() => fetchShipmentSummary(shipmentId), `summary:${shipmentId}`, {
    enabled: Boolean(shipmentId)
  });

  if (!shipmentId) {
    return (
      <Card>
        <EmptyState title="Choose a shipment" text="Select a shipment above to build its summary report." />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        {loading ? (
          <EmptyState title="Building report..." />
        ) : (
          <EmptyState tone="red" title="Could not build the report" text={error} />
        )}
      </Card>
    );
  }

  const { shipment, stats, excursions, eventCounts, statusHistory, risk } = data;
  const status = SHIPMENT_STATUS[shipment.status] || { label: shipment.status, tone: 'slate' };
  const history = [...statusHistory].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-500">Use Print and choose Save as PDF to keep a copy.</p>
        <div className="flex flex-wrap gap-2">
          <DownloadButton
            path="/reports/readings.csv"
            params={{ shipmentId: shipment.shipmentId }}
            filename={`readings-${shipment.shipmentId}.csv`}
            label="Readings CSV"
          />
          <DownloadButton
            path="/reports/alerts.csv"
            params={{ shipmentId: shipment.shipmentId }}
            filename={`events-${shipment.shipmentId}.csv`}
            label="Events CSV"
          />
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print report
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Shipment summary: {shipment.shipmentId}</h2>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          {shipment.isSimulated && <DemoBadge />}
        </div>
        <p className="mt-1 text-xs text-slate-500">Generated {formatDateTime(data.generatedAt)}</p>
        <p className="mt-1 text-xs font-medium text-amber-700">{data.disclaimer}</p>

        <div className="mt-4 grid gap-x-10 sm:grid-cols-2">
          <div>
            <Row label="Product">{shipment.productName}</Row>
            <Row label="Category">{shipment.productCategory || '--'}</Row>
            <Row label="Tracking code">{shipment.trackingCode || '--'}</Row>
            <Row label="Device">{shipment.deviceId || '--'}</Row>
          </div>
          <div>
            <Row label="Route">
              {shipment.origin.name} → {shipment.destination.name}
            </Row>
            <Row label="Safe range">
              {shipment.minTempC} to {shipment.maxTempC} °C
            </Row>
            <Row label="Start">{formatDateTime(shipment.startTime)}</Row>
            <Row label="Expected arrival">{formatDateTime(shipment.expectedArrival)}</Row>
          </div>
        </div>
      </Card>

      <Card title="Temperature and data summary">
        {stats.count === 0 ? (
          <EmptyState title="No telemetry was linked to this shipment" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Readings" value={stats.count} />
            <Stat label="Monitored time" value={durationText(stats.monitoredSeconds)} />
            <Stat
              label="Min / Avg / Max (°C)"
              value={`${formatNumber(stats.minTempC)} / ${formatNumber(stats.avgTempC)} / ${formatNumber(stats.maxTempC)}`}
            />
            <Stat label="Time outside limits" value={durationText(stats.outsideSeconds)} />
            <Stat label="Time inside limits" value={stats.timeInRangePct === null ? '--' : `${stats.timeInRangePct} %`} />
            <Stat label="Synchronized records" value={stats.synchronizedCount} />
            <Stat label="Simulated records" value={stats.simulatedCount} />
            <Stat
              label="First to last reading"
              value={`${formatDateTime(stats.firstAt)} to ${formatDateTime(stats.lastAt)}`}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Time inside limits is estimated from excursion events, not from every individual reading.
        </p>
      </Card>

      <Card title="Excursions">
        {excursions.length === 0 ? (
          <EmptyState title="No temperature excursions recorded" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Ended</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Peak</th>
                </tr>
              </thead>
              <tbody>
                {excursions.map((item, index) => (
                  <tr key={`${item.type}-${item.startedAt}-${index}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-900">{ALERT_LABELS[item.type] || item.type}</td>
                    <td className="px-3 py-2 capitalize text-slate-700">{item.severity}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDateTime(item.startedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {item.endedAt ? formatDateTime(item.endedAt) : 'Still active'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{durationText(item.durationSeconds)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{alertValue(item) || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Event counts">
          {Object.keys(eventCounts).length === 0 ? (
            <EmptyState title="No events" />
          ) : (
            Object.entries(eventCounts).map(([type, count]) => (
              <Row key={type} label={ALERT_LABELS[type] || type}>
                {count}
              </Row>
            ))
          )}
        </Card>

        <Card title="Risk score">
          {risk ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-slate-900">
                  {risk.score}
                  <span className="text-base font-semibold text-slate-400"> / 100</span>
                </span>
                <Badge tone={RISK_TONE[risk.level] || 'slate'} className="capitalize">
                  {risk.level}
                </Badge>
              </div>
              <div className="mt-2">
                {risk.factors.map((factor) => (
                  <Row key={factor.key} label={factor.label}>
                    {factor.points} / {factor.weight}
                  </Row>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{risk.disclaimer}</p>
            </>
          ) : (
            <EmptyState title="No risk data" />
          )}
        </Card>
      </div>

      <Card title="Status history">
        <ol className="space-y-2">
          {history.map((item, index) => {
            const meta = SHIPMENT_STATUS[item.status] || { label: item.status };
            return (
              <li
                key={`${item.status}-${item.at}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="font-semibold text-slate-900">
                  {meta.label}
                  {(item.location || item.note) && (
                    <span className="ml-2 font-normal text-slate-500">
                      {[item.location, item.note].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500">{formatDateTime(item.at)}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}