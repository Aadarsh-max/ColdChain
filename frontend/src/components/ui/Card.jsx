export default function Card({ title, icon: Icon, action, children, className = '', bodyClassName = '' }) {
  const hasHeader = Boolean(title || action);

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {hasHeader && (
        <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            {Icon && <Icon className="h-5 w-5 text-blue-600" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={`px-5 pb-5 ${hasHeader ? 'pt-3' : 'pt-5'} ${bodyClassName}`}>{children}</div>
    </section>
  );
}