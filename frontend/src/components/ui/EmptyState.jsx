export default function EmptyState({ icon: Icon, title, text, tone = 'slate', className = '' }) {
  const color = tone === 'red' ? 'text-red-400' : 'text-slate-300';

  return (
    <div className={`flex flex-col items-center justify-center gap-1 px-4 py-8 text-center ${className}`}>
      {Icon && <Icon className={`mb-1 h-9 w-9 ${color}`} strokeWidth={1.5} />}
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {text && <p className="max-w-xs text-xs text-slate-500">{text}</p>}
    </div>
  );
}