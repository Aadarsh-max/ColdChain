import { Link } from 'react-router-dom';
import { Maximize2, MapPin } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import RouteMini from '../map/RouteMini.jsx';
import { SITE_NAME } from '../../utils/constants.js';
import { durationText, formatCoordinate, formatNumber, formatTime } from '../../utils/format.js';

export default function LocationCard({ location, latest, shipmentId, route }) {
  const status = location ? location.status : 'none';
  const atSite = status === 'manual';

  let badge = (
    <Badge tone="slate" dot>
      Unknown
    </Badge>
  );
  if (status === 'current') {
    badge = (
      <Badge tone="green" dot>
        Live
      </Badge>
    );
  } else if (atSite) {
    badge = (
      <Badge tone="blue" dot>
        At site
      </Badge>
    );
  } else if (status === 'last_known') {
    badge = (
      <Badge tone="amber" dot>
        Last known
      </Badge>
    );
  }

  const action = (
    <Link
      to="/tracking"
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      View Full Map <Maximize2 className="h-3.5 w-3.5" />
    </Link>
  );

  const marker =
    location && location.available
      ? { latitude: location.latitude, longitude: location.longitude, status: location.status }
      : null;

  const speed = status === 'current' && latest ? latest.speedKmph : null;

  return (
    <Card title="Live Location" icon={MapPin} action={action}>
      <div className="relative h-[270px]">
        <RouteMini points={route || []} marker={marker} />

        <div className="absolute left-3 top-3 w-56 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-900">{shipmentId ? `Shipment: ${shipmentId}` : 'No shipment'}</span>
            {badge}
          </div>
          {location && location.available && atSite && (
            <div className="mt-2 space-y-0.5 text-slate-600">
              <div className="font-semibold text-slate-800">{SITE_NAME}</div>
              <div>Lat: {formatCoordinate(location.latitude)}</div>
              <div>Lng: {formatCoordinate(location.longitude)}</div>
              <div>Updated: {formatTime(location.timestamp)}</div>
            </div>
          )}
          {location && location.available && !atSite && (
            <div className="mt-2 space-y-0.5 text-slate-600">
              <div>Lat: {formatCoordinate(location.latitude)}</div>
              <div>Lng: {formatCoordinate(location.longitude)}</div>
              {speed !== null && speed !== undefined && <div>Speed: {formatNumber(speed, 0)} km/h</div>}
              <div>Satellites: {location.satellites || 0}</div>
              <div>
                {status === 'current' ? 'Last Updated' : 'Position time'}: {formatTime(location.timestamp)}
              </div>
              {status === 'last_known' && (
                <div className="font-semibold text-amber-700">
                  Not current. Position is {durationText(location.ageSeconds)} old.
                </div>
              )}
            </div>
          )}
          {!(location && location.available) && (
            <div className="mt-2 text-slate-600">No location has been received yet.</div>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Open Live Tracking for the full map.</p>
    </Card>
  );
}