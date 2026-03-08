import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { formatNGN } from '@/lib/utils';
import { NIGERIA_STATES } from '@/lib/constants';
import axios from 'axios';

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
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery Fee</span>
              <span className="font-semibold">{formatNGN(order?.deliveryFee)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Order Bump Section (inline toggle on form) ────────────────────────────────
function OrderBumpSection({ product, accepted, onToggle, selectedTierIdx, onSelectTier }) {
  const tiers = product.pricingTiers ?? [];
  const price = Number(tiers[selectedTierIdx ?? 0]?.price ?? 0);

  return (
    <div className="border-4 border-dashed border-yellow-400 bg-yellow-50 rounded-2xl p-5 space-y-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-700 mb-1">⚡ Special Add-On Offer</p>
        <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
        {product.variations?.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">{product.variations[0]?.description}</p>
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
          {accepted ? '✓ Added to Order' : 'Yes, I Will Take It!'}
        </button>
      </div>

      {/* Sub-options (pricing tiers) — shown when accepted */}
      {accepted && tiers.length > 1 && (
        <div className="space-y-2 pt-2">
          <p className="text-sm font-semibold text-gray-700 text-center">Choose your option:</p>
          {tiers.map((tier, i) => (
            <div key={i} onClick={() => onSelectTier(i)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                (selectedTierIdx ?? 0) === i ? 'bg-green-500 text-white shadow' : 'bg-white border border-gray-200 hover:border-green-300'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${(selectedTierIdx ?? 0) === i ? 'border-white bg-white' : 'border-gray-300'}`}>
                  {(selectedTierIdx ?? 0) === i && <div className="w-3 h-3 bg-green-500 rounded-full" />}
                </div>
                <span className="font-medium text-sm">{tier.label}</span>
              </div>
              <span className="font-bold">{formatNGN(tier.price)}</span>
            </div>
          ))}
        </div>
      )}

      {accepted && tiers.length === 1 && (
        <p className="text-center text-sm font-bold text-green-700">Added: {tiers[0].label} — {formatNGN(tiers[0].price)}</p>
      )}

      {!accepted && (
        <p className="text-center text-xs text-gray-500 italic">
          This offer is only available here — not available elsewhere
        </p>
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
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

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

  // Abandonment tracking
  useEffect(() => {
    const sendAbandonment = () => {
      if (abandonmentSent.current || !customerPhone || placedOrder || !startedAt.current) return;
      abandonmentSent.current = true;
      const mainFp = form?.products?.find(fp => !fp.isUpsell);
      const body = JSON.stringify({
        customerName, customerPhone,
        productData: { productName: mainFp?.product?.name, price: getTierPrice(mainFp?.productId) },
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/forms/public/${slug}/abandon`, body);
      } else {
        pub.post(`/forms/public/${slug}/abandon`, JSON.parse(body)).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', sendAbandonment);
    return () => window.removeEventListener('beforeunload', sendAbandonment);
  }, [customerName, customerPhone, form, placedOrder, slug]);

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
    const tiers = fp?.product?.pricingTiers ?? [];
    return Number(tiers[bump.tierIdx ?? 0]?.price ?? 0);
  };

  const getOrderTotal = () => {
    let total = 0;
    for (const fp of mainProducts) total += getTierPrice(fp.productId) * (quantities[fp.productId] ?? 1);
    for (const fp of bumpProducts) total += getBumpPrice(fp.productId);
    return total;
  };

  const validate = () => {
    const errs = {};
    if (!customerName.trim()) errs.customerName = 'Required';
    if (!customerPhone.trim()) errs.customerPhone = 'Required';
    if (!address.trim()) errs.address = 'Required';
    if (!state) errs.state = 'Required';
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
      const tiers = fp.product?.pricingTiers ?? [];
      const tier = tiers[bump.tierIdx ?? 0];
      items.push({ productId: fp.productId, variation: null, pricingTier: tier?.label ?? 'Bump',
        quantity: 1, unitPrice: Number(tier?.price ?? 0) });
    }

    try {
      const { data } = await pub.post(`/forms/public/${slug}/submit`, {
        customerName, customerPhone, customerPhone2, address, state, city,
        deliveryFee: getDeliveryFee(), items,
      });
      abandonmentSent.current = true;
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
      upsellProducts={bumpProducts.map(fp => fp.product)}
      upsellIdx={upsellIdx} upsellLoading={upsellLoading}
      onUpsellAccept={handleUpsellAccept}
      onUpsellDecline={() => setUpsellIdx(i => i + 1)} />
  );

  const deliveryFee = getDeliveryFee();
  const orderTotal = getOrderTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white text-center">
            <h1 className="text-2xl font-bold">{form.name}</h1>
            <p className="text-blue-200 text-sm mt-1">Only Serious Buyers Should Fill The Form Below</p>
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

                  {/* Quantity */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">Quantity:</span>
                    <div className="flex items-center gap-3 bg-white border rounded-lg px-2">
                      <button type="button" onClick={() => setQuantities(p => ({ ...p, [fp.productId]: Math.max(1, (p[fp.productId] ?? 1) - 1) }))}
                        className="w-8 h-8 text-xl font-bold text-gray-600 hover:text-gray-900">−</button>
                      <span className="w-6 text-center font-bold">{quantities[fp.productId] ?? 1}</span>
                      <button type="button" onClick={() => setQuantities(p => ({ ...p, [fp.productId]: (p[fp.productId] ?? 1) + 1 }))}
                        className="w-8 h-8 text-xl font-bold text-gray-600 hover:text-gray-900">+</button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Customer Info ───────────────────────────────────────────── */}
            <div className="space-y-4">
              <div>
                <input value={customerName} onChange={e => { setCustomerName(e.target.value); if (!startedAt.current) startedAt.current = Date.now(); }}
                  placeholder="Your Full Name *"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm ${errors.customerName ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
              </div>

              <div className="flex gap-3">
                <div className="w-24 px-3 py-3 border-2 border-gray-300 rounded-xl text-sm text-center font-medium text-gray-600 bg-gray-50">+234</div>
                <input value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); if (!startedAt.current) startedAt.current = Date.now(); }}
                  placeholder="Phone Number *" type="tel"
                  className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm ${errors.customerPhone ? 'border-red-400' : 'border-gray-300'}`} />
              </div>
              {errors.customerPhone && <p className="text-xs text-red-500 -mt-3">{errors.customerPhone}</p>}

              <div className="flex gap-3">
                <div className="w-24 px-3 py-3 border-2 border-gray-300 rounded-xl text-sm text-center font-medium text-gray-600 bg-gray-50">+234</div>
                <input value={customerPhone2} onChange={e => setCustomerPhone2(e.target.value)}
                  placeholder="WhatsApp Number *" type="tel"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm" />
              </div>

              <div>
                <select value={state} onChange={e => setState(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm bg-white ${errors.state ? 'border-red-400' : 'border-gray-300'}`}>
                  <option value="">Your Delivery State *</option>
                  {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
              </div>

              <div>
                <input value={city} onChange={e => setCity(e.target.value)}
                  placeholder="City / LGA (optional)"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm" />
              </div>

              <div>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Your Full Delivery Address *"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition text-sm ${errors.address ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>
            </div>

            {/* ── Order Bumps (inline toggle sections) ───────────────────── */}
            {bumpProducts.map(fp => (
              <OrderBumpSection
                key={fp.productId}
                product={fp.product}
                accepted={!!bumps[fp.productId]?.accepted}
                selectedTierIdx={bumps[fp.productId]?.tierIdx ?? 0}
                onToggle={() => setBumps(prev => ({
                  ...prev,
                  [fp.productId]: { ...prev[fp.productId], accepted: !prev[fp.productId]?.accepted, tierIdx: 0 }
                }))}
                onSelectTier={(i) => setBumps(prev => ({ ...prev, [fp.productId]: { ...prev[fp.productId], tierIdx: i } }))}
              />
            ))}

            {/* ── Order Summary ───────────────────────────────────────────── */}
            {mainProducts.some(fp => (selectedTiers[fp.productId] ?? 0) >= 0) && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-2 text-sm">
                <h3 className="font-bold text-blue-900 text-base mb-3">Order Summary</h3>
                {mainProducts.map(fp => {
                  const tiers = fp.product?.pricingTiers ?? [];
                  const tier = tiers[selectedTiers[fp.productId] ?? 0];
                  const qty = quantities[fp.productId] ?? 1;
                  if (!tier) return null;
                  return (
                    <div key={fp.productId} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Package:</span>
                        <span className="font-semibold">{tier.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-semibold">₦{Number(tier.price).toLocaleString()} × {qty}</span>
                      </div>
                      {selectedVariations[fp.productId] && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Variation:</span>
                          <span className="font-semibold">{selectedVariations[fp.productId]}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {bumpProducts.filter(fp => bumps[fp.productId]?.accepted).map(fp => {
                  const bump = bumps[fp.productId];
                  const tiers = fp.product?.pricingTiers ?? [];
                  const tier = tiers[bump?.tierIdx ?? 0];
                  return (
                    <div key={fp.productId} className="flex justify-between text-orange-700 border-t border-blue-200 pt-2">
                      <span>Add-on: {fp.product?.name}</span>
                      <span className="font-semibold">₦{Number(tier?.price ?? 0).toLocaleString()}</span>
                    </div>
                  );
                })}
                {state && deliveryFee >= 0 && (
                  <div className="flex justify-between border-t border-blue-200 pt-2 text-gray-600">
                    <span>Delivery ({state})</span>
                    <span>{deliveryFee > 0 ? `₦${deliveryFee.toLocaleString()}` : 'Free'}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-blue-300 pt-2 text-base font-bold">
                  <span className="text-blue-900">Total Amount:</span>
                  <span className="text-blue-600">₦{(orderTotal + deliveryFee).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* ── Submit ─────────────────────────────────────────────────── */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{errors.submit}</div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-lg shadow-lg disabled:opacity-60 flex items-center justify-center gap-3 transition">
              {submitting && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? 'Processing...' : 'ORDER NOW →'}
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
