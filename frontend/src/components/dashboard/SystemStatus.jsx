import { useLive } from '../../context/LiveDataContext.jsx';

const TONES = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-200 text-slate-600'
};

const DOTS = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400'
};

export default function SystemStatus({ device, isStale }) {
  const { connected, summaryError } = useLive();

  let tone = 'green';
  let label = 'All Systems Online';

  if (summaryError) {
    tone = 'red';
    label = 'Backend Unreachable';
  } else if (!connected) {
    tone = 'amber';
    label = 'Live Updates Off';
  } else if (!device) {
    tone = 'slate';
    label = 'No Device';
  } else if (device.connectionStatus === 'offline') {
    tone = 'red';
    label = 'Device Offline';
  } else if (isStale) {
    tone = 'amber';
    label = 'Data Stale';
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${TONES[tone]}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${DOTS[tone]}`} />
      {label}
    </span>
  );
}