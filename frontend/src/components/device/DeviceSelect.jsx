export default function DeviceSelect({ devices, value, onChange }) {
  if (devices.length === 0) return null;

  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="text-slate-500">Device</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent font-semibold text-slate-900 outline-none"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.deviceId}
            {device.isSimulated ? ' (demo)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}