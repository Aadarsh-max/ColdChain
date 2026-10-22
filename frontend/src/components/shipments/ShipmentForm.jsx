import { useState } from 'react';
import { errorMessage } from '../../api/client.js';
import { SHIPMENT_STATUS } from '../../utils/constants.js';
import Button from '../ui/Button.jsx';
import Field, { inputClass } from '../ui/Field.jsx';

const pad = (value) => String(value).padStart(2, '0');

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

const textOf = (value) => (value === null || value === undefined ? '' : String(value));

const readNumber = (raw, label) => {
  if (raw === '') return { value: null };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { error: `${label} must be a number` };
  return { value };
};

const initialState = (shipment) => ({
  shipmentId: shipment ? shipment.shipmentId : '',
  trackingCode: textOf(shipment && shipment.trackingCode),
  productName: textOf(shipment && shipment.productName),
  productCategory: textOf(shipment && shipment.productCategory),
  minTempC: shipment ? String(shipment.minTempC) : '10',
  maxTempC: shipment ? String(shipment.maxTempC) : '15',
  originName: textOf(shipment && shipment.origin && shipment.origin.name),
  originLat: textOf(shipment && shipment.origin && shipment.origin.latitude),
  originLng: textOf(shipment && shipment.origin && shipment.origin.longitude),
  destinationName: textOf(shipment && shipment.destination && shipment.destination.name),
  destinationLat: textOf(shipment && shipment.destination && shipment.destination.latitude),
  destinationLng: textOf(shipment && shipment.destination && shipment.destination.longitude),
  startTime: toLocalInput(shipment && shipment.startTime),
  expectedArrival: toLocalInput(shipment && shipment.expectedArrival),
  deviceId: textOf(shipment && shipment.deviceId),
  status: shipment ? shipment.status : 'planned',
  statusNote: ''
});

