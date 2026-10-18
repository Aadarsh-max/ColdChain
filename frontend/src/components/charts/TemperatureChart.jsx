import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import DemoBadge from '../ui/DemoBadge.jsx';
import { RANGES } from '../../utils/constants.js';
import { formatDateTime, formatNumber } from '../../utils/format.js';

const TEMP_TYPES = new Set(['temperature_high', 'temperature_low']);

const tickFormatter = (spanMs) => (value) => {
  const date = new Date(value);
  if (spanMs <= 36 * 3600000) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (row.temp === null || row.temp === undefined) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-800">{formatDateTime(row.t)}</div>
      <div className="mt-1 text-slate-600">Temperature: {formatNumber(row.temp, 2)} °C</div>
      {row.min !== null && row.max !== null && row.min !== row.max && (
        <div className="text-slate-500">
          Range: {formatNumber(row.min, 2)} to {formatNumber(row.max, 2)} °C
        </div>
      )}
    </div>
  );
}

export default function TemperatureChart({ series, loading, error, range, onRangeChange }) {
  const prepared = useMemo(() => {
    if (!series) return null;

    const from = Date.parse(series.from);
    const to = Date.parse(series.to);

    const rows = series.points.map((point) => ({
      t: Date.parse(point.t),
      temp: point.temperatureC,
      min: point.tempMinC,
      max: point.tempMaxC
    }));
    for (const gap of series.gaps) rows.push({ t: Date.parse(gap.from), temp: null, min: null, max: null });
    rows.sort((a, b) => a.t - b.t);

    const values = series.points.map((point) => point.temperatureC).filter((value) => value !== null);
    const { minTempC, maxTempC } = series.limits;
    const low = Math.floor(Math.min(minTempC, ...values) - 2);
    const high = Math.ceil(Math.max(maxTempC, ...values) + 2);

    const excursions = series.excursions
      .filter((item) => TEMP_TYPES.has(item.type))
      .map((item) => ({
        id: item._id,
        x1: Math.max(Date.parse(item.startedAt), from),
        x2: Math.min(item.endedAt ? Date.parse(item.endedAt) : to, to)
      }))
      .filter((item) => item.x2 > item.x1);

    const gaps = series.gaps
      .map((gap, index) => ({
        id: index,
        x1: Math.max(Date.parse(gap.from), from),
        x2: Math.min(Date.parse(gap.to), to)
      }))
      .filter((gap) => gap.x2 > gap.x1);

    return { rows, from, to, low, high, excursions, gaps, limits: series.limits, stats: series.stats };
  }, [series]);

  const buttons = (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {RANGES.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onRangeChange(item.key)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
            range === item.key ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-white'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  const hasData = prepared && series.points.length > 0;

  return (
    <Card title="Temperature Trend" icon={TrendingUp} action={buttons}>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {series && series.hasSimulated && <DemoBadge />}
        {hasData && prepared.stats.count > 0 && (
          <span>
            Min {formatNumber(prepared.stats.minTempC)} · Avg {formatNumber(prepared.stats.avgTempC)} · Max{' '}
            {formatNumber(prepared.stats.maxTempC)} °C
          </span>
        )}
      </div>

      <div className="h-[270px]">
        {!series && loading && <EmptyState title="Loading temperature data..." />}
        {!series && !loading && error && <EmptyState tone="red" title="Could not load chart" text={error} />}
        {series && !hasData && (
          <EmptyState title="No readings in this range" text="Try a longer range or wait for new telemetry." />
        )}
        {hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={prepared.rows} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
              <YAxis
                domain={[prepared.low, prepared.high]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={44}
                label={{
                  value: 'Temperature (°C)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#64748b', textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<ChartTooltip />} />

              <ReferenceArea
                y1={prepared.limits.maxTempC}
                y2={prepared.high}
                fill="#ef4444"
                fillOpacity={0.06}
                ifOverflow="hidden"
              />
              <ReferenceArea
                y1={prepared.low}
                y2={prepared.limits.minTempC}
                fill="#ef4444"
                fillOpacity={0.06}
                ifOverflow="hidden"
              />
              {prepared.excursions.map((item) => (
                <ReferenceArea
                  key={`x-${item.id}`}
                  x1={item.x1}
                  x2={item.x2}
                  fill="#ef4444"
                  fillOpacity={0.14}
                  ifOverflow="hidden"
                />
              ))}
              {prepared.gaps.map((gap) => (
                <ReferenceArea
                  key={`g-${gap.id}`}
                  x1={gap.x1}
                  x2={gap.x2}
                  fill="#94a3b8"
                  fillOpacity={0.25}
                  ifOverflow="hidden"
                />
              ))}

              <ReferenceLine
                y={prepared.limits.maxTempC}
                stroke="#ef4444"
                strokeDasharray="6 4"
                label={{
                  value: `Upper Limit (${prepared.limits.maxTempC}°C)`,
                  position: 'insideTopRight',
                  fill: '#dc2626',
                  fontSize: 11
                }}
              />
              <ReferenceLine
                y={prepared.limits.minTempC}
                stroke="#16a34a"
                strokeDasharray="6 4"
                label={{
                  value: `Lower Limit (${prepared.limits.minTempC}°C)`,
                  position: 'insideBottomRight',
                  fill: '#15803d',
                  fontSize: 11
                }}
              />

              <Area
                type="monotone"
                dataKey="temp"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#tempFill)"
                dot={{ r: 2, fill: '#2563eb', strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Temperature
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Upper Limit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Lower Limit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-red-200" /> Excursion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-slate-300" /> No data
        </span>
      </div>
    </Card>
  );
}