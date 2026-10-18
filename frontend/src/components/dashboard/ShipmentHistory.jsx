import { Link } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { SHIPMENT_STATUS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';

export default function ShipmentHistory({ history }) {
  const items = history ? [...history].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5) : [];

  const link = (
    <Link to="/shipments" className="text-sm font-semibold text-blue-600 hover:underline">
      View All
    </Link>
  );

  return (
    <Card title="Shipment History" icon={ListChecks} action={link}>
      {items.length === 0 && <EmptyState title="No shipment history" text="Status changes appear here." />}
      {items.length > 0 && (
        <ol className="space-y-3">
          {items.map((item, index) => {
            const status = SHIPMENT_STATUS[item.status] || { label: item.status };
            return (
              <li key={`${item.status}-${item.at}-${index}`} className="flex gap-3">
                <span
                  className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={`text-sm font-semibold ${index === 0 ? 'text-green-700' : 'text-slate-900'}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-slate-500">{formatDateTime(item.at)}</span>
                  </div>
                  {(item.location || item.note) && (
                    <div className="truncate text-xs text-slate-500">
                      {[item.location, item.note].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}