export default function ShipmentForm({ shipment, devices, onSubmit, onCancel }) {
  const isEdit = Boolean(shipment);
  const [form, setForm] = useState(() => initialState(shipment));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const deviceOptions = [...devices];
  if (form.deviceId && !deviceOptions.some((item) => item.deviceId === form.deviceId)) {
    deviceOptions.push({ deviceId: form.deviceId, isSimulated: false });
  }

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const min = readNumber(form.minTempC, 'Minimum temperature');
    const max = readNumber(form.maxTempC, 'Maximum temperature');
    const originLat = readNumber(form.originLat, 'Origin latitude');
    const originLng = readNumber(form.originLng, 'Origin longitude');
    const destinationLat = readNumber(form.destinationLat, 'Destination latitude');
    const destinationLng = readNumber(form.destinationLng, 'Destination longitude');

    const bad = [min, max, originLat, originLng, destinationLat, destinationLng].find((item) => item.error);
    if (bad) return setError(bad.error);
    if (min.value === null || max.value === null) return setError('Minimum and maximum temperature are required');
    if (min.value >= max.value) return setError('Maximum temperature must be greater than the minimum');
    if (!isEdit && !/^[A-Za-z0-9_-]{3,40}$/.test(form.shipmentId.trim())) {
      return setError('Shipment ID needs 3 to 40 letters, numbers, dashes, or underscores');
    }
    if (!form.productName.trim()) return setError('Product name is required');
    if (!form.originName.trim() || !form.destinationName.trim()) {
      return setError('Origin and destination names are required');
    }

    const start = fromLocalInput(form.startTime);
    const arrival = fromLocalInput(form.expectedArrival);
    if (start && arrival && new Date(arrival) <= new Date(start)) {
      return setError('Expected arrival must be after the start time');
    }

    const selected = deviceOptions.find((item) => item.deviceId === form.deviceId);

    const body = {
      trackingCode: form.trackingCode.trim(),
      productName: form.productName.trim(),
      productCategory: form.productCategory.trim(),
      minTempC: min.value,
      maxTempC: max.value,
      origin: { name: form.originName.trim(), latitude: originLat.value, longitude: originLng.value },
      destination: {
        name: form.destinationName.trim(),
        latitude: destinationLat.value,
        longitude: destinationLng.value
      },
      startTime: start,
      expectedArrival: arrival,
      deviceId: form.deviceId || null,
      status: form.status,
      isSimulated: selected ? Boolean(selected.isSimulated) : shipment ? Boolean(shipment.isSimulated) : false
    };

    if (form.statusNote.trim()) body.statusNote = form.statusNote.trim();
    if (!isEdit) body.shipmentId = form.shipmentId.trim();

    setSaving(true);
    try {
      await onSubmit(body);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Shipment ID">
          <input
            className={inputClass}
            value={form.shipmentId}
            onChange={set('shipmentId')}
            disabled={isEdit}
            placeholder="CC2001"
          />
        </Field>
        <Field label="Tracking code">
          <input className={inputClass} value={form.trackingCode} onChange={set('trackingCode')} />
        </Field>
        <Field label="Product name">
          <input className={inputClass} value={form.productName} onChange={set('productName')} placeholder="Medicine" />
        </Field>
        <Field label="Product category">
          <input
            className={inputClass}
            value={form.productCategory}
            onChange={set('productCategory')}
            placeholder="Medicine"
          />
        </Field>
        <Field label="Minimum temperature (°C)" hint="Set this from the storage range on the product label.">
          <input className={inputClass} type="number" step="0.1" value={form.minTempC} onChange={set('minTempC')} />
        </Field>
        <Field label="Maximum temperature (°C)">
          <input className={inputClass} type="number" step="0.1" value={form.maxTempC} onChange={set('maxTempC')} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Origin" className="sm:col-span-1">
          <input className={inputClass} value={form.originName} onChange={set('originName')} placeholder="Palghar, MH" />
        </Field>
        <Field label="Origin latitude (optional)">
          <input className={inputClass} type="number" step="any" value={form.originLat} onChange={set('originLat')} />
        </Field>
        <Field label="Origin longitude (optional)">
          <input className={inputClass} type="number" step="any" value={form.originLng} onChange={set('originLng')} />
        </Field>
        <Field label="Destination">
          <input
            className={inputClass}
            value={form.destinationName}
            onChange={set('destinationName')}
            placeholder="Pune, MH"
          />
        </Field>
        <Field label="Destination latitude (optional)">
          <input
            className={inputClass}
            type="number"
            step="any"
            value={form.destinationLat}
            onChange={set('destinationLat')}
          />
        </Field>
        <Field label="Destination longitude (optional)">
          <input
            className={inputClass}
            type="number"
            step="any"
            value={form.destinationLng}
            onChange={set('destinationLng')}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start time">
          <input className={inputClass} type="datetime-local" value={form.startTime} onChange={set('startTime')} />
        </Field>
        <Field label="Expected arrival">
          <input
            className={inputClass}
            type="datetime-local"
            value={form.expectedArrival}
            onChange={set('expectedArrival')}
          />
        </Field>
        <Field
          label="Assigned device"
          hint="Telemetry is linked to this shipment only while it is At Warehouse or In Transit."
        >
          <select className={inputClass} value={form.deviceId} onChange={set('deviceId')}>
            <option value="">No device</option>
            {deviceOptions.map((item) => (
              <option key={item.deviceId} value={item.deviceId}>
                {item.deviceId}
                {item.isSimulated ? ' (demo)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={set('status')}>
            {Object.entries(SHIPMENT_STATUS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status note (added to history when the status changes)" className="sm:col-span-2">
          <input
            className={inputClass}
            value={form.statusNote}
            onChange={set('statusNote')}
            maxLength={200}
            placeholder="Dispatched from college"
          />
        </Field>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create shipment'}
        </Button>
      </div>
    </form>
  );
}