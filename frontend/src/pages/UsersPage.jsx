import { useState } from 'react';
import { Check, KeyRound, Pencil, Plus, UserCog, Wand2, X } from 'lucide-react';
import { errorMessage } from '../api/client.js';
import { createUser, fetchUsers, resetUserPassword, updateUser } from '../api/authApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';
import Modal from '../components/ui/Modal.jsx';
import { formatDateTime } from '../utils/format.js';
import { MIN_PASSWORD, generatePassword, passwordProblem } from '../utils/password.js';

const APPROVAL_TONE = { approved: 'green', pending: 'amber', rejected: 'red' };

function FormError({ text }) {
  if (!text) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{text}</div>;
}

function Actions({ onCancel, saving, label }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <Button variant="secondary" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : label}
      </Button>
    </div>
  );
}

function PasswordField({ value, onChange }) {
  return (
    <Field label="Password" hint={`At least ${MIN_PASSWORD} characters. Share it with the user privately.`}>
      <div className="flex gap-2">
        <input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} autoComplete="off" />
        <Button variant="secondary" onClick={() => onChange(generatePassword())}>
          <Wand2 className="h-4 w-4" /> Generate
        </Button>
      </div>
    </Field>
  );
}

function CreateForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Name is required');
    if (!form.email.includes('@')) return setError('Enter a valid email address');
    const problem = passwordProblem(form.password);
    if (problem) return setError(problem);

    setSaving(true);
    try {
      await onSubmit({ ...form, name: form.name.trim(), email: form.email.trim() });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <input className={inputClass} value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Role">
          <select className={inputClass} value={form.role} onChange={set('role')}>
            <option value="viewer">Viewer (read-only)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </Field>
      </div>
      <PasswordField value={form.password} onChange={(value) => setForm((prev) => ({ ...prev, password: value }))} />
      <FormError text={error} />
      <Actions onCancel={onCancel} saving={saving} label="Create user" />
    </form>
  );
}

function EditForm({ user, isSelf, onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: user.name, role: user.role, active: user.active });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Name is required');

    const changes = {};
    if (form.name.trim() !== user.name) changes.name = form.name.trim();
    if (form.role !== user.role) changes.role = form.role;
    if (form.active !== user.active) changes.active = form.active;
    if (Object.keys(changes).length === 0) return onCancel();

    setSaving(true);
    try {
      await onSubmit(changes);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </Field>
        <Field label="Email">
          <input className={inputClass} value={user.email} disabled />
        </Field>
        <Field label="Role">
          <select
            className={inputClass}
            value={form.role}
            disabled={isSelf}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="viewer">Viewer (read-only)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </Field>
        <Field label="Account status">
          <select
            className={inputClass}
            value={form.active ? 'active' : 'disabled'}
            disabled={isSelf}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === 'active' }))}
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled (cannot sign in)</option>
          </select>
        </Field>
      </div>
      {isSelf && <p className="text-xs text-slate-500">You cannot change your own role or disable your own account.</p>}
      <FormError text={error} />
      <Actions onCancel={onCancel} saving={saving} label="Save changes" />
    </form>
  );
}

function ResetForm({ user, onSubmit, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const problem = passwordProblem(password);
    if (problem) return setError(problem);

    setSaving(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Set a new password for <strong>{user.email}</strong>. Their current sessions will be signed out and a locked
        account will be unlocked.
      </p>
      <PasswordField value={password} onChange={setPassword} />
      <FormError text={error} />
      <Actions onCancel={onCancel} saving={saving} label="Reset password" />
    </form>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');

  const list = useFetch(fetchUsers, 'users', { refreshKey: reload });
  const rows = list.data;
  const pending = rows ? rows.filter((item) => item.approval === 'pending') : [];

  const finish = () => {
    setDialog(null);
    setReload((value) => value + 1);
  };

  const decide = async (item, approval) => {
    setBusyId(item.id);
    setActionError('');
    try {
      await updateUser(item.id, { approval });
      setReload((value) => value + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const titles = {
    create: 'New user',
    edit: dialog && dialog.user ? `Edit ${dialog.user.email}` : '',
    reset: dialog && dialog.user ? `Reset password for ${dialog.user.email}` : ''
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500">
            People can request access from the sign in page. Requests wait here until you approve them.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="h-4 w-4" /> New user
        </Button>
      </header>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>
      )}

      {pending.length > 0 && (
        <Card title={`Pending approval (${pending.length})`} icon={UserCog}>
          <ul className="divide-y divide-slate-100">
            {pending.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-sm text-slate-500">
                    {item.email} · requested {formatDateTime(item.createdAt)} · will join as viewer
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busyId === item.id} onClick={() => decide(item, 'approved')}>
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => decide(item, 'rejected')}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Accounts" icon={UserCog}>
        {!rows && list.loading && <EmptyState title="Loading users..." />}
        {!rows && !list.loading && list.error && <EmptyState tone="red" title="Could not load users" text={list.error} />}
        {rows && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Approval</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last sign in</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const isSelf = item.id === me.id;
                  return (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {item.name}
                        {isSelf && (
                          <Badge tone="blue" className="ml-2 !px-1.5 !py-0 text-[10px]">
                            you
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{item.email}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={item.role === 'admin' ? 'purple' : 'slate'} className="capitalize">
                          {item.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={APPROVAL_TONE[item.approval] || 'slate'} className="capitalize">
                          {item.approval}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={item.active ? 'green' : 'red'} dot>
                          {item.active ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatDateTime(item.lastLoginAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        {item.approval === 'rejected' && (
                          <Button size="sm" variant="ghost" disabled={busyId === item.id} onClick={() => decide(item, 'approved')}>
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setDialog({ type: 'edit', user: item })}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        {!isSelf && (
                          <Button size="sm" variant="ghost" onClick={() => setDialog({ type: 'reset', user: item })}>
                            <KeyRound className="h-3.5 w-3.5" /> Reset password
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Accounts are disabled rather than deleted, so alert history keeps its names. Role changes, approvals and
          disabling take effect on the next request.
        </p>
      </Card>

      <Modal open={Boolean(dialog)} title={dialog ? titles[dialog.type] : ''} onClose={() => setDialog(null)}>
        {dialog && dialog.type === 'create' && (
          <CreateForm
            onSubmit={async (body) => {
              await createUser(body);
              finish();
            }}
            onCancel={() => setDialog(null)}
          />
        )}
        {dialog && dialog.type === 'edit' && (
          <EditForm
            key={dialog.user.id}
            user={dialog.user}
            isSelf={dialog.user.id === me.id}
            onSubmit={async (changes) => {
              await updateUser(dialog.user.id, changes);
              finish();
            }}
            onCancel={() => setDialog(null)}
          />
        )}
        {dialog && dialog.type === 'reset' && (
          <ResetForm
            key={dialog.user.id}
            user={dialog.user}
            onSubmit={async (password) => {
              await resetUserPassword(dialog.user.id, password);
              finish();
            }}
            onCancel={() => setDialog(null)}
          />
        )}
      </Modal>
    </div>
  );
}