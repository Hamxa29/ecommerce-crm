import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/api/products.api';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Plus, Pencil, Trash2, Copy, Search, X, Loader2 } from 'lucide-react';

function CategoryModal({ cat, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!cat;
  const [form, setForm] = useState({
    name: cat?.name ?? '', brandName: cat?.brandName ?? '',
    brandPhone: cat?.brandPhone ?? '', brandEmail: cat?.brandEmail ?? '',
    brandWhatsapp: cat?.brandWhatsapp ?? '', senderId: cat?.senderId ?? '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? categoriesApi.update(cat.id, data) : categoriesApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['categories']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Save failed'),
  });

  const inp = (key, label, type = 'text') => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {inp('name', 'Category Name *')}
          {inp('brandName', 'Brand Name')}
          <div className="grid grid-cols-2 gap-3">
            {inp('brandPhone', 'Brand Phone')}
            {inp('brandWhatsapp', 'Brand WhatsApp')}
          </div>
          {inp('brandEmail', 'Brand Email', 'email')}
          {inp('senderId', 'Sender ID')}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => { if (!form.name) return setError('Name required'); mutation.mutate(form); }}
              disabled={mutation.isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductCategories() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => categoriesApi.list({ search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['categories']); setDeleteTarget(null); },
  });

  const dupMutation = useMutation({
    mutationFn: (id) => categoriesApi.duplicate(id),
    onSuccess: () => qc.invalidateQueries(['categories']),
  });

  const cats = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Product Categories</h2>
          <p className="text-sm text-gray-500">{data?.pagination?.total ?? 0} categories</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={15} /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Brand</th>
              <th className="text-left px-4 py-3">Brand Phone</th>
              <th className="text-left px-4 py-3">WhatsApp</th>
              <th className="text-left px-4 py-3">Products</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? Array(4).fill(0).map((_, i) => (
              <tr key={i}>{Array(6).fill(0).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
              ))}</tr>
            )) : cats.length === 0 ? (
              <tr><td colSpan={6}><EmptyState title="No categories yet" description="Add your first product category." /></td></tr>
            ) : cats.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-3 text-gray-600">{cat.brandName || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{cat.brandPhone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{cat.brandWhatsapp || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{cat._count?.products ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setModal(cat)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={13} /></button>
                    <button onClick={() => dupMutation.mutate(cat.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Duplicate"><Copy size={13} /></button>
                    <button onClick={() => setDeleteTarget(cat)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <CategoryModal cat={modal === 'create' ? null : modal} onClose={() => setModal(null)} />}
      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.name}"?`}
        description="Products in this category must be moved first."
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)} loading={deleteMutation.isPending} />
    </div>
  );
}
