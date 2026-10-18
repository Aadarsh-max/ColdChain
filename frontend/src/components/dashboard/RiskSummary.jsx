import { ShieldAlert } from 'lucide-react';

const LEVELS = {
  low: { bar: 'bg-green-500', text: 'text-green-700' },
  moderate: { bar: 'bg-amber-500', text: 'text-amber-700' },
  high: { bar: 'bg-orange-500', text: 'text-orange-700' },
  critical: { bar: 'bg-red-600', text: 'text-red-700' }
};

export default function RiskSummary({ risk }) {
  if (!risk) return null;
  const style = LEVELS[risk.level] || LEVELS.low;

  return (
    <div className="mt-4 border-t border-slate-100 pt-3" title="Project-defined operational indicator, not a validated probability of product damage.">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          Risk score
        </span>
        <span className={`font-bold capitalize ${style.text}`}>
          {risk.score} / 100 · {risk.level}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(100, risk.score)}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Project-defined indicator, not a validated damage probability.</p>
    </div>
  );
}