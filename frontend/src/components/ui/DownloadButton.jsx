import { useState } from 'react';
import { Download } from 'lucide-react';
import { errorMessage } from '../../api/client.js';
import { downloadFile } from '../../api/download.js';

export default function DownloadButton({ path, params, filename, label = 'Export CSV' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      await downloadFile(path, params, filename);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <Download className="h-4 w-4" /> {busy ? 'Preparing...' : label}
      </button>
      {error && <span className="max-w-xs text-right text-[11px] text-red-600">{error}</span>}
    </span>
  );
}