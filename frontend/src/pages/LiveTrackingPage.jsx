import { MapPin } from 'lucide-react';
import { useDeviceOverview, useLatest, useSelectedDevice } from '../hooks/useDevices.js';
import { useShipmentHistory } from '../hooks/useShipments.js';
import Badge from '../components/ui/Badge.jsx';
import Card from '../components/ui/Card.jsx';
import DemoBadge from '../components/ui/DemoBadge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import DeviceSelect from '../components/device/DeviceSelect.jsx';
import LiveMap from '../components/map/LiveMap.jsx';
import { SITE_NAME } from '../utils/constants.js';
import { durationText, formatCoordinate, formatDateTime, formatNumber } from '../utils/format.js';

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{children}</span>
    </div>
  );
}

export default function LiveTrackingPage() {
  const { devices, device, deviceId, setDeviceId } = useSelectedDevice();
  const overview = useDeviceOverview(deviceId);
  const data = overview.data;
  const latest = useLatest(deviceId, data ? data.latest : null);
  const shipment = data ? data.shipment : null;
  const history = useShipmentHistory(shipment ? shipment.shipmentId : null);

  const location = data ? data.location : null;
  const status = location ? location.status : 'none';
  const atSite = status === 'manual';
  const route = history.data ? history.data.route : [];
  const speed = status === 'current' && latest ? latest.speedKmph : null;

  let notice = 'No location has been received yet, so nothing is drawn on the map.';
  let tone = 'bg-slate-50 border-slate-200 text-slate-700';
  if (status === 'current') {
    notice = 'Current position from a valid GPS fix.';
    tone = 'bg-green-50 border-green-200 text-green-800';
  } else if (atSite) {
    notice = `Device location: ${SITE_NAME}.`;
    tone = 'bg-blue-50 border-blue-200 text-blue-800';
  } else if (status === 'last_known') {
    notice = `This is the last known location, not the current one. The position is ${durationText(location.ageSeconds)} old.`;
    tone = 'bg-amber-50 border-amber-200 text-amber-800';
  }

  const statusBadge = (
    <Badge
      tone={status === 'current' ? 'green' : atSite ? 'blue' : status === 'last_known' ? 'amber' : 'slate'}
      dot
    >
      {status === 'current' ? 'Current' : atSite ? 'At site' : status === 'last_known' ? 'Last known' : 'Unknown'}
    </Badge>
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Live Tracking</h1>
          <p className="text-slate-500">Device location and route history</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {device && device.isSimulated && <DemoBadge />}
          <DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} />
        </div>
      </header>

      {!device && (
        <Card>
          <EmptyState icon={MapPin} title="No devices have reported yet" />
        </Card>
      )}

      {device && (
        <>
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${tone}`}>{notice}</div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card title="Map" icon={MapPin}>
              <LiveMap
                route={route}
                location={location}
                shipmentId={shipment ? shipment.shipmentId : null}
                speed={speed}
              />
              <p className="mt-2 text-[11px] text-slate-400">
                Blue marker: device location. Red marker: live GPS position. Grey marker: last known position. Green
                dot: route start.
              </p>
            </Card>

            <div className="space-y-5">
              <Card title="Position details">
                <Row label="Status">{statusBadge}</Row>
                {atSite && <Row label="Location">{SITE_NAME}</Row>}
                <Row label="Latitude">{location && location.available ? formatCoordinate(location.latitude) : '--'}</Row>
                <Row label="Longitude">{location && location.available ? formatCoordinate(location.longitude) : '--'}</Row>
                <Row label="Updated">{location && location.available ? formatDateTime(location.timestamp) : '--'}</Row>
                {!atSite && (
                  <>
                    <Row label="Position age">
                      {location && location.available ? durationText(location.ageSeconds) : '--'}
                    </Row>
                    <Row label="Satellites">{location ? location.satellites || 0 : '--'}</Row>
                    <Row label="Speed">
                      {speed === null || speed === undefined ? '--' : `${formatNumber(speed, 0)} km/h`}
                    </Row>
                  </>
                )}
              </Card>

              <Card title="Shipment">
                {shipment ? (
                  <>
                    <Row label="Shipment">{shipment.shipmentId}</Row>
                    <Row label="Route">
                      {shipment.origin.name} → {shipment.destination.name}
                    </Row>
                    <Row label="Route points">{route.length}</Row>
                  </>
                ) : (
                  <EmptyState title="No active shipment" text="Route history is stored per shipment. Only the marker is shown." />
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}