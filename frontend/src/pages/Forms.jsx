import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi } from '@/api/forms.api';
import { productsApi } from '@/api/products.api';
import { formatDate } from '@/lib/utils';
import {
  Plus, Pencil, Trash2, Code, ExternalLink, FileText,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, GripVertical,
} from 'lucide-react';

// ── Default embed settings ────────────────────────────────────────────────────
const DEFAULT_FIELDS = {
  name:    { show: true,  required: true,  label: 'Your Name' },
  phone:   { show: true,  required: true,  label: 'Your Phone Number' },
  phone2:  { show: true,  required: false, label: 'WhatsApp Number' },
  email:   { show: true,  required: false, label: 'Your Email Address To Get Receipt' },
  address: { show: true,  required: true,  label: 'Your Full Address' },
  state:   { show: true,  required: true,  label: 'Your Delivery State' },
  age:     { show: false, required: false, label: 'Your Age' },
};

const DEFAULT_SETTINGS = {
  header: 'Please Fill The Form Below To Place Your Order',
  subheader: 'Only Serious Buyers Should Fill The Form Below',
  submitText: 'ORDER NOW →',
  fields: DEFAULT_FIELDS,
  customFields: [],
  bumps: {},
};

const FIELD_META = {
  name:    { title: 'Name' },
  phone:   { title: 'Phone Number', note: 'Shows +234 prefix' },
  phone2:  { title: 'WhatsApp Number', note: 'Shows +234 prefix' },
  email:   { title: 'Email Address' },
  address: { title: 'Full Address' },
  state:   { title: 'Delivery State', note: 'State dropdown' },
  age:     { title: 'Age' },
};

// ── Mini Toggle ───────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

// ── Embed Modal ───────────────────────────────────────────────────────────────
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

