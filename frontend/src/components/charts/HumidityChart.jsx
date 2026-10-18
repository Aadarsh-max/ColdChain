import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Droplets } from 'lucide-react';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { formatDateTime, formatNumber } from '../../utils/format.js';

const tickFormatter = (spanMs) => (value) => {
  const date = new Date(value);
  if (spanMs <= 36 * 3600000) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function HumidityChart({ series, loading }) {
  const prepared = useMemo(() => {
    if (!series) return null;
    const from = Date.parse(series.from);
    const to = Date.parse(series.to);

    const rows = series.points.map((point) => ({ t: Date.parse(point.t), h: point.humidityPct }));
    for (const gap of series.gaps) rows.push({ t: Date.parse(gap.from), h: null });
    rows.sort((a, b) => a.t - b.t);

    const gaps = series.gaps
      .map((gap, index) => ({
        id: index,
        x1: Math.max(Date.parse(gap.from), from),
        x2: Math.min(Date.parse(gap.to), to)
      }))
      .filter((gap) => gap.x2 > gap.x1);

    return { rows, from, to, gaps, hasValues: rows.some((row) => row.h !== null) };
  }, [series]);

  return (
    <Card title="Humidity" icon={Droplets}>
      <div className="h-[230px]">
        {!series && loading && <EmptyState title="Loading humidity data..." />}
        {prepared && !prepared.hasValues && (
          <EmptyState title="No humidity readings in this range" text="The DHT22 may be unavailable." />
        )}
        {prepared && prepared.hasValues && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={prepared.rows} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[prepared.from, prepared.to]}
                tickFormatter={tickFormatter(prepared.to - prepared.from)}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickCount={7}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} width={40} unit="%" />
              <Tooltip
                labelFormatter={(value) => formatDateTime(value)}
                formatter={(value) => [`${formatNumber(value, 1)} %`, 'Humidity']}
              />
              {prepared.gaps.map((gap) => (
                <ReferenceArea key={gap.id} x1={gap.x1} x2={gap.x2} fill="#94a3b8" fillOpacity={0.25} ifOverflow="hidden" />
              ))}
              <Line
                type="monotone"
                dataKey="h"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ r: 2, fill: '#0ea5e9', strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}