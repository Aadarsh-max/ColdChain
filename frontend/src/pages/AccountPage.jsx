import { useState } from 'react';
import { CheckCircle2, KeyRound, UserCircle } from 'lucide-react';
import { errorMessage } from '../api/client.js';
import { changePassword } from '../api/authApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';
import { MIN_PASSWORD, passwordProblem } from '../utils/password.js';
import { formatDateTime } from '../utils/format.js';

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{children}</span>
    </div>
  );
}

export default function AccountPage() {
  const { user, updateSession } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    const problem = passwordProblem(next);
    if (problem) return setMessage({ type: 'error', text: problem });
    if (next !== confirm) return setMessage({ type: 'error', text: 'The new passwords do not match' });
    if (next === current) return setMessage({ type: 'error', text: 'The new password must be different' });

    setBusy(true);
    try {
      const result = await changePassword(current, next);
      updateSession(result);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ type: 'ok', text: 'Password changed. Other sessions were signed out.' });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Account</h1>
        <p className="text-slate-500">Your profile and password</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Profile" icon={UserCircle}>
          <Row label="Name">{user.name}</Row>
          <Row label="Email">{user.email}</Row>
          <Row label="Role">
            <Badge tone={user.role === 'admin' ? 'purple' : 'slate'} className="capitalize">
              {user.role}
            </Badge>
          </Row>
          <Row label="Last sign in">{formatDateTime(user.lastLoginAt)}</Row>
          <p className="mt-3 text-xs text-slate-500">
            {user.role === 'admin'
              ? 'Admins can create and edit shipments, acknowledge alerts, change settings, and manage users.'
              : 'Viewers have read-only access. Ask an administrator if you need to make changes.'}
          </p>
        </Card>

        <Card title="Change password" icon={KeyRound}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Current password">
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                required
              />
            </Field>
            <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                required
              />
            </Field>
            <Field label="Confirm new password">
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </Field>

            {message.text && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  message.type === 'ok'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {message.type === 'ok' && <CheckCircle2 className="h-4 w-4" />}
                {message.text}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Change password'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}