import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, Search, Snowflake } from 'lucide-react';
import { useLive } from '../../context/LiveDataContext.jsx';
import DemoBadge from '../ui/DemoBadge.jsx';
import { CURRENT_USER } from '../../utils/constants.js';

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export default function Topbar({ onMenu }) {
  const { summary } = useLive();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const unacknowledged = summary && summary.alerts ? summary.alerts.unacknowledged : 0;
  const demoActive = Boolean(summary && summary.demo && summary.demo.active);

  const submit = (event) => {
    event.preventDefault();
    const text = query.trim();
    navigate(text ? `/shipments?search=${encodeURIComponent(text)}` : '/shipments');
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-3 bg-navy-900 px-4 text-white shadow-md sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-200 hover:bg-white/10 lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link to="/" className="flex items-center gap-3">
        <Snowflake className="h-8 w-8 text-sky-400" strokeWidth={2} />
        <span className="hidden text-xl font-bold sm:inline">Cold-Chain Guardian</span>
      </Link>

      <form onSubmit={submit} className="mx-auto hidden w-full max-w-xl md:block">
        <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-navy-800 px-4 py-2 text-slate-300 focus-within:border-sky-400">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shipments, devices..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
          />
        </label>
      </form>

      <div className="ml-auto flex items-center gap-4 md:ml-0">
        {demoActive && <DemoBadge className="hidden lg:inline-flex" />}

        <Link to="/alerts" className="relative rounded-lg p-2 hover:bg-white/10" aria-label="Alerts">
          <Bell className="h-6 w-6" />
          {unacknowledged > 0 && (
            <span className="absolute right-0.5 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold">
              {unacknowledged > 99 ? '99+' : unacknowledged}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3 border-l border-white/15 pl-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500 text-sm font-bold">
            {initials(CURRENT_USER.name)}
          </span>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-semibold">{CURRENT_USER.name}</div>
            <div className="text-xs text-slate-300">{CURRENT_USER.role}</div>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-slate-300 sm:block" />
        </div>
      </div>
    </header>
  );
}