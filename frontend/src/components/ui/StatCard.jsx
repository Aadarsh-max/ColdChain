import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const TONES = {
  red: { box: 'border-red-200 bg-red-50', icon: 'text-red-500', value: 'text-blue-700' },
  blue: { box: 'border-sky-200 bg-sky-50', icon: 'text-sky-500', value: 'text-blue-700' },
  purple: { box: 'border-purple-200 bg-purple-50', icon: 'text-purple-600', value: 'text-slate-900' },
  green: { box: 'border-green-200 bg-green-50', icon: 'text-green-600', value: 'text-green-700' },
  amber: { box: 'border-amber-200 bg-amber-50', icon: 'text-amber-500', value: 'text-amber-700' }
};

export default function StatCard({
  tone = 'blue',
  icon: Icon,
  value,
  unit,
  label,
  sub,
  subClass = 'text-slate-500',
  ok = null,
  valueClass = 'text-3xl'
}) {
  const style = TONES[tone] || TONES.blue;

  return (
    <div className={`relative flex items-center gap-4 rounded-2xl border p-4 ${style.box}`}>
      {ok !== null && (
        <span className="absolute right-3 top-3">
          {ok ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
        </span>
      )}
      <Icon className={`h-12 w-12 shrink-0 ${style.icon}`} strokeWidth={1.6} />
      <div className="min-w-0">
        <div className={`truncate font-bold leading-tight ${valueClass} ${style.value}`} title={String(value)}>
          {value}
          {unit && <span className="ml-1 text-2xl">{unit}</span>}
        </div>
        <div className="truncate text-sm font-medium text-slate-700">{label}</div>
        {sub && <div className={`truncate text-xs font-medium ${subClass}`}>{sub}</div>}
      </div>
    </div>
  );
}