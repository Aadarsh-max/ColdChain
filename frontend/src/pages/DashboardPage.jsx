import { useState } from 'react';
import { Cpu, ServerOff } from 'lucide-react';
import { useLive } from '../context/LiveDataContext.jsx';
import { API_URL } from '../api/client.js';
import { useDeviceOverview, useLatest, useReadings, useSelectedDevice, useSeries } from '../hooks/useDevices.js';
import { useRecentAlerts } from '../hooks/useAlerts.js';
import { useShipmentHistory } from '../hooks/useShipments.js';
import DemoBadge from '../components/ui/DemoBadge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Card from '../components/ui/Card.jsx';
import DeviceSelect from '../components/device/DeviceSelect.jsx';
import ClockChip from '../components/dashboard/ClockChip.jsx';
import SystemStatus from '../components/dashboard/SystemStatus.jsx';
import FleetStrip from '../components/dashboard/FleetStrip.jsx';
import SummaryCards from '../components/dashboard/SummaryCards.jsx';
import TemperatureChart from '../components/charts/TemperatureChart.jsx';
import LocationCard from '../components/dashboard/LocationCard.jsx';
import CurrentShipmentCard from '../components/dashboard/CurrentShipmentCard.jsx';
import AlertsPanel from '../components/dashboard/AlertsPanel.jsx';
import SensorReadings from '../components/dashboard/SensorReadings.jsx';
import DeviceStatusPanel from '../components/dashboard/DeviceStatusPanel.jsx';
import RecentReadings from '../components/dashboard/RecentReadings.jsx';
import ShipmentHistory from '../components/dashboard/ShipmentHistory.jsx';

export default function DashboardPage() {
  const { summary, summaryError, devicesLoaded } = useLive();
  const { devices, device, deviceId, setDeviceId } = useSelectedDevice();
  const [range, setRange] = useState('1D');

  const overview = useDeviceOverview(deviceId);
  const series = useSeries(deviceId, range);
  const readings = useReadings(deviceId, 5);
  const alerts = useRecentAlerts(deviceId, 3);

  const data = overview.data;
  const latest = useLatest(deviceId, data ? data.latest : null);
  const shipment = data ? data.shipment : null;
  const history = useShipmentHistory(shipment ? shipment.shipmentId : null);

  const limits = shipment
    ? { minTempC: shipment.minTempC, maxTempC: shipment.maxTempC }
    : series.data
      ? series.data.limits
      : null;

  const risk =
    summary && shipment ? summary.risk.shipments.find((item) => item.shipmentId === shipment.shipmentId) : null;

  const isStale = data ? data.isStale : false;
  const isDemo = Boolean(
    (device && device.isSimulated) || (latest && latest.isSimulated) || (series.data && series.data.hasSimulated)
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Real-time monitoring of your cold chain shipments and devices</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isDemo && <DemoBadge />}
          <DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} />
          <ClockChip />
          <SystemStatus device={device} isStale={isStale} />
        </div>
      </header>

      {summaryError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ServerOff className="h-5 w-5 shrink-0" />
          <span>
            Cannot reach the backend at <strong>{API_URL}</strong>. Check that it is running (npm run dev in backend/).
          </span>
        </div>
      )}

      <FleetStrip summary={summary} />

      {devicesLoaded && devices.length === 0 && !summaryError && (
        <Card>
          <EmptyState
            icon={Cpu}
            title="No devices have reported yet"
            text="Start the simulator: node src/index.js --scenario normal --ticks 200 --interval 3"
          />
        </Card>
      )}

      {isStale && data && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No recent telemetry from {deviceId}. The values below are the last readings received, not live data.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <SummaryCards latest={latest} location={data ? data.location : null} limits={limits} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <TemperatureChart
              series={series.data}
              loading={series.loading}
              error={series.error}
              range={range}
              onRangeChange={setRange}
            />
            <LocationCard
              location={data ? data.location : null}
              latest={latest}
              shipmentId={shipment ? shipment.shipmentId : null}
              route={history.data ? history.data.route : []}
            />
          </div>
        </div>

        <div className="space-y-5">
          <CurrentShipmentCard shipment={shipment} risk={risk} />
          <AlertsPanel alerts={alerts.data} loading={alerts.loading} error={alerts.error} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <SensorReadings latest={latest} stale={isStale} />
        <DeviceStatusPanel latest={latest} device={data ? data.device : device} />
        <RecentReadings readings={readings.data} loading={readings.loading} />
        <ShipmentHistory history={shipment ? shipment.history : null} />
      </div>
    </div>
  );
}