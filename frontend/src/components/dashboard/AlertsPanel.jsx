import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { ALERT_ICONS, ALERT_LABELS, SEVERITY_STYLES, alertValue } from '../../utils/alertMeta.js';
import { formatDateTime } from '../../utils/format.js';

export default function AlertsPanel({ alerts, loading, error }) {
  const link = (
    <Link to="/alerts" className="text-sm font-semibold text-blue-600 hover:underline">
      View All
    </Link>
  );

  return (
    <Card title="Alerts" icon={Bell} action={link}>
      {!alerts && loading && <EmptyState title="Loading alerts..." />}
      {!alerts && !loading && error && <EmptyState tone="red" title="Could not load alerts" text={error} />}
      {alerts && alerts.length === 0 && <EmptyState title="No alerts" text="Everything looks normal for this device." />}
      {alerts && alerts.length > 0 && (
        <ul className="space-y-3">
          {alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
            const Icon = ALERT_ICONS[alert.type] || Bell;
            const value = alertValue(alert);

            return (
              <li key={alert._id} className={`flex gap-3 rounded-xl border p-3 ${style.box}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-bold ${style.title}`}>{ALERT_LABELS[alert.type] || alert.type}</span>
                    {value && <span className={`shrink-0 text-sm font-bold ${style.title}`}>{value}</span>}
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(alert.startedAt)}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{alert.description}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <span className="capitalize">{alert.status}</span>
                    {alert.acknowledged && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCheck className="h-3 w-3" /> Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}