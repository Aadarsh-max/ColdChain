const TONES = {
  ok: 'border-green-200 bg-green-50',
  warn: 'border-amber-200 bg-amber-50',
  bad: 'border-red-200 bg-red-50',
  neutral: 'border-slate-200 bg-white'
};

const ICONS = {
  ok: 'text-green-600',
  warn: 'text-amber-500',
  bad: 'text-red-500',
  neutral: 'text-blue-600'
};

export default function MetricTile({ icon: Icon, label, value, sub, tone = 'neutral' }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm ${TONES[tone] || TONES.neutral}`}>
      <Icon className={`h-9 w-9 shrink-0 ${ICONS[tone] || ICONS.neutral}`} strokeWidth={1.6} />
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="truncate text-xl font-bold text-slate-900">{value}</div>
        {sub && <div className="truncate text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}