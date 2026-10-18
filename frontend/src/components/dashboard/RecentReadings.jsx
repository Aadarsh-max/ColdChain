import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { formatNumber, formatTime } from '../../utils/format.js';

export default function RecentReadings({ readings, loading }) {
  const link = (
    <Link to="/reports" className="text-sm font-semibold text-blue-600 hover:underline">
      View All
    </Link>
  );

  return (
    <Card title="Recent Readings" icon={Clock} action={link}>
      {!readings && loading && <EmptyState title="Loading readings..." />}
      {readings && readings.length === 0 && <EmptyState title="No readings yet" />}
      {readings && readings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Temp (°C)</th>
                <th className="px-3 py-2">Humidity (%)</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((row) => (
                <tr key={row.recordId} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {formatTime(row.timestamp)}
                    {row.dataSource === 'synchronized' && (
                      <Badge tone="blue" className="ml-1.5 !px-1.5 !py-0 text-[10px]">
                        sync
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{formatNumber(row.temperatureC, 1)}</td>
                  <td className="px-3 py-2 text-slate-700">{formatNumber(row.humidityPct, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}