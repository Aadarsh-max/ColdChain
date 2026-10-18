import { NavLink } from 'react-router-dom';
import { BarChart3, Bell, Cpu, FileText, Home, MapPin, Package, Settings, Snowflake } from 'lucide-react';
import { useLive } from '../../context/LiveDataContext.jsx';

const ITEMS = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/tracking', label: 'Live Tracking', icon: MapPin },
  { to: '/shipments', label: 'Shipments', icon: Package },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/alerts', label: 'Alerts', icon: Bell, badge: true },
  { to: '/devices', label: 'Devices', icon: Cpu },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ open, onClose }) {
  const { summary } = useLive();
  const unacknowledged = summary && summary.alerts ? summary.alerts.unacknowledged : 0;

  return (
    <>
      {open && <div className="fixed inset-0 top-16 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed bottom-0 left-0 top-16 z-40 flex w-64 flex-col bg-navy-900 p-4 text-slate-200 transition-transform lg:sticky lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:self-start ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="space-y-1.5">
          {ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge && unacknowledged > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {unacknowledged > 99 ? '99+' : unacknowledged}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-white/10 bg-navy-800 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/20 text-sky-300">
              <Snowflake className="h-6 w-6" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold text-white">Cold-Chain Guardian</div>
              <div className="text-xs text-slate-400">Safer Medicines</div>
              <div className="text-xs text-slate-400">For Healthier Tomorrow</div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Educational prototype. Not a certified medical device.</p>
        </div>
      </aside>
    </>
  );
}