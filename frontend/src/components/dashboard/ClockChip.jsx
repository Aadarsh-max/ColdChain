import { CalendarDays } from 'lucide-react';
import { useNow } from '../../hooks/useNow.js';
import { formatDate, formatTime, formatWeekday } from '../../utils/format.js';

export default function ClockChip() {
  const now = useNow(1000);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <CalendarDays className="h-6 w-6 text-slate-700" />
      <div className="leading-tight">
        <div className="text-xs text-slate-500">
          {formatWeekday(now)}, {formatDate(now)}
        </div>
        <div className="text-sm font-semibold text-slate-900">{formatTime(now, true)}</div>
      </div>
    </div>
  );
}