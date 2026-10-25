import { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, Settings as SettingsIcon, Wifi } from 'lucide-react';
import { errorMessage } from '../api/client.js';
import { fetchSettings, updateSettings } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLive } from '../context/LiveDataContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import DemoBadge from '../components/ui/DemoBadge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';
import { formatDateTime, secondsSince, timeAgo } from '../utils/format.js';

const GROUPS = [
  {
    title: 'Temperature limits and excursions',
    fields: [
      {
        key: 'defaultMinTempC',
        label: 'Default minimum temperature (°C)',
        step: '0.1',
        min: -80,
        max: 60,
        hint: 'Used only when a device has no active shipment. Shipments set their own limits.'
      },
      { key: 'defaultMaxTempC', label: 'Default maximum temperature (°C)', step: '0.1', min: -80, max: 60 },
      {
        key: 'hysteresisC',
        label: 'Hysteresis (°C)',
        step: '0.1',
        min: 0,
        max: 5,
        hint: 'How far back inside the limit before an excursion alert clears.'
      },
      {
        key: 'excursionDebounceSamples',
        label: 'Debounce (readings)',
        step: '1',
        min: 1,
        max: 20,
        int: true,
        hint: 'Consecutive readings outside limits before an alert opens.'
      },
      {
        key: 'criticalExcursionMinutes',
        label: 'Long excursion threshold (minutes)',
        step: '1',
        min: 1,
        max: 10080
      }
    ]
  },
  {
    title: 'Sampling and stale-data thresholds',
    fields: [
      {
        key: 'sampleIntervalSeconds',
        label: 'Sampling interval (seconds)',
        step: '1',
        min: 1,
        max: 3600,
        int: true,
        hint: 'Sent to real devices as configuration. Simulated devices ignore it.'
      },
      {
        key: 'staleAfterSeconds',
        label: 'Stale telemetry after (seconds)',
        step: '1',
        min: 5,
        max: 86400,
        int: true
      },
      {
        key: 'offlineAfterSeconds',
        label: 'Device offline after (seconds)',
        step: '1',
        min: 10,
        max: 86400,
        int: true
      }
    ]
  },
  {
    title: 'Battery and motion',
    fields: [
      {
        key: 'lowBatteryPct',
        label: 'Low battery at (% estimated)',
        step: '1',
        min: 1,
        max: 100,
        hint: 'Battery percentage is estimated from voltage.'
      },
      { key: 'criticalBatteryPct', label: 'Critical battery at (% estimated)', step: '1', min: 1, max: 100 },
      {
        key: 'shockThresholdG',
        label: 'Shock threshold (g)',
        step: '0.1',
        min: 0.1,
        max: 16,
        hint: 'Total acceleration at or above this is treated as a possible shock.'
      }
    ]
  }
];

const TOGGLES = [
  { key: 'lidOpened', label: 'Lid opened alerts' },
  { key: 'shock', label: 'Shock and motion alerts' },
  { key: 'lowBattery', label: 'Low battery alerts' },
  { key: 'deviceOffline', label: 'Device offline and stale telemetry alerts' },
  { key: 'sensorFailure', label: 'Sensor failure alerts' },
  { key: 'gpsUnavailable', label: 'GPS unavailable alerts' },
  { key: 'buzzerEnabled', label: 'Buzzer on critical alerts (sent to real devices)' }
];

const ALL_FIELDS = GROUPS.flatMap((group) => group.fields);

const toForm = (settings) => {
  const values = {};
  for (const field of ALL_FIELDS) values[field.key] = String(settings[field.key]);
  const prefs = {};
  for (const toggle of TOGGLES) prefs[toggle.key] = settings.alertPreferences[toggle.key] !== false;
  return { values, prefs, gpsExpected: settings.gpsExpected !== false };
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-blue-600"
      />
    </label>
  );
}

