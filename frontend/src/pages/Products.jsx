import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/api/products.api';
import { formatNGN, downloadBlob } from '@/lib/utils';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Plus, Pencil, Trash2, Copy, Search, X, Loader2, PlusCircle, MinusCircle, FileDown, Tag } from 'lucide-react';

// ── Category Modal ────────────────────────────────────────────────────────────
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

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ product, defaultCategoryId, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name ?? '',
    categoryId: product?.categoryId ?? defaultCategoryId ?? '',
    country: product?.country ?? 'Nigeria',
    costPrice: product?.costPrice ?? '',
    stock: product?.stock ?? 0,
    status: product?.status ?? true,
    paymentMethod: product?.paymentMethod ?? 'COD',
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
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cost Price (NGN) *
                <span className="block text-[10px] text-gray-400 font-normal">Amount you paid — not selling price</span>
              </label>
              <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Product Variations</label>
              <button onClick={addVariation} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <PlusCircle size={13} /> Add Variation
              </button>
            </div>
            {variations.map((v, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-start">
                <input placeholder="Variation name" value={v.name}
                  onChange={e => setVariations(vs => vs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                <input placeholder="Range" value={v.degreeRange}
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
                  onChange={e => setPricingTiers(ts => ts.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="flex gap-2">
              {[
                { value: 'COD',  label: 'COD Only',  desc: 'Cash on delivery' },
                { value: 'PBD',  label: 'PBD Only',  desc: 'Pay before delivery' },
                { value: 'BOTH', label: 'Both',       desc: 'Customer chooses' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, paymentMethod: opt.value }))}
                  className={`flex-1 border rounded-lg px-3 py-2 text-left transition-colors ${
                    form.paymentMethod === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [productModal, setProductModal] = useState(null);
  const [catModal, setCatModal] = useState(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  const { data: catsData, isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list({ limit: 200 }),
  });
  const cats = catsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, selectedCatId],
    queryFn: () => productsApi.list({ search: search || undefined, categoryId: selectedCatId || undefined }),
  });
  const products = data?.data ?? [];

  const deleteProdMutation = useMutation({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['products']); setDeleteProductTarget(null); },
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['categories']); setDeleteCatTarget(null); setSelectedCatId(''); },
  });

  const dupMutation = useMutation({
    mutationFn: (id) => productsApi.duplicate(id),
    onSuccess: () => qc.invalidateQueries(['products']),
  });

  const selectedCat = cats.find(c => c.id === selectedCatId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Catalogue</h2>
          <p className="text-sm text-gray-500">{cats.length} categories · {data?.pagination?.total ?? 0} products</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            setExporting(true);
            try {
              const blob = await productsApi.export({ search: search || undefined, categoryId: selectedCatId || undefined });
              downloadBlob(blob, `products-${new Date().toISOString().slice(0,10)}.xlsx`);
            } finally { setExporting(false); }
          }} disabled={exporting}
            className="flex items-center gap-2 border bg-white text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Export
          </button>
          <button onClick={() => setProductModal('create')}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Left: Categories panel */}
        <div className="w-56 shrink-0 bg-white rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categories</span>
            <button onClick={() => setCatModal('create')}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium" title="Add category">
              <Plus size={13} /> New
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
            {/* All Products button */}
            <button
              onClick={() => setSelectedCatId('')}
              className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2.5 border-b ${
                !selectedCatId ? 'bg-primary text-white font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Tag size={14} className="shrink-0" />
              <span className="flex-1 truncate font-medium">All Products</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${!selectedCatId ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {data?.pagination?.total ?? 0}
              </span>
            </button>
            {loadingCats ? (
              <div className="p-3 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : cats.map(cat => (
              <div
                key={cat.id}
                className={`group flex items-center gap-2.5 px-4 py-3 transition-colors cursor-pointer border-b last:border-0 ${
                  selectedCatId === cat.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedCatId(cat.id)}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${selectedCatId === cat.id ? 'bg-primary' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate font-medium ${selectedCatId === cat.id ? 'text-primary' : 'text-gray-800'}`}>{cat.name}</p>
                  {cat.brandName && <p className="text-[11px] text-gray-400 truncate">{cat.brandName}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{cat._count?.products ?? 0}</span>
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button onClick={e => { e.stopPropagation(); setCatModal(cat); }}
                    className="p-1 rounded hover:bg-gray-200 text-gray-400"><Pencil size={11} /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteCatTarget(cat); }}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
            {cats.length === 0 && !loadingCats && (
              <div className="px-4 py-8 text-center">
                <Tag size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">No categories yet</p>
                <button onClick={() => setCatModal('create')} className="mt-2 text-xs text-primary hover:underline">Create one</button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Products */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Search bar */}
          <div className="bg-white rounded-xl border p-3 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={selectedCat ? `Search in ${selectedCat.name}...` : 'Search products by name...'}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {selectedCatId && (
              <button onClick={() => setSelectedCatId('')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 border rounded-lg px-2 py-1.5 whitespace-nowrap">
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {/* Selected category info banner */}
          {selectedCat && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Tag size={15} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{selectedCat.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedCat.brandName && <span>{selectedCat.brandName}</span>}
                  {selectedCat.brandPhone && <span className="ml-2">· {selectedCat.brandPhone}</span>}
                  {!selectedCat.brandName && !selectedCat.brandPhone && <span>No brand info added</span>}
                </p>
              </div>
              <button onClick={() => setProductModal('create')}
                className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 shrink-0">
                <Plus size={12} /> Add Product
              </button>
              <button onClick={() => setCatModal(selectedCat)}
                className="flex items-center gap-1.5 text-xs border text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 shrink-0">
                <Pencil size={12} /> Edit Category
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Product</th>
                  {!selectedCatId && <th className="text-left px-4 py-3">Category</th>}
                  <th className="text-left px-4 py-3">Cost Price</th>
                  <th className="text-left px-4 py-3">Selling Prices</th>
                  <th className="text-left px-4 py-3">Stock</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}>{Array(selectedCatId ? 7 : 8).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                )) : products.length === 0 ? (
                  <tr><td colSpan={selectedCatId ? 7 : 8}>
                    <EmptyState
                      title={selectedCat ? `No products in "${selectedCat.name}" yet` : 'No products yet'}
                      description={selectedCat ? 'Click "Add Product" above to add one.' : 'Click "Add Product" to get started.'}
                    />
                  </td></tr>
                ) : products.map(p => {
                  const tiers = Array.isArray(p.pricingTiers) ? p.pricingTiers : [];
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {Array.isArray(p.variations) && p.variations.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">{p.variations.map(v => v.name).join(' · ')}</p>
                        )}
                      </td>
                      {!selectedCatId && <td className="px-4 py-3 text-gray-500 text-xs">{p.category?.name ?? '—'}</td>}
                      <td className="px-4 py-3 text-gray-600 text-xs font-medium">{formatNGN(p.costPrice)}</td>
                      <td className="px-4 py-3">
                        {tiers.length === 0 ? (
                          <span className="text-xs text-gray-400">No tiers set</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {tiers.map((t, i) => (
                              <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap"
                                title={t.label}>
                                {t.label ? `${t.label.slice(0,10)}${t.label.length>10?'…':''}: ` : ''}₦{Number(t.price).toLocaleString()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${p.stock < 5 ? 'text-red-600' : p.stock < 20 ? 'text-orange-500' : 'text-gray-700'}`}>
                          {p.stock}
                        </span>
                        {p.stock < 5 && <span className="ml-1 text-[10px] text-red-400">Low</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          p.paymentMethod === 'PBD'  ? 'bg-blue-100 text-blue-700' :
                          p.paymentMethod === 'BOTH' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {p.paymentMethod === 'PBD' ? 'Pay Before' : p.paymentMethod === 'BOTH' ? 'COD + PBD' : 'Cash on Delivery'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                          {p.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setProductModal(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit"><Pencil size={13} /></button>
                          <button onClick={() => dupMutation.mutate(p.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Duplicate"><Copy size={13} /></button>
                          <button onClick={() => setDeleteProductTarget(p)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {productModal && (
        <ProductModal
          product={productModal === 'create' ? null : productModal}
          defaultCategoryId={selectedCatId}
          onClose={() => setProductModal(null)}
        />
      )}
      {catModal && <CategoryModal cat={catModal === 'create' ? null : catModal} onClose={() => setCatModal(null)} />}

      <ConfirmDialog open={!!deleteProductTarget} title={`Deactivate "${deleteProductTarget?.name}"?`}
        description="The product will be marked inactive."
        onConfirm={() => deleteProdMutation.mutate(deleteProductTarget.id)}
        onCancel={() => setDeleteProductTarget(null)} loading={deleteProdMutation.isPending} />

      <ConfirmDialog open={!!deleteCatTarget} title={`Delete "${deleteCatTarget?.name}"?`}
        description="Products in this category must be moved first."
        onConfirm={() => deleteCatMutation.mutate(deleteCatTarget.id)}
        onCancel={() => setDeleteCatTarget(null)} loading={deleteCatMutation.isPending} />
    </div>
  );
}
