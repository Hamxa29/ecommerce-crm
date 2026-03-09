import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi } from '@/api/forms.api';
import { productsApi } from '@/api/products.api';
import { formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, Code, ExternalLink, FileText, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';

const DEFAULT_BUMP_CONFIG = {
  headline: 'Would You Like To Add To Your Order:',
  benefit: '',
  ctaText: 'Yes, I Will Take It!',
  urgencyText: 'This offer is only available here — not available elsewhere',
  imageUrl: '',
};

function EmbedModal({ formId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['form-embed', formId],
    queryFn: () => formsApi.getEmbed(formId),
  });

  const [copied, setCopied] = useState('');
  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-gray-900">Embed Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {isLoading ? <p className="text-gray-400">Loading...</p> : (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase">Direct URL</label>
                  <button onClick={() => copy(data.directUrl, 'url')} className="text-xs text-primary hover:underline">
                    {copied === 'url' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-700 flex-1 truncate">{data.directUrl}</span>
                  <a href={data.directUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary shrink-0">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase">iFrame Embed</label>
                  <button onClick={() => copy(data.iframe, 'iframe')} className="text-xs text-primary hover:underline">
                    {copied === 'iframe' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{data.iframe}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BumpConfigPanel({ productId, config, onChange }) {
  const [open, setOpen] = useState(false);
  const c = config ?? DEFAULT_BUMP_CONFIG;
  const set = (key, val) => onChange(productId, { ...c, [key]: val });

  return (
    <div className="ml-6 mt-2 border border-yellow-200 rounded-xl bg-yellow-50 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100 transition">
        <span>⚡ Configure Bump Offer</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="p-3 space-y-2 border-t border-yellow-200">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Headline</label>
            <input value={c.headline} onChange={e => set('headline', e.target.value)}
              placeholder="Would You Like To Add To Your Order:"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Benefit / Description</label>
            <input value={c.benefit} onChange={e => set('benefit', e.target.value)}
              placeholder="e.g. Designed for safe driving at night"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">CTA Button Text</label>
            <input value={c.ctaText} onChange={e => set('ctaText', e.target.value)}
              placeholder="Yes, I Will Take It!"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Urgency Text</label>
            <input value={c.urgencyText} onChange={e => set('urgencyText', e.target.value)}
              placeholder="This offer is only available here — not available elsewhere"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Image URL (optional)</label>
            <input value={c.imageUrl} onChange={e => set('imageUrl', e.target.value)}
              placeholder="https://..."
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
          </div>
        </div>
      )}
    </div>
  );
}

function FormModal({ form, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!form;
  const [name, setName] = useState(form?.name ?? '');
  const [slug, setSlug] = useState(form?.slug ?? '');
  const [selectedProducts, setSelectedProducts] = useState(
    form?.products?.map(fp => ({ productId: fp.productId, isUpsell: fp.isUpsell })) ?? []
  );
  const [bumpConfigs, setBumpConfigs] = useState(form?.embedSettings?.bumps ?? {});
  const [error, setError] = useState('');

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.list({ limit: 200 }).then(r => Array.isArray(r) ? r : r.data ?? []),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? formsApi.update(form.id, data) : formsApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['forms']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? e.message ?? 'Failed to save form'),
  });

  const autoSlug = (val) => {
    setName(val);
    if (!isEdit) setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.productId === productId);
      if (exists) return prev.filter(p => p.productId !== productId);
      return [...prev, { productId, isUpsell: false }];
    });
  };

  const toggleUpsell = (productId) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.productId !== productId) return p;
      const nowUpsell = !p.isUpsell;
      if (nowUpsell && !bumpConfigs[productId]) {
        setBumpConfigs(bc => ({ ...bc, [productId]: { ...DEFAULT_BUMP_CONFIG } }));
      }
      return { ...p, isUpsell: nowUpsell };
    }));
  };

  const updateBumpConfig = (productId, config) => {
    setBumpConfigs(prev => ({ ...prev, [productId]: config }));
  };

  const handleSave = () => {
    if (!name.trim() || !slug.trim()) return;
    const bumpsForSave = {};
    selectedProducts.filter(p => p.isUpsell).forEach(p => {
      bumpsForSave[p.productId] = bumpConfigs[p.productId] ?? { ...DEFAULT_BUMP_CONFIG };
    });
    saveMutation.mutate({
      name, slug, products: selectedProducts,
      embedSettings: { bumps: bumpsForSave },
    });
  };

  const products = Array.isArray(allProducts) ? allProducts : allProducts.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h3 className="font-semibold text-gray-900">{isEdit ? 'Edit Form' : 'Create Form'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
            <input value={name} onChange={e => autoSlug(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Slimming Tea Order Form" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
            <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
              <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500 border-r">/form/</span>
              <input value={slug} onChange={e => setSlug(e.target.value)}
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                placeholder="slimming-tea" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Products on this Form</label>
            {products.length === 0 ? (
              <p className="text-sm text-gray-400">No products found. Create products first.</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto border rounded-lg p-3">
                {products.map(p => {
                  const selected = selectedProducts.find(sp => sp.productId === p.id);
                  return (
                    <div key={p.id}>
                      <div className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-gray-50'}`}
                        onClick={() => toggleProduct(p.id)}>
                        <input type="checkbox" readOnly checked={!!selected} className="accent-primary" />
                        <span className="flex-1 text-sm text-gray-800">{p.name}</span>
                        {selected && (
                          <label className="flex items-center gap-1.5 text-xs text-gray-500" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={selected.isUpsell} onChange={() => toggleUpsell(p.id)} className="accent-yellow-500" />
                            <span className={selected.isUpsell ? 'text-yellow-700 font-semibold' : ''}>Order Bump</span>
                          </label>
                        )}
                      </div>
                      {selected?.isUpsell && (
                        <BumpConfigPanel
                          productId={p.id}
                          config={bumpConfigs[p.id]}
                          onChange={updateBumpConfig}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="p-5 border-t shrink-0 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saveMutation.isPending || !name || !slug}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Form'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Forms() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [embedFormId, setEmbedFormId] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: formsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => formsApi.remove(id),
    onSuccess: () => qc.invalidateQueries(['forms']),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) => formsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(['forms']),
  });

  return (
    <div className="space-y-5">
      {embedFormId && <EmbedModal formId={embedFormId} onClose={() => setEmbedFormId(null)} />}
      {(showModal || editForm) && (
        <FormModal
          form={editForm}
          onClose={() => { setShowModal(false); setEditForm(null); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Order Forms</h1>
          <p className="text-sm text-gray-500 mt-0.5">Embeddable order forms for your website</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
          <Plus size={16} /> New Form
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-400">Loading...</div>
      ) : data.length === 0 ? (
        <div className="bg-white border rounded-xl py-20 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No forms yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first order form to start accepting orders online</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
            Create Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map(form => (
            <div key={form.id} className="bg-white border rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{form.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">/form/{form.slug}</p>
                </div>
                <button onClick={() => toggleMutation.mutate({ id: form.id, status: !form.status })}
                  className={`text-lg ${form.status ? 'text-green-500' : 'text-gray-300'}`}>
                  {form.status ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">{form.hits ?? 0}</p>
                  <p className="text-xs text-gray-500">Hits</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-700">{form.conversions ?? 0}</p>
                  <p className="text-xs text-green-600">Orders</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-orange-700">{form.abandonments ?? 0}</p>
                  <p className="text-xs text-orange-600">Abandoned</p>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                {form.products?.length ?? 0} product{form.products?.length !== 1 ? 's' : ''} · Created {formatDate(form.createdAt)}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t">
                <button onClick={() => setEmbedFormId(form.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50">
                  <Code size={12} /> Embed
                </button>
                <button onClick={() => setEditForm(form)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => { if (confirm('Delete this form?')) deleteMutation.mutate(form.id); }}
                  className="p-1.5 text-red-400 border border-red-100 rounded-lg hover:bg-red-50">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
