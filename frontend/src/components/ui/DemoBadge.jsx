import { FlaskConical } from 'lucide-react';

export default function DemoBadge({ className = '' }) {
  return (
    <span
      title="Simulated data. Not from real hardware."
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold tracking-wide text-amber-800 ${className}`}
    >
      <FlaskConical className="h-3.5 w-3.5" />
      DEMO / SIMULATED
    </span>
  );
}