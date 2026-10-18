const TONES = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-100 text-slate-600'
};

const DOTS = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-400'
};

export default function Badge({ tone = 'slate', dot = false, className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        TONES[tone] || TONES.slate
      } ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone] || DOTS.slate}`} />}
      {children}
    </span>
  );
}