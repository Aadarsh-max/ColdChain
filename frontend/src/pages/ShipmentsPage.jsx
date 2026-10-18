import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, Pencil, Plus, Search } from 'lucide-react';
import { createShipment, updateShipment } from '../api/endpoints.js';
import { useLive } from '../context/LiveDataContext.jsx';
import { useShipmentList } from '../hooks/useShipments.js';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { inputClass } from '../components/ui/Field.jsx';
import Modal from '../components/ui/Modal.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import ShipmentForm from '../components/shipments/ShipmentForm.jsx';
import { SHIPMENT_STATUS } from '../utils/constants.js';
import { formatDateTime } from '../utils/format.js';
import { cleanParams } from '../utils/params.js';

export default function ShipmentsPage() {
  const { devices } = useLive();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';

  const [text, setText] = useState(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    setText(search);
    setPage(1);
  }, [search]);

  const params = useMemo(() => cleanParams({ page, limit: 12, status, search }), [page, status, search]);
  const list = useShipmentList(params, reload);
  const result = list.data;
  const rows = result ? result.data : null;

  const submitSearch = (event) => {
    event.preventDefault();
    const value = text.trim();
    setSearchParams(value ? { search: value } : {});
  };

  const save = async (body) => {
    if (editing && editing !== 'new') {
      await updateShipment(editing.shipmentId, body);
    } else {
      await createShipment(body);
    }
    setEditing(null);
    setReload((value) => value + 1);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Shipments</h1>
          <p className="text-slate-500">Create shipments, assign a device, and set product-specific temperature limits</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> New shipment
        </Button>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={submitSearch} className="flex min-w-[240px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Search by shipment ID, tracking code, or product"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <select
            className={`${inputClass} !w-auto`}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(SHIPMENT_STATUS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="All shipments" icon={Package}>
        {!result && list.loading && <EmptyState title="Loading shipments..." />}
        {!result && !list.loading && list.error && (
          <EmptyState tone="red" title="Could not load shipments" text={list.error} />
        )}
        {rows && rows.length === 0 && (
          <EmptyState icon={Package} title="No shipments found" text="Create a shipment to start tracking." />
        )}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2">Shipment</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Limits</th>
                  <th className="px-3 py-2">Expected arrival</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const meta = SHIPMENT_STATUS[item.status] || { label: item.status, tone: 'slate' };
                  return (
                    <tr key={item.shipmentId} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5">
                        <Link to={`/shipments/${item.shipmentId}`} className="font-semibold text-blue-600 hover:underline">
                          {item.shipmentId}
                        </Link>
                        {item.isSimulated && (
                          <Badge tone="amber" className="ml-1.5 !px-1.5 !py-0 text-[10px]">
                            demo
                          </Badge>
                        )}
                        {item.trackingCode && <div className="text-xs text-slate-400">{item.trackingCode}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800">{item.productName}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {item.origin.name} → {item.destination.name}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{item.deviceId || '--'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                        {item.minTempC} to {item.maxTempC} °C
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatDateTime(item.expectedArrival)}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {result && <Pagination meta={result.meta} onPage={setPage} />}
      </Card>

      <Modal
        open={Boolean(editing)}
        title={editing && editing !== 'new' ? `Edit shipment ${editing.shipmentId}` : 'New shipment'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <ShipmentForm
            key={editing === 'new' ? 'new' : editing.shipmentId}
            shipment={editing === 'new' ? null : editing}
            devices={devices}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}