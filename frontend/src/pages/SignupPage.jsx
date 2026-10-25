import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Snowflake, UserPlus } from 'lucide-react';
import { errorMessage } from '../api/client.js';
import { signup } from '../api/authApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';
import { MIN_PASSWORD, passwordProblem } from '../utils/password.js';

export default function SignupPage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  if (!loading && user) return <Navigate to="/" replace />;

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Name is required');
    if (!form.email.includes('@')) return setError('Enter a valid email address');
    const problem = passwordProblem(form.password);
    if (problem) return setError(problem);
    if (form.password !== form.confirm) return setError('The passwords do not match');

    setBusy(true);
    try {
      const result = await signup({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      setDone(result.message);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <Snowflake className="h-10 w-10 text-sky-400" strokeWidth={2} />
          <span className="text-2xl font-bold">Cold-Chain Guardian</span>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          {done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h1 className="text-xl font-bold text-slate-900">Request sent</h1>
              <p className="text-sm text-slate-600">{done}</p>
              <Link to="/login" className="inline-block text-sm font-semibold text-blue-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Request access</h1>
                <p className="text-sm text-slate-500">
                  An administrator must approve your account. New accounts are read-only viewers.
                </p>
              </div>

              <Field label="Full name">
                <input className={inputClass} value={form.name} onChange={set('name')} autoFocus />
              </Field>
              <Field label="Email">
                <input className={inputClass} type="email" autoComplete="username" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="Password" hint={`At least ${MIN_PASSWORD} characters.`}>
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set('password')}
                />
              </Field>
              <Field label="Confirm password">
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={set('confirm')}
                />
              </Field>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <Button type="submit" disabled={busy} className="w-full">
                <UserPlus className="h-4 w-4" /> {busy ? 'Sending...' : 'Request access'}
              </Button>

              <p className="text-center text-sm text-slate-500">
                Already approved?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}