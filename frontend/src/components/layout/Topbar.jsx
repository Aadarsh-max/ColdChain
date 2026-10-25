import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Search, Snowflake, Users } from 'lucide-react';
import { useLive } from '../../context/LiveDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import DemoBadge from '../ui/DemoBadge.jsx';
import Badge from '../ui/Badge.jsx';

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export default function Topbar({ onMenu }) {
  const { summary } = useLive();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const unacknowledged = summary && summary.alerts ? summary.alerts.unacknowledged : 0;
  const demoActive = Boolean(summary && summary.demo && summary.demo.active);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const submit = (event) => {
    event.preventDefault();
    const text = query.trim();
    navigate(text ? `/shipments?search=${encodeURIComponent(text)}` : '/shipments');
  };

  const itemClass = 'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50';

  return (
    <header className="print:hidden sticky top-0 z-50 flex h-16 items-center gap-3 bg-navy-900 px-4 text-white shadow-md sm:px-6">
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

        <div ref={menuRef} className="relative border-l border-white/15 pl-4">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500 text-sm font-bold">
              {initials(user.name)}
            </span>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-xs capitalize text-slate-300">{user.role}</div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-300 sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="truncate text-sm font-bold">{user.name}</div>
                <div className="truncate text-xs text-slate-500">{user.email}</div>
                <Badge tone={isAdmin ? 'purple' : 'slate'} className="mt-2 capitalize">
                  {user.role}
                </Badge>
              </div>
              <Link to="/account" onClick={() => setMenuOpen(false)} className={itemClass}>
                <KeyRound className="h-4 w-4" /> Account and password
              </Link>
              {isAdmin && (
                <Link to="/users" onClick={() => setMenuOpen(false)} className={itemClass}>
                  <Users className="h-4 w-4" /> Manage users
                </Link>
              )}
              <button type="button" onClick={logout} className={`${itemClass} border-t border-slate-100 text-red-600`}>
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}