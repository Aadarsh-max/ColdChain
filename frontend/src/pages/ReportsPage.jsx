import { useEffect, useState } from 'react';
import { useSelectedDevice } from '../hooks/useDevices.js';
import { useShipmentList } from '../hooks/useShipments.js';
import DeviceSelect from '../components/device/DeviceSelect.jsx';
import DemoBadge from '../components/ui/DemoBadge.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';
import ReadingsPanel from '../components/reports/ReadingsPanel.jsx';
import ShipmentReport from '../components/reports/ShipmentReport.jsx';

const TABS = [
  { key: 'readings', label: 'Historical readings' },
  { key: 'sync', label: 'Offline synchronization' },
  { key: 'shipment', label: 'Shipment report' }
];

const SHIPMENT_PARAMS = { limit: 100 };

export default function ReportsPage() {
  const { devices, device, deviceId, setDeviceId } = useSelectedDevice();
  const [tab, setTab] = useState('readings');
  const [shipmentId, setShipmentId] = useState('');
  const shipments = useShipmentList(SHIPMENT_PARAMS);
  const options = shipments.data ? shipments.data.data : [];

  useEffect(() => {
    if (!shipmentId && options.length > 0) setShipmentId(options[0].shipmentId);
  }, [options, shipmentId]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500">Historical readings, offline synchronization records, and shipment summaries</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {device && device.isSimulated && tab !== 'shipment' && <DemoBadge />}
          {tab !== 'shipment' && <DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} />}
        </div>
      </header>

      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1 print:hidden sm:w-fit">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === item.key ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab !== 'shipment' && deviceId && <ReadingsPanel key={`${tab}:${deviceId}`} deviceId={deviceId} mode={tab} />}
      {tab !== 'shipment' && !deviceId && (
        <p className="text-sm text-slate-500">No devices have reported yet.</p>
      )}

      {tab === 'shipment' && (
        <>
          <div className="max-w-md print:hidden">
            <Field label="Shipment">
              <select className={inputClass} value={shipmentId} onChange={(event) => setShipmentId(event.target.value)}>
                {options.length === 0 && <option value="">No shipments yet</option>}
                {options.map((item) => (
                  <option key={item.shipmentId} value={item.shipmentId}>
                    {item.shipmentId} · {item.productName}
                    {item.isSimulated ? ' (demo)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <ShipmentReport key={shipmentId} shipmentId={shipmentId} />
        </>
      )}
    </div>
  );
}