export default function SettingsPage() {
  const { devices, connected, summaryError } = useLive();
  const { isAdmin } = useAuth();
  const loaded = useFetch(fetchSettings, 'settings');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (loaded.data && !form) setForm(toForm(loaded.data));
  }, [loaded.data, form]);

  const setValue = (key) => (event) =>
    setForm((prev) => ({ ...prev, values: { ...prev.values, [key]: event.target.value } }));

  const setPref = (key) => (value) => setForm((prev) => ({ ...prev, prefs: { ...prev.prefs, [key]: value } }));

  const save = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage({ type: '', text: '' });

    const body = {};
    for (const field of ALL_FIELDS) {
      const raw = form.values[field.key];
      const value = Number(raw);
      if (raw === '' || !Number.isFinite(value)) {
        return setMessage({ type: 'error', text: `${field.label} must be a number` });
      }
      if (field.int && !Number.isInteger(value)) {
        return setMessage({ type: 'error', text: `${field.label} must be a whole number` });
      }
      if (value < field.min || value > field.max) {
        return setMessage({ type: 'error', text: `${field.label} must be between ${field.min} and ${field.max}` });
      }
      body[field.key] = value;
    }

    if (body.defaultMinTempC >= body.defaultMaxTempC) {
      return setMessage({ type: 'error', text: 'Default maximum temperature must be greater than the minimum' });
    }
    if (body.criticalBatteryPct > body.lowBatteryPct) {
      return setMessage({ type: 'error', text: 'Critical battery level cannot be higher than the low battery level' });
    }

    body.gpsExpected = form.gpsExpected;
    body.alertPreferences = form.prefs;

    setSaving(true);
    try {
      const saved = await updateSettings(body);
      setForm(toForm(saved));
      setMessage({ type: 'ok', text: 'Settings saved and applied.' });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Thresholds, alert preferences, and device connectivity</p>
      </header>

      {!form && (
        <Card>
          {loaded.error ? (
            <EmptyState tone="red" title="Could not load settings" text={loaded.error} />
          ) : (
            <EmptyState title="Loading settings..." />
          )}
        </Card>
      )}

      {form && (
        <form onSubmit={save}>
          <fieldset disabled={!isAdmin} className="m-0 min-w-0 space-y-5 border-0 p-0">
            {GROUPS.map((group) => (
              <Card key={group.title} title={group.title} icon={SettingsIcon}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.fields.map((field) => (
                    <Field key={field.key} label={field.label} hint={field.hint}>
                      <input
                        className={inputClass}
                        type="number"
                        step={field.step}
                        min={field.min}
                        max={field.max}
                        value={form.values[field.key]}
                        onChange={setValue(field.key)}
                      />
                    </Field>
                  ))}
                </div>
              </Card>
            ))}

            <Card title="Alert preferences" icon={SettingsIcon}>
              <div className="grid gap-3 sm:grid-cols-2">
                {TOGGLES.map((toggle) => (
                  <Toggle
                    key={toggle.key}
                    label={toggle.label}
                    checked={form.prefs[toggle.key]}
                    onChange={setPref(toggle.key)}
                  />
                ))}
                <Toggle
                  label="Location tracking expected"
                  checked={form.gpsExpected}
                  onChange={(value) => setForm((prev) => ({ ...prev, gpsExpected: value }))}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Temperature alerts cannot be switched off. Turning a preference off also closes any active alert of that
                type on the next reading.
              </p>
            </Card>

            {message.text && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                  message.type === 'ok'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {message.type === 'ok' && <CheckCircle2 className="h-4 w-4" />}
                {message.text}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setForm(toForm(loaded.data))} disabled={saving}>
                Reset
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save settings'}
              </Button>
            </div>
          </fieldset>
          {!isAdmin && <p className="mt-3 text-xs text-slate-500">Settings are read-only for viewer accounts.</p>}
        </form>
      )}

      <Card title="Connectivity" icon={Wifi}>
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <Badge tone={summaryError ? 'red' : 'green'} dot>
            Backend {summaryError ? 'unreachable' : 'reachable'}
          </Badge>
          <Badge tone={connected ? 'green' : 'amber'} dot>
            Live updates {connected ? 'on' : 'off'}
          </Badge>
        </div>
        {devices.length === 0 ? (
          <EmptyState icon={Cpu} title="No devices have reported yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last seen</th>
                  <th className="px-3 py-2">Firmware</th>
                  <th className="px-3 py-2">Offline queue</th>
                  <th className="px-3 py-2">Shipment</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((item) => (
                  <tr key={item.deviceId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 font-semibold text-slate-900">
                      {item.deviceId} {item.isSimulated && <DemoBadge className="ml-2" />}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        tone={
                          item.connectionStatus === 'online' ? 'green' : item.connectionStatus === 'offline' ? 'red' : 'slate'
                        }
                        dot
                      >
                        {item.connectionStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {timeAgo(secondsSince(item.lastSeenAt))}
                      <div className="text-xs text-slate-400">{formatDateTime(item.lastSeenAt)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{item.firmwareVersion || '--'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{item.queuedRecords || 0} pending</td>
                    <td className="px-3 py-2.5 text-slate-600">{item.currentShipmentId || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Configuration is published to real devices on the retained topic coldchain/DEVICE_ID/config. Simulated
          devices are skipped.
        </p>
      </Card>
    </div>
  );
}