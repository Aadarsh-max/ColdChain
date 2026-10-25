import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Snowflake } from 'lucide-react';
import { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const target = (location.state && location.state.from) || '/';

  if (!loading && user) return <Navigate to={target} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setPassword('');
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

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
            <p className="text-sm text-slate-500">Use your approved account.</p>
          </div>

          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                className={`${inputClass} pr-10`}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </Field>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <Button type="submit" disabled={busy || loading} className="w-full">
            <LogIn className="h-4 w-4" /> {busy ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-slate-500">
            No account?{' '}
            <Link to="/signup" className="font-semibold text-blue-600 hover:underline">
              Request access
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}