import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { formatNGN } from '@/lib/utils';
import { NIGERIA_STATES } from '@/lib/constants';
import axios from 'axios';

// ── Custom State Dropdown (replaces native select) ────────────────────────────
function StateDropdown({ value, onChange, hasError }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = NIGERIA_STATES.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  const select = (s) => { onChange(s); setOpen(false); setSearch(''); };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl bg-white text-sm transition focus:outline-none ${
          hasError ? 'border-red-400' : open ? 'border-blue-500' : 'border-gray-300 hover:border-gray-400'
        }`}>
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || 'Your Delivery State *'}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search state..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && <p className="text-xs text-gray-400 px-4 py-3">No states found</p>}
            {filtered.map(s => (
              <button key={s} type="button" onClick={() => select(s)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition ${value === s ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const pub = axios.create({ baseURL: '/api' });

// ── Post-Purchase Upsell Modal ────────────────────────────────────────────────
function UpsellModal({ product, onAccept, onDecline, loading }) {
  const tiers = product.pricingTiers ?? [];
  const [selectedTier, setSelectedTier] = useState(0);
  const price = Number(tiers[selectedTier]?.price ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5">Special One-Time Offer</p>
          <h3 className="text-xl font-bold">Wait! Don't miss this</h3>
        </div>
        <div className="p-6">
          <h4 className="font-bold text-gray-900 text-xl mb-1">{product.name}</h4>
          <p className="text-sm text-gray-500 mb-4">This offer is available <strong>only right now</strong> — not available at any other time.</p>
          {tiers.length > 1 && (
            <div className="space-y-2 mb-4">
              {tiers.map((tier, i) => (
                <label key={i} onClick={() => setSelectedTier(i)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${selectedTier === i ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTier === i ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                      {selectedTier === i && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="font-medium text-sm">{tier.label}</span>
                  </div>
                  <span className="font-bold text-orange-600">{formatNGN(tier.price)}</span>
                </label>
              ))}
            </div>
          )}
          <button onClick={() => onAccept(selectedTier)} disabled={loading}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl mb-3 disabled:opacity-60">
            {loading ? 'Adding...' : `Yes! Add to my order — ${formatNGN(price)}`}
          </button>
          <button onClick={onDecline} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600">
            No thanks, I don't want this offer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success Screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ order, upsellProducts, upsellIdx, upsellLoading, onUpsellAccept, onUpsellDecline }) {
  const currentUpsell = upsellProducts[upsellIdx];
  return (
    <>
      {currentUpsell && (
        <UpsellModal product={currentUpsell} onAccept={onUpsellAccept} onDecline={onUpsellDecline} loading={upsellLoading} />
      )}
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-500 mb-1">Your order number is</p>
          <p className="text-2xl font-mono font-bold text-blue-600 mb-4">{order?.orderNumber}</p>
          <p className="text-sm text-gray-500">
            We'll contact you on <strong>{order?.customerPhone}</strong> to confirm your delivery.
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold">{formatNGN(order?.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Order Bump Section (inline toggle on form) ────────────────────────────────
function OrderBumpSection({ product, mainProductId, accepted, onToggle, selectedTierIdx, onSelectTier, bumpConfig }) {
  const cfg = bumpConfig ?? {};
  const headline = cfg.headline || 'Would You Like To Add To Your Order:';
  const benefit = cfg.benefit || (product.variations?.[0]?.description ?? '');
  const ctaText = cfg.ctaText || 'Yes, I Will Take It!';
  const urgencyText = cfg.urgencyText || 'This offer is only available here — not available elsewhere';
  const imageUrl = cfg.imageUrl || '';
  const bumpPrice = cfg.bumpPrice ? Number(cfg.bumpPrice) : null;
  const regularPrice = cfg.regularPrice ? Number(cfg.regularPrice) : null;

  // Config tiers (from form builder) take top priority
  // Fall back to product.pricingTiers only if different product and no flat bumpPrice
  const isSameAsMain = product.id === mainProductId;
  const configTiers = cfg.tiers ?? [];
  const tiers = configTiers.length > 0
    ? configTiers
    : (!isSameAsMain && !bumpPrice ? (product.pricingTiers ?? []) : []);

  return (
    <div className="border-4 border-dashed border-yellow-400 bg-yellow-50 rounded-2xl p-5 space-y-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-700 mb-2">⚡ Special Add-On Offer</p>
        <p className="text-sm font-semibold text-gray-600 mb-1">{headline}</p>
        {imageUrl && (
          <img src={imageUrl} alt={product.name} className="mx-auto max-h-40 object-contain rounded-xl mb-2" />
        )}
        <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
        {benefit && <p className="text-sm text-gray-600 mt-1">{benefit}</p>}
        {/* Only show flat price text when NOT in multi-tier mode */}
        {bumpPrice && !tiers.length && (
          <p className="text-sm font-bold text-gray-800 mt-2">
            Kindly click the box below to add this to your order now for just{' '}
            <span className="text-green-600">₦{bumpPrice.toLocaleString()}</span>
            {regularPrice && (
              <> instead of paying normal price of{' '}
                <span className="line-through text-gray-400">₦{regularPrice.toLocaleString()}</span>
              </>
            )}!
          </p>
        )}
      </div>

      {/* Toggle button */}
      <div className="flex justify-center">
        <button type="button" onClick={onToggle}
          className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md ${
            accepted ? 'bg-green-500 text-white scale-105' : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-yellow-400'
          }`}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${accepted ? 'border-white bg-white' : 'border-gray-400'}`}>
            {accepted && <div className="w-3 h-3 bg-green-500 rounded-full" />}
          </div>
          {accepted ? '✓ Added to Order' : ctaText}
        </button>
      </div>

      {/* Tier selection — only shown for bump products with their own tiers, not flat-price bumps */}
      {accepted && tiers.length > 0 && (
        <div className="space-y-2 pt-1">
          {tiers.map((tier, i) => (
            <div key={i} onClick={() => onSelectTier(i)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                (selectedTierIdx ?? 0) === i ? 'bg-green-500 text-white shadow' : 'bg-white border border-gray-200 hover:border-green-300'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${(selectedTierIdx ?? 0) === i ? 'border-white bg-white' : 'border-gray-300'}`}>
                  {(selectedTierIdx ?? 0) === i && <div className="w-3 h-3 bg-green-500 rounded-full" />}
                </div>
                <span className="font-medium text-sm">{tier.label}</span>
              </div>
              <span className="font-bold">₦{Number(tier.price).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Flat-price confirmation — only when no tiers (pure flat price mode) */}
      {accepted && bumpPrice && !tiers.length && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
          <p className="text-sm font-bold text-green-700">Added at ₦{bumpPrice.toLocaleString()}</p>
        </div>
      )}

      {!accepted && (
        <p className="text-center text-xs text-orange-600 font-semibold italic">{urgencyText}</p>
      )}
    </div>
  );
}

// ── Main Public Form ──────────────────────────────────────────────────────────
export default function PublicOrderForm() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');

  // Custom fields from form builder: { fieldId: value }
  const [customFieldValues, setCustomFieldValues] = useState({});

  // Per-product selections
  const [selectedVariations, setSelectedVariations] = useState({});
  const [selectedTiers, setSelectedTiers] = useState({});
  const [quantities, setQuantities] = useState({});

  // Order bumps: { productId: { accepted: bool, tierIdx: number } }
  const [bumps, setBumps] = useState({});

  // Post-purchase upsell (uses same bumpProducts pool but shows after submit)
  const [placedOrder, setPlacedOrder] = useState(null);
  const [upsellIdx, setUpsellIdx] = useState(0);
  const [upsellLoading, setUpsellLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const abandonmentSent = useRef(false);
  const cartId = useRef(null); // ID of the AbandonedCart record created on phone blur
  const startedAt = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await pub.get(`/forms/public/${slug}`);
        setForm(data);
        await pub.post(`/forms/public/${slug}/hit`).catch(() => {});
        const initQty = {}, initTier = {};
        data.products?.forEach(fp => {
          if (!fp.isUpsell) { initQty[fp.productId] = 1; initTier[fp.productId] = 0; }
        });
        setQuantities(initQty);
        setSelectedTiers(initTier);
      } catch { setLoadError('This form is unavailable or does not exist.'); }
    })();
  }, [slug]);

  // Early phone capture: create AbandonedCart as soon as phone number is filled
  const handlePhoneBlur = async (phone) => {
    if (abandonmentSent.current || cartId.current || !phone || phone.length < 7) return;
    try {
      const mainFp = form?.products?.find(fp => !fp.isUpsell);
      const { data } = await pub.post(`/forms/public/${slug}/abandon`, {
        customerName,
        customerPhone: phone,
        productData: {
          productName: mainFp?.product?.name ?? '',
          price: mainFp ? Number(mainFp.product?.pricingTiers?.[0]?.price ?? 0) : 0,
        },
      });
      cartId.current = data?.id ?? null;
    } catch { /* silent — abandonment tracking is best-effort */ }
  };

  const mainProducts = form?.products?.filter(fp => !fp.isUpsell) ?? [];
  const bumpProducts = form?.products?.filter(fp => fp.isUpsell) ?? [];

  const getTierPrice = (productId) => {
    const fp = form?.products?.find(p => p.productId === productId);
    const tiers = fp?.product?.pricingTiers ?? [];
    return Number(tiers[selectedTiers[productId] ?? 0]?.price ?? 0);
  };

  const getDeliveryFee = () => {
    if (!state) return 0;
    for (const fp of mainProducts) {
      const fees = fp.product?.stateDeliveryFees ?? {};
      if (fees[state] != null) return Number(fees[state]);
    }
    return 0;
  };

  const getBumpPrice = (productId) => {
    const bump = bumps[productId];
    if (!bump?.accepted) return 0;
    const fp = form?.products?.find(p => p.productId === productId);
    const cfg = form?.embedSettings?.bumps?.[productId] ?? {};
    // Config tiers (from form builder) take priority
    if (cfg.tiers?.length > 0) return Number(cfg.tiers[bump.tierIdx ?? 0]?.price ?? 0);
    // Flat bumpPrice
    if (cfg.bumpPrice) return Number(cfg.bumpPrice);
    // Fallback: separate bump product with its own product tiers
    const mainProductId = mainProducts[0]?.productId;
    const isSameAsMain = fp?.productId === mainProductId;
    if (!isSameAsMain) {
      const tiers = fp?.product?.pricingTiers ?? [];
      if (tiers.length > 0) return Number(tiers[bump.tierIdx ?? 0]?.price ?? 0);
    }
    return 0;
  };

  const getOrderTotal = () => {
    let total = 0;
    for (const fp of mainProducts) total += getTierPrice(fp.productId) * (quantities[fp.productId] ?? 1);
    for (const fp of bumpProducts) total += getBumpPrice(fp.productId);
    return total;
  };

  const validate = () => {
    const errs = {};
    const flds = form?.embedSettings?.fields ?? {};
    // Standard fields — validate if required (default true for core fields)
    const req = (key, defaultReq = true) => (flds[key]?.required ?? defaultReq) && (flds[key]?.show ?? true);
    if (req('name') && !customerName.trim()) errs.customerName = 'Required';
    if (req('phone') && !customerPhone.trim()) errs.customerPhone = 'Required';
    if (req('address') && !address.trim()) errs.address = 'Required';
    if (req('state') && !state) errs.state = 'Required';
    // Custom fields
    for (const cf of (form?.embedSettings?.customFields ?? [])) {
      if (cf.required && !(customFieldValues[cf.id] ?? '').toString().trim()) {
        errs[`cf_${cf.id}`] = 'Required';
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);

    const items = [];
    for (const fp of mainProducts) {
      const tiers = fp.product?.pricingTiers ?? [];
      const tierIdx = selectedTiers[fp.productId] ?? 0;
      const tier = tiers[tierIdx];
      items.push({ productId: fp.productId, variation: selectedVariations[fp.productId] ?? null,
        pricingTier: tier?.label ?? null, quantity: quantities[fp.productId] ?? 1, unitPrice: Number(tier?.price ?? 0) });
    }
    for (const fp of bumpProducts) {
      const bump = bumps[fp.productId];
      if (!bump?.accepted) continue;
      const cfg = form?.embedSettings?.bumps?.[fp.productId] ?? {};
      const configTiers = cfg.tiers ?? [];
      const productTiers = fp.product?.pricingTiers ?? [];
      const activeTiers = configTiers.length > 0 ? configTiers : productTiers;
      const tier = activeTiers[bump.tierIdx ?? 0];
      const unitPrice = getBumpPrice(fp.productId);
      items.push({ productId: fp.productId, variation: null, pricingTier: tier?.label ?? 'Bump',
        quantity: 1, unitPrice });
    }

    try {
      // Build notes from custom fields
      const customNotes = Object.entries(customFieldValues)
        .filter(([, v]) => v)
        .map(([id, v]) => {
          const cf = form?.embedSettings?.customFields?.find(f => f.id === id);
          return cf ? `${cf.label}: ${v}` : v;
        }).join('\n');

      const { data } = await pub.post(`/forms/public/${slug}/submit`, {
        customerName, customerPhone, customerPhone2, customerEmail, address, state, city,
        items,
        notes: customNotes || undefined,
      });
      abandonmentSent.current = true;
      // Mark the abandoned cart as recovered
      if (cartId.current) {
        pub.post(`/forms/public/${slug}/recover/${cartId.current}`).catch(() => {});
      }
      setPlacedOrder(data);
    } catch (err) {
      setErrors({ submit: err?.response?.data?.error ?? 'Failed to place order. Please try again.' });
    } finally { setSubmitting(false); }
  };

  const handleUpsellAccept = async (tierIdx) => {
    setUpsellLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setUpsellLoading(false);
    setUpsellIdx(i => i + 1);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loadError) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow">
        <p className="text-gray-500">{loadError}</p>
      </div>
    </div>
  );

  if (!form) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (placedOrder) return (
    <SuccessScreen order={placedOrder}
      upsellProducts={[]}
      upsellIdx={0} upsellLoading={false}
      onUpsellAccept={() => {}}
      onUpsellDecline={() => {}} />
  );

  const orderTotal = getOrderTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white text-center">
            <h1 className="text-2xl font-bold">{form.embedSettings?.header || form.name}</h1>
            {(form.embedSettings?.subheader || 'Only Serious Buyers Should Fill The Form Below') && (
              <p className="text-blue-200 text-sm mt-1">{form.embedSettings?.subheader || 'Only Serious Buyers Should Fill The Form Below'}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* ── Products ───────────────────────────────────────────────── */}
            {mainProducts.map(fp => {
              const product = fp.product;
              const tiers = product?.pricingTiers ?? [];
              const variations = product?.variations ?? [];
              const tierIdx = selectedTiers[fp.productId] ?? 0;

              return (
                <div key={fp.productId} className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-700">Please Fill The Form Below To Place Your Order</h2>
                    <h3 className="text-base font-semibold text-gray-600 mt-2">{product?.name}</h3>
                  </div>

                  {/* Pricing tiers (packages) */}
                  {tiers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">Select Your Package</h4>
                      <div className="bg-white rounded-xl overflow-hidden border">
                        <div className="grid grid-cols-2 gap-4 px-4 py-2 font-bold text-gray-600 text-sm border-b bg-gray-50">
                          <span>Package</span><span className="text-right">Price</span>
                        </div>
                        <div className="divide-y">
                          {tiers.map((tier, i) => (
                            <div key={i} onClick={() => setSelectedTiers(prev => ({ ...prev, [fp.productId]: i }))}
                              className={`flex items-center justify-between px-4 py-3 cursor-pointer transition ${tierIdx === i ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${tierIdx === i ? 'border-white bg-white' : 'border-gray-400 bg-white'}`}>
                                  {tierIdx === i && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                                </div>
                                <span className="font-semibold text-sm">{tier.label}</span>
                              </div>
                              <span className="font-bold">₦{Number(tier.price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Variations (e.g. degree/age range) */}
                  {variations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">
                        {variations[0]?.name?.includes('Degree') ? 'Select Degree For Age Range' : 'Select Variation'}
                      </h4>
                      <div className="space-y-2">
                        {variations.map((v, i) => (
                          <div key={i} onClick={() => setSelectedVariations(prev => ({ ...prev, [fp.productId]: v.name }))}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${selectedVariations[fp.productId] === v.name ? 'bg-blue-500 text-white' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedVariations[fp.productId] === v.name ? 'border-white bg-white' : 'border-gray-400 bg-white'}`}>
                              {selectedVariations[fp.productId] === v.name && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                            </div>
                            <div className="flex-1">
                              <span className="font-semibold text-sm">{v.name}</span>
                              {v.description && <span className="text-xs opacity-75 ml-2">{v.description}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}

            {/* ── Customer Info ───────────────────────────────────────────── */}
            {(() => {
              const flds = form?.embedSettings?.fields ?? {};
              const show = (key, def = true) => flds[key]?.show ?? def;
              const lbl = (key, def) => flds[key]?.label || def;
              const isReq = (key, def = true) => flds[key]?.required ?? def;
              return (
                <div className="space-y-3">
                  {show('name') && (
                    <div>
                      <input value={customerName} onChange={e => { setCustomerName(e.target.value); if (!startedAt.current) startedAt.current = Date.now(); }}
                        placeholder={`${lbl('name', 'Full Name')}${isReq('name') ? ' *' : ''}`}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm ${errors.customerName ? 'border-red-400' : 'border-gray-300'}`} />
                      {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                    </div>
                  )}

                  {show('phone') && (
                    <div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 px-3 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 shrink-0">
                          +234 <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                          onBlur={e => handlePhoneBlur(e.target.value)}
                          placeholder={`${lbl('phone', 'Phone Number')}${isReq('phone') ? ' *' : ''}`} type="tel"
                          className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm ${errors.customerPhone ? 'border-red-400' : 'border-gray-300'}`} />
                      </div>
                      {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
                    </div>
                  )}

                  {show('phone2', true) && (
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1 px-3 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 shrink-0">
                        +234 <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                      <input value={customerPhone2} onChange={e => setCustomerPhone2(e.target.value)}
                        placeholder={`${lbl('phone2', 'WhatsApp Number')}${isReq('phone2', false) ? ' *' : ''}`} type="tel"
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm" />
                    </div>
                  )}

                  {show('email', false) && (
                    <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                      placeholder={`${lbl('email', 'Email Address')}${isReq('email', false) ? ' *' : ''}`} type="email"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm" />
                  )}

                  {show('address') && (
                    <div>
                      <input value={address} onChange={e => setAddress(e.target.value)}
                        placeholder={`${lbl('address', 'Full Delivery Address')}${isReq('address') ? ' *' : ''}`}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm ${errors.address ? 'border-red-400' : 'border-gray-300'}`} />
                      {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                    </div>
                  )}

                  {show('state') && (
                    <div>
                      <StateDropdown value={state} onChange={setState} hasError={!!errors.state} />
                      {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                    </div>
                  )}

                  {show('age', false) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {lbl('age', 'Age')}{isReq('age', false) ? ' *' : ''}
                      </label>
                      <input value={age} onChange={e => setAge(e.target.value)}
                        placeholder="Enter your age" type="number"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm" />
                    </div>
                  )}

                  {/* Custom fields added via form builder */}
                  {(form?.embedSettings?.customFields ?? []).map(cf => (
                    <div key={cf.id}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {cf.label}{cf.required ? ' *' : ''}
                      </label>
                      {cf.type === 'textarea' ? (
                        <textarea value={customFieldValues[cf.id] ?? ''} onChange={e => setCustomFieldValues(p => ({ ...p, [cf.id]: e.target.value }))}
                          rows={3}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm resize-none ${errors[`cf_${cf.id}`] ? 'border-red-400' : 'border-gray-300'}`} />
                      ) : (
                        <input value={customFieldValues[cf.id] ?? ''} onChange={e => setCustomFieldValues(p => ({ ...p, [cf.id]: e.target.value }))}
                          type={cf.type === 'number' ? 'number' : 'text'}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm ${errors[`cf_${cf.id}`] ? 'border-red-400' : 'border-gray-300'}`} />
                      )}
                      {errors[`cf_${cf.id}`] && <p className="text-xs text-red-500 mt-1">{errors[`cf_${cf.id}`]}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ── Order Bumps (inline toggle sections) ───────────────────── */}
            {bumpProducts.map(fp => (
              <OrderBumpSection
                key={fp.productId}
                product={fp.product}
                mainProductId={mainProducts[0]?.productId}
                accepted={!!bumps[fp.productId]?.accepted}
                selectedTierIdx={bumps[fp.productId]?.tierIdx ?? 0}
                bumpConfig={form.embedSettings?.bumps?.[fp.productId]}
                onToggle={() => setBumps(prev => ({
                  ...prev,
                  [fp.productId]: { ...prev[fp.productId], accepted: !prev[fp.productId]?.accepted, tierIdx: 0 }
                }))}
                onSelectTier={(i) => setBumps(prev => ({ ...prev, [fp.productId]: { ...prev[fp.productId], tierIdx: i } }))}
              />
            ))}

            {/* ── Order Summary ───────────────────────────────────────────── */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 text-sm space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="font-bold text-gray-900 text-base">Order Summary</h3>
              </div>

              {mainProducts.map(fp => {
                const tiers = fp.product?.pricingTiers ?? [];
                const tier = tiers[selectedTiers[fp.productId] ?? 0];
                const qty = quantities[fp.productId] ?? 1;
                return (
                  <div key={fp.productId} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Main Package:</span>
                      <span className="font-semibold text-gray-800 text-right max-w-[55%]">{tier ? `${tier.label}${qty > 1 ? ` ×${qty}` : ''}` : fp.product?.name}</span>
                    </div>
                    {tier && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Package Price:</span>
                        <span className="font-semibold text-gray-800">₦{(Number(tier.price) * qty).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedVariations[fp.productId] && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Degree Selected:</span>
                        <span className="font-semibold text-gray-800 text-right max-w-[55%]">{selectedVariations[fp.productId]}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {bumpProducts.filter(fp => bumps[fp.productId]?.accepted).map(fp => {
                const price = getBumpPrice(fp.productId);
                const bump = bumps[fp.productId];
                const cfg = form?.embedSettings?.bumps?.[fp.productId] ?? {};
                const configTiers = cfg.tiers ?? [];
                const productTiers = fp.product?.pricingTiers ?? [];
                const activeTiers = configTiers.length > 0 ? configTiers : productTiers;
                const tierLabel = !cfg.bumpPrice && activeTiers.length > 0 ? activeTiers[bump?.tierIdx ?? 0]?.label : null;
                return (
                  <div key={fp.productId} className="space-y-1 border-t border-gray-100 pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Add-on — {fp.product?.name}:</span>
                      <span className="font-semibold text-green-700">₦{price.toLocaleString()}</span>
                    </div>
                    {tierLabel && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Option:</span><span>{tierLabel}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-between border-t-2 border-gray-200 pt-3 mt-1">
                <span className="font-bold text-gray-900 text-base">Total Amount:</span>
                <span className="font-bold text-blue-600 text-xl">₦{orderTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* ── Submit ─────────────────────────────────────────────────── */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{errors.submit}</div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-lg shadow-lg disabled:opacity-60 flex items-center justify-center gap-3 transition">
              {submitting && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? 'Processing...' : (form?.embedSettings?.submitText || 'ORDER NOW →')}
            </button>

            <p className="text-center text-xs text-gray-400 pb-2">
              By placing this order you agree to be contacted for delivery confirmation.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
