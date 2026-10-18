const W = 400;
const H = 250;
const PAD = 34;

export default function RouteMini({ points = [], marker = null }) {
  const all = marker ? [...points, marker] : points;

  if (all.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
        No GPS position to plot
      </div>
    );
  }

  const lats = all.map((point) => point.latitude);
  const lngs = all.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const spanX = Math.max((maxLng - minLng) * k, 0.01);
  const spanY = Math.max(maxLat - minLat, 0.01);
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);

  const project = (point) => ({
    x: W / 2 + (point.longitude - midLng) * k * scale,
    y: H / 2 - (point.latitude - midLat) * scale
  });

  const path = points.map(project);
  const end = marker ? project(marker) : path[path.length - 1];
  const start = path[0];
  const live = marker && marker.status === 'current';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full rounded-xl bg-slate-50" role="img" aria-label="Route preview">
      {[1, 2, 3, 4].map((i) => (
        <line key={`h${i}`} x1="0" x2={W} y1={(H / 5) * i} y2={(H / 5) * i} stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line key={`v${i}`} y1="0" y2={H} x1={(W / 8) * i} x2={(W / 8) * i} stroke="#e2e8f0" strokeWidth="1" />
      ))}

      {path.length > 1 && (
        <polyline
          points={path.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeDasharray="2 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {start && path.length > 1 && <circle cx={start.x} cy={start.y} r="6" fill="#16a34a" stroke="white" strokeWidth="2" />}

      {end && (
        <>
          <circle cx={end.x} cy={end.y} r="14" fill={live ? '#ef4444' : '#94a3b8'} fillOpacity="0.2" />
          <circle cx={end.x} cy={end.y} r="7" fill={live ? '#ef4444' : '#64748b'} stroke="white" strokeWidth="2.5" />
        </>
      )}
    </svg>
  );
}