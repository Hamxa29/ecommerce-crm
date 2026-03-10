import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { USER_ROLES } from '@/lib/constants';
import { formatDate, downloadBlob } from '@/lib/utils';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import { Plus, Pencil, UserX, Search, Loader2, X, FileDown } from 'lucide-react';

const PERMISSIONS = [
  { key: 'orders', label: 'Orders' },
  { key: 'financials', label: 'Financials' },
  { key: 'customers', label: 'Customer Data' },
  { key: 'products', label: 'Products' },
  { key: 'agents', label: 'Agents' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'reports', label: 'Reports' },
];

function UserModal({ user, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const [permissions, setPermissions] = useState(user?.permissions ?? {});
  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '', password: '',
    role: user?.role ?? 'STAFF', status: user?.status ?? true,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? usersApi.update(user.id, data) : usersApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['users']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Save failed'),
  });

  const submit = () => {
    if (!form.name || !form.email) return setError('Name and email are required');
    if (!isEdit && !form.password) return setError('Password is required');
    const payload = { ...form, permissions };
    if (!payload.password) delete payload.password;
    mutation.mutate(payload);
  };

  const inp = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[key]} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit User' : 'Add User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {inp('name', 'Full Name *')}
            {inp('email', 'Email *', 'email')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {inp('password', isEdit ? 'New Password (leave blank)' : 'Password *', 'password')}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!permissions[p.key]}
                    onChange={e => setPermissions(prev => ({ ...prev, [p.key]: e.target.checked }))}
                    className="rounded border-gray-300" />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.checked }))}
              className="rounded border-gray-300" />
            Active account
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={mutation.isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => usersApi.list({ search: search || undefined, role: roleFilter || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['users']); setDeleteTarget(null); },
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Users & Staff</h2>
          <p className="text-sm text-gray-500">{data?.pagination?.total ?? 0} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            setExporting(true);
            try {
              const blob = await usersApi.export({ search: search || undefined, role: roleFilter || undefined });
              downloadBlob(blob, `users-${new Date().toISOString().slice(0,10)}.xlsx`);
            } finally { setExporting(false); }
          }} disabled={exporting}
            className="flex items-center gap-2 border bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Export
          </button>
          <button onClick={() => setModal('create')}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus size={15} /> Add User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Roles</option>
          {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Last Login</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? Array(5).fill(0).map((_, i) => (
              <tr key={i}>{Array(6).fill(0).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
              ))}</tr>
            )) : users.length === 0 ? (
              <tr><td colSpan={6}><EmptyState title="No users found" /></td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {user.role?.replace('_', ' ').toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.status ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {user.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.lastLoginAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setModal(user)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteTarget(user)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"><UserX size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <UserModal user={modal === 'create' ? null : modal} onClose={() => setModal(null)} />}
      <ConfirmDialog open={!!deleteTarget} title={`Deactivate ${deleteTarget?.name}?`}
        description="They won't be able to log in until reactivated."
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)} loading={deleteMutation.isPending} />
    </div>
  );
}