// ── Bump Config Panel ─────────────────────────────────────────────────────────
function BumpConfigPanel({ productId, config, onChange }) {
  const [open, setOpen] = useState(false);
  const c = config ?? {};
  const set = (key, val) => onChange(productId, { ...c, [key]: val });

  const tiers = c.tiers ?? [];
  const addTier = () => set('tiers', [...tiers, { label: '', price: '' }]);
  const updateTier = (i, key, val) => {
    const next = tiers.map((t, idx) => idx === i ? { ...t, [key]: val } : t);
    set('tiers', next);
  };
  const removeTier = (i) => set('tiers', tiers.filter((_, idx) => idx !== i));

  const hasMultiTiers = tiers.length > 0;

  return (
    <div className="ml-6 mt-1.5 border border-yellow-200 rounded-xl bg-yellow-50 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-100 transition">
        <span>⚡ Configure Bump Offer</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="p-3 space-y-3 border-t border-yellow-200 text-xs">

          {/* Headline & text */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-gray-600 mb-0.5">Headline</label>
              <input value={c.headline ?? ''} onChange={e => set('headline', e.target.value)}
                placeholder="Would You Like To Add To Your Order:"
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
            </div>
            <div>
              <label className="block font-medium text-gray-600 mb-0.5">CTA Button Text</label>
              <input value={c.ctaText ?? ''} onChange={e => set('ctaText', e.target.value)}
                placeholder="Yes, I Will Take It!"
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-0.5">Product Description / Benefit</label>
            <input value={c.benefit ?? ''} onChange={e => set('benefit', e.target.value)}
              placeholder="e.g. Designed for safe driving at night"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-0.5">Scarcity / Urgency Text</label>
            <input value={c.urgencyText ?? ''} onChange={e => set('urgencyText', e.target.value)}
              placeholder="This offer is only available here"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
          </div>

          <div>
            <label className="block font-medium text-gray-600 mb-0.5">Bump Image URL (optional)</label>
            <input value={c.imageUrl ?? ''} onChange={e => set('imageUrl', e.target.value)}
              placeholder="https://..."
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
          </div>

          {/* Pricing — either flat price OR multiple tiers */}
          <div className="border border-yellow-300 rounded-xl p-3 space-y-2 bg-white">
            <p className="font-semibold text-gray-700">Bump Pricing</p>

            {!hasMultiTiers ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-gray-600 mb-0.5">Offer Price (₦) *</label>
                  <input type="number" value={c.bumpPrice ?? ''} onChange={e => set('bumpPrice', e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
                <div>
                  <label className="block font-medium text-gray-600 mb-0.5">Regular Price (₦) <span className="font-normal text-gray-400">strikethrough</span></label>
                  <input type="number" value={c.regularPrice ?? ''} onChange={e => set('regularPrice', e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {tiers.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={tier.label} onChange={e => updateTier(i, 'label', e.target.value)}
                      placeholder={`Option name (e.g. Silver)`}
                      className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">₦</span>
                      <input type="number" value={tier.price} onChange={e => updateTier(i, 'price', e.target.value)}
                        placeholder="Price"
                        className="w-24 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                    </div>
                    <button type="button" onClick={() => removeTier(i)} className="text-red-400 hover:text-red-600 px-1">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {!hasMultiTiers ? (
                <button type="button" onClick={addTier}
                  className="text-xs text-yellow-700 underline hover:text-yellow-900">
                  + Switch to multiple pricing options (like regular/silver/gold)
                </button>
              ) : (
                <>
                  <button type="button" onClick={addTier}
                    className="text-xs bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg px-3 py-1 hover:bg-yellow-200">
                    + Add Option
                  </button>
                  <button type="button" onClick={() => set('tiers', [])}
                    className="text-xs text-gray-400 underline hover:text-gray-600">
                    Switch to single price
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Form Builder Modal ───────────────────────────────────────────────────
function FormModal({ form, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!form;

  // Merge saved embedSettings with defaults
  const savedSettings = form?.embedSettings ?? {};
  const [name, setName] = useState(form?.name ?? '');
  const [slug, setSlug] = useState(form?.slug ?? '');
  const [header, setHeader] = useState(savedSettings.header ?? DEFAULT_SETTINGS.header);
  const [subheader, setSubheader] = useState(savedSettings.subheader ?? DEFAULT_SETTINGS.subheader);
  const [submitText, setSubmitText] = useState(savedSettings.submitText ?? DEFAULT_SETTINGS.submitText);

  // Field config: merge saved with defaults
  const initFields = {};
  Object.keys(DEFAULT_FIELDS).forEach(k => {
    initFields[k] = { ...DEFAULT_FIELDS[k], ...(savedSettings.fields?.[k] ?? {}) };
  });
  const [fields, setFields] = useState(initFields);

  const [customFields, setCustomFields] = useState(savedSettings.customFields ?? []);
  const [selectedProducts, setSelectedProducts] = useState(
    form?.products?.map(fp => ({ productId: fp.productId, isUpsell: fp.isUpsell })) ?? []
  );
  const [bumpConfigs, setBumpConfigs] = useState(savedSettings.bumps ?? {});
  const [formType, setFormType] = useState(savedSettings.formType ?? 'order_form');
  const [paymentMethod, setPaymentMethod] = useState(form?.paymentMethod ?? null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('fields'); // 'fields' | 'products' | 'style'

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

  const setField = (key, prop, val) => setFields(f => ({ ...f, [key]: { ...f[key], [prop]: val } }));

  const addCustomField = () => {
    setCustomFields(cf => [...cf, { id: `cf_${Date.now()}`, label: '', required: false, type: 'text' }]);
  };
  const updateCF = (id, key, val) => setCustomFields(cf => cf.map(f => f.id === id ? { ...f, [key]: val } : f));
  const removeCF = (id) => setCustomFields(cf => cf.filter(f => f.id !== id));

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => {
      const hasMain = prev.some(p => p.productId === productId && !p.isUpsell);
      if (hasMain) {
        // Remove ALL entries for this product (main + bump if any)
        return prev.filter(p => p.productId !== productId);
      }
      return [...prev, { productId, isUpsell: false }];
    });
  };

  const toggleUpsell = (productId) => {
    setSelectedProducts(prev => {
      const hasBump = prev.some(p => p.productId === productId && p.isUpsell);
      if (hasBump) {
        // Remove bump entry only — keep the main (isUpsell: false) entry
        return prev.filter(p => !(p.productId === productId && p.isUpsell));
      } else {
        // Add a SECOND entry as bump — the main entry stays untouched
        if (!bumpConfigs[productId]) {
          setBumpConfigs(bc => ({ ...bc, [productId]: { headline: 'Would You Like To Add To Your Order:', ctaText: 'Yes, I Will Take It!', urgencyText: 'This offer is only available here', tiers: [], bumpPrice: '' } }));
        }
        return [...prev, { productId, isUpsell: true }];
      }
    });
  };

  const handleSave = () => {
    if (!name.trim() || !slug.trim()) return setError('Form name and slug are required');
    saveMutation.mutate({
      name: name.trim(),
      slug: slug.trim(),
      paymentMethod: paymentMethod || null,
      products: selectedProducts,
      embedSettings: { header, subheader, submitText, fields, customFields, bumps: bumpConfigs, formType },
    });
  };

  const products = Array.isArray(allProducts) ? allProducts : allProducts.data ?? [];
  const TAB = 'px-3 py-1.5 text-xs font-medium rounded-lg transition';
  const tabs = [
    { id: 'fields', label: 'Form Fields' },
    { id: 'products', label: 'Products & Bumps' },
    { id: 'style', label: 'Style & Text' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h3 className="font-semibold text-gray-900">{isEdit ? 'Edit Form' : 'Create Form'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="px-5 pt-4 space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Form Name *</label>
              <input value={name} onChange={e => autoSlug(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Posture Corrector Form" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL Slug *</label>
              <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
                <span className="bg-gray-50 px-2 py-2 text-xs text-gray-500 border-r shrink-0">/form/</span>
                <input value={slug} onChange={e => setSlug(e.target.value)}
                  className="flex-1 px-2 py-2 text-sm focus:outline-none min-w-0"
                  placeholder="posture-form" />
              </div>
            </div>
          </div>

          {/* Form type */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-700 shrink-0">Form Type:</span>
            {[{ value: 'order_form', label: 'Order Form' }, { value: 'upsell_form', label: 'Upsell Form' }].map(opt => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input type="radio" name="formType" value={opt.value} checked={formType === opt.value}
                  onChange={() => setFormType(opt.value)} className="accent-primary" />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {tabs.map(t => (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                className={`${TAB} flex-1 ${activeTab === t.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3">

          {/* ── Tab: Form Fields ── */}
          {activeTab === 'fields' && (
            <div className="py-3 space-y-3">
              <div className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
                Toggle which fields appear on your form. Required fields show an asterisk (*).
              </div>

              {/* Standard fields table */}
              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1fr_60px_60px] gap-0 bg-gray-50 border-b px-3 py-2 text-xs font-semibold text-gray-600">
                  <span>Field Label</span>
                  <span className="text-center">Required</span>
                  <span className="text-center">Show</span>
                </div>
                {Object.entries(FIELD_META).map(([key, meta]) => (
                  <div key={key} className={`grid grid-cols-[1fr_60px_60px] gap-0 px-3 py-2.5 items-center border-b last:border-b-0 ${!fields[key]?.show ? 'opacity-40' : ''}`}>
                    <div className="space-y-1 pr-3">
                      <div className="flex items-center gap-1.5">
                        <GripVertical size={12} className="text-gray-300" />
                        <span className="text-xs font-medium text-gray-700">{meta.title}</span>
                        {meta.note && <span className="text-[10px] text-gray-400">({meta.note})</span>}
                      </div>
                      <input
                        value={fields[key]?.label ?? ''}
                        onChange={e => setField(key, 'label', e.target.value)}
                        placeholder={DEFAULT_FIELDS[key].label}
                        className="w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 bg-gray-50"
                      />
                    </div>
                    <div className="flex justify-center">
                      <Toggle checked={fields[key]?.required ?? false} onChange={v => setField(key, 'required', v)} />
                    </div>
                    <div className="flex justify-center">
                      <Toggle checked={fields[key]?.show ?? false} onChange={v => setField(key, 'show', v)} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700">Custom Fields</p>
                  <button type="button" onClick={addCustomField}
                    className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90">
                    <Plus size={12} /> Add Field
                  </button>
                </div>
                {customFields.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3 border border-dashed rounded-xl">
                    No custom fields yet. Click "Add Field" to add one (e.g. "Occupation", "Nearest Bus Stop").
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customFields.map(cf => (
                      <div key={cf.id} className="flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2">
                        <input value={cf.label} onChange={e => updateCF(cf.id, 'label', e.target.value)}
                          placeholder="Field label (e.g. Nearest Bus Stop)"
                          className="flex-1 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30" />
                        <select value={cf.type} onChange={e => updateCF(cf.id, 'type', e.target.value)}
                          className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white">
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="textarea">Long Text</option>
                        </select>
                        <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                          <input type="checkbox" checked={cf.required} onChange={e => updateCF(cf.id, 'required', e.target.checked)} className="accent-primary" />
                          Required
                        </label>
                        <button type="button" onClick={() => removeCF(cf.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Products & Bumps ── */}
          {activeTab === 'products' && (
            <div className="py-3 space-y-3">
              <div className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
                Select the main product(s) for this form. Check "Order Bump" to add a separate product as an add-on offer.
              </div>
              {products.length === 0 ? (
                <p className="text-sm text-gray-400">No products found. Create products first.</p>
              ) : (
                <div className="space-y-1 max-h-[440px] overflow-y-auto border rounded-xl p-2">
                  {products.map(p => {
                    const isMain = selectedProducts.some(sp => sp.productId === p.id && !sp.isUpsell);
                    const isBump = selectedProducts.some(sp => sp.productId === p.id && sp.isUpsell);
                    const isSelected = isMain || isBump;
                    return (
                      <div key={p.id}>
                        <div className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer ${isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-gray-50 border border-transparent'}`}
                          onClick={() => toggleProduct(p.id)}>
                          <input type="checkbox" readOnly checked={isMain} className="accent-primary" />
                          <div className="flex-1">
                            <span className="text-sm text-gray-800 font-medium">{p.name}</span>
                            {p.pricingTiers?.length > 0 && (
                              <span className="ml-2 text-xs text-gray-400">
                                {p.pricingTiers.length} pricing option{p.pricingTiers.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {isMain && (
                            <label className="flex items-center gap-1.5 text-xs shrink-0" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isBump}
                                onChange={() => toggleUpsell(p.id)} className="accent-yellow-500" />
                              <span className={`font-medium ${isBump ? 'text-yellow-700' : 'text-gray-500'}`}>
                                Order Bump
                              </span>
                            </label>
                          )}
                        </div>
                        {isBump && (
                          <BumpConfigPanel
                            productId={p.id}
                            config={bumpConfigs[p.id]}
                            onChange={(id, cfg) => setBumpConfigs(prev => ({ ...prev, [id]: cfg }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Style & Text ── */}
          {activeTab === 'style' && (
            <div className="py-3 space-y-3">

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Payment Method Override</label>
                <div className="flex gap-2">
                  {[
                    { value: null,   label: 'Inherit',  desc: 'From product' },
                    { value: 'COD',  label: 'COD Only',  desc: 'Cash on delivery' },
                    { value: 'PBD',  label: 'PBD Only',  desc: 'Pay before delivery' },
                    { value: 'BOTH', label: 'Both',       desc: 'Customer chooses' },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`flex-1 border rounded-lg px-2 py-2 text-left transition-colors ${
                        paymentMethod === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">When set to "Inherit", uses the payment method configured on each product.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Form Header Text</label>
                <input value={header} onChange={e => setHeader(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Form Sub-Header Text</label>
                <input value={subheader} onChange={e => setSubheader(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Submit Button Text</label>
                <input value={submitText} onChange={e => setSubmitText(e.target.value)}
                  placeholder="ORDER NOW →"
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t shrink-0 space-y-2">
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Forms() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [embedFormId, setEmbedFormId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'order_form' | 'upsell_form'

  const { data = [], isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: formsApi.list,
  });

  const filtered = typeFilter === 'all' ? data
    : data.filter(f => (f.embedSettings?.formType ?? 'order_form') === typeFilter);

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
        <FormModal form={editForm} onClose={() => { setShowModal(false); setEditForm(null); }} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Forms</h1>
          <p className="text-sm text-gray-500 mt-0.5">Embeddable order &amp; upsell forms for your website</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
          <Plus size={16} /> New Form
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2">
        {[{ value: 'all', label: 'All Forms' }, { value: 'order_form', label: 'Order Forms' }, { value: 'upsell_form', label: 'Upsell Forms' }].map(t => (
          <button key={t.value} onClick={() => setTypeFilter(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${typeFilter === t.value ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-xl py-20 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No forms yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first form to start accepting orders online</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
            Create Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(form => (
            <div key={form.id} className="bg-white border rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{form.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">/form/{form.slug}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${(form.embedSettings?.formType ?? 'order_form') === 'upsell_form' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                      {(form.embedSettings?.formType ?? 'order_form') === 'upsell_form' ? 'Upsell Form' : 'Order Form'}
                    </span>
                    {form.paymentMethod && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        form.paymentMethod === 'PBD'  ? 'bg-blue-100 text-blue-700' :
                        form.paymentMethod === 'BOTH' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {form.paymentMethod === 'BOTH' ? 'COD+PBD' : form.paymentMethod}
                      </span>
                    )}
                  </div>
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
