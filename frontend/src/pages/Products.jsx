import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/api/products.api';
import { NIGERIA_STATES } from '@/lib/constants';
import { formatNGN, downloadBlob } from '@/lib/utils';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Plus, Pencil, Trash2, Copy, Search, X, Loader2, PlusCircle, MinusCircle, FileDown } from 'lucide-react';

function ProductModal({ product, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name ?? '',
    categoryId: product?.categoryId ?? '',
    country: product?.country ?? 'Nigeria',
    costPrice: product?.costPrice ?? '',
    stock: product?.stock ?? 0,
    status: product?.status ?? true,
  });
  const [variations, setVariations] = useState(product?.variations ?? []);
  const [pricingTiers, setPricingTiers] = useState(product?.pricingTiers ?? []);
  const [error, setError] = useState('');

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list({ limit: 200 }) });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? productsApi.update(product.id, data) : productsApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['products']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Save failed'),
  });

  const submit = () => {
    if (!form.name || !form.categoryId || !form.costPrice) return setError('Name, category, and cost price are required');
    mutation.mutate({ ...form, variations, pricingTiers });
  };

  const addVariation = () => setVariations(v => [...v, { name: '', degreeRange: '', description: '' }]);
  const addTier = () => setPricingTiers(t => [...t, { label: '', quantity: 1, price: '' }]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select category...</option>
                {cats?.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
              <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price (NGN) *</label>
              <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Variations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Product Variations</label>
              <button onClick={addVariation} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <PlusCircle size={13} /> Add Variation
              </button>
            </div>
            {variations.map((v, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-start">
                <input placeholder="Variation name (e.g. Degree)" value={v.name}
                  onChange={e => setVariations(vs => vs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                <input placeholder="Range (e.g. 35-45 years)" value={v.degreeRange}
                  onChange={e => setVariations(vs => vs.map((x, j) => j === i ? { ...x, degreeRange: e.target.value } : x))}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                <div className="flex gap-1">
                  <input placeholder="Description" value={v.description}
                    onChange={e => setVariations(vs => vs.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  <button onClick={() => setVariations(vs => vs.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600"><MinusCircle size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Tiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Pricing Tiers</label>
              <button onClick={addTier} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <PlusCircle size={13} /> Add Tier
              </button>
            </div>
            {pricingTiers.map((t, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
                <input placeholder="Label (e.g. REGULAR OFFER)" value={t.label}
                  onChange={e => setPricingTiers(ts => ts.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                <input type="number" placeholder="Qty" value={t.quantity}
                  onChange={e => setPricingTiers(ts => ts.map((x, j) => j === i ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                <div className="flex gap-1">
                  <input type="number" placeholder="Price (NGN)" value={t.price}
                    onChange={e => setPricingTiers(ts => ts.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  <button onClick={() => setPricingTiers(ts => ts.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600"><MinusCircle size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.checked }))} className="rounded" />
            Active product
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={mutation.isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, catFilter],
    queryFn: () => productsApi.list({ search: search || undefined, categoryId: catFilter || undefined }),
  });

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list({ limit: 200 }) });

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['products']); setDeleteTarget(null); },
  });

  const dupMutation = useMutation({
    mutationFn: (id) => productsApi.duplicate(id),
    onSuccess: () => qc.invalidateQueries(['products']),
  });

  const products = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Products</h2>
          <p className="text-sm text-gray-500">{data?.pagination?.total ?? 0} products</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            setExporting(true);
            try {
              const blob = await productsApi.export({ search: search || undefined, categoryId: catFilter || undefined });
              downloadBlob(blob, `products-${new Date().toISOString().slice(0,10)}.xlsx`);
            } finally { setExporting(false); }
          }} disabled={exporting}
            className="flex items-center gap-2 border bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Export
          </button>
          <button onClick={() => setModal('create')}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Categories</option>
          {cats?.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Cost Price</th>
              <th className="text-left px-4 py-3">Tiers</th>
              <th className="text-left px-4 py-3">Stock</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? Array(5).fill(0).map((_, i) => (
              <tr key={i}>{Array(7).fill(0).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
              ))}</tr>
            )) : products.length === 0 ? (
              <tr><td colSpan={7}><EmptyState title="No products yet" description="Add your first product." /></td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-gray-600">{p.category?.name}</td>
                <td className="px-4 py-3 text-gray-600">{formatNGN(p.costPrice)}</td>
                <td className="px-4 py-3 text-gray-600">{Array.isArray(p.pricingTiers) ? p.pricingTiers.length : 0} tiers</td>
                <td className="px-4 py-3 text-gray-600">{p.stock}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setModal(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={13} /></button>
                    <button onClick={() => dupMutation.mutate(p.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Duplicate"><Copy size={13} /></button>
                    <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <ProductModal product={modal === 'create' ? null : modal} onClose={() => setModal(null)} />}
      <ConfirmDialog open={!!deleteTarget} title={`Deactivate "${deleteTarget?.name}"?`}
        description="The product will be marked inactive."
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)} loading={deleteMutation.isPending} />
    </div>
  );
}
