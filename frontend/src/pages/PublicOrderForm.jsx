import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { formatNGN } from '@/lib/utils';
import { NIGERIA_STATES } from '@/lib/constants';
import axios from 'axios';

// Public axios client (no auth header)
const pub = axios.create({ baseURL: '/api' });

// ── Upsell Modal (shown after order placed) ───────────────────────────────────
function UpsellModal({ product, onAccept, onDecline, loading }) {
  const tier = product.pricingTiers?.[0];
  const price = tier?.price ?? 0;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5">Special One-Time Offer</p>
          <h3 className="text-xl font-bold">Wait! Don't miss this</h3>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 text-2xl">🎁</div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">{product.name}</h4>
              <p className="text-sm text-gray-500 mt-0.5">Add this to your order right now</p>
              <div className="mt-2 text-2xl font-bold text-orange-600">{formatNGN(price)}</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            This offer is available <strong>only right now</strong> and will not be shown again after you close this page.
          </p>
          <button onClick={onAccept} disabled={loading}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm mb-3 disabled:opacity-60">
            {loading ? 'Adding...' : `Yes! Add to my order — ${formatNGN(price)}`}
          </button>
          <button onClick={onDecline}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600">
            No thanks, I don't want this
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success Screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ order, upsellProducts, onUpsellAccept, upsellIdx, upsellLoading, onUpsellDecline }) {
  const currentUpsell = upsellProducts[upsellIdx];

  return (
    <>
      {currentUpsell && (
        <UpsellModal
          product={currentUpsell}
          onAccept={() => onUpsellAccept(currentUpsell)}
          onDecline={onUpsellDecline}
          loading={upsellLoading}
        />
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
          <p className="text-2xl font-mono font-bold text-primary mb-4">{order?.orderNumber}</p>
          <p className="text-sm text-gray-500">
            We'll contact you on <strong>{order?.customerPhone}</strong> to confirm your delivery.
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold">{formatNGN(order?.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span className="font-semibold">{formatNGN(order?.deliveryFee)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────────
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

  // Product selection
  const [selectedVariations, setSelectedVariations] = useState({}); // productId → variation name
  const [selectedTiers, setSelectedTiers] = useState({});           // productId → tier index
  const [quantities, setQuantities] = useState({});                 // productId → quantity

  // Order bumps (shown as checkboxes before submit)
  const [bumps, setBumps] = useState({});  // productId → bool

  // Upsell (post-purchase)
  const [placedOrder, setPlacedOrder] = useState(null);
  const [upsellIdx, setUpsellIdx] = useState(0);
  const [upsellLoading, setUpsellLoading] = useState(false);

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const abandonmentSent = useRef(false);
  const startedAt = useRef(null);

  // Load form + record hit
  useEffect(() => {
    (async () => {
      try {
        const { data } = await pub.get(`/forms/public/${slug}`);
        setForm(data);
        await pub.post(`/forms/public/${slug}/hit`).catch(() => {});

        // Default quantity 1 for each main product
        const initQty = {};
        const initTier = {};
        data.products?.forEach(fp => {
          if (!fp.isUpsell) {
            initQty[fp.productId] = 1;
            initTier[fp.productId] = 0;
          }
        });
        setQuantities(initQty);
        setSelectedTiers(initTier);
      } catch (e) {
        setLoadError('This form is unavailable or does not exist.');
      }
    })();
  }, [slug]);

  // Abandonment tracking — fires when user starts typing and then navigates away
  useEffect(() => {
    const sendAbandonment = () => {
      if (abandonmentSent.current || !customerPhone || placedOrder) return;
      if (!startedAt.current) return;
      abandonmentSent.current = true;
      const mainProduct = form?.products?.find(fp => !fp.isUpsell);
      navigator.sendBeacon
        ? navigator.sendBeacon(`/api/forms/public/${slug}/abandon`, JSON.stringify({
            customerName, customerPhone, productData: {
              productName: mainProduct?.product?.name,
              price: getTierPrice(mainProduct?.productId),
            }
          }))
        : pub.post(`/forms/public/${slug}/abandon`, { customerName, customerPhone, productData: { productName: mainProduct?.product?.name } }).catch(() => {});
    };
    window.addEventListener('beforeunload', sendAbandonment);
    return () => window.removeEventListener('beforeunload', sendAbandonment);
  }, [customerName, customerPhone, slug, form, placedOrder]);

  // Track when user starts filling the form
  const handleStartTyping = () => {
    if (!startedAt.current) startedAt.current = Date.now();
  };

  const mainProducts = form?.products?.filter(fp => !fp.isUpsell) ?? [];
  const bumpProducts = form?.products?.filter(fp => fp.isUpsell) ?? [];
  const upsellProducts = bumpProducts; // same pool, shown post-purchase as modal

  const getTierPrice = (productId) => {
    const fp = form?.products?.find(p => p.productId === productId);
    const tiers = fp?.product?.pricingTiers ?? [];
    const idx = selectedTiers[productId] ?? 0;
    return Number(tiers[idx]?.price ?? 0);
  };

  const getDeliveryFee = () => {
    if (!state) return 0;
    // Try any main product's stateDeliveryFees
    for (const fp of mainProducts) {
      const fees = fp.product?.stateDeliveryFees ?? {};
      if (fees[state] != null) return Number(fees[state]);
    }
    return 0;
  };

  const getOrderTotal = () => {
    let total = 0;
    for (const fp of mainProducts) {
      const qty = quantities[fp.productId] ?? 1;
      total += getTierPrice(fp.productId) * qty;
    }
    // Add selected bumps
    for (const fp of bumpProducts) {
      if (bumps[fp.productId]) {
        const tiers = fp.product?.pricingTiers ?? [];
        total += Number(tiers[0]?.price ?? 0);
      }
    }
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
      items.push({
        productId: fp.productId,
        variation: selectedVariations[fp.productId] ?? null,
        pricingTier: tier?.label ?? null,
        quantity: quantities[fp.productId] ?? 1,
        unitPrice: Number(tier?.price ?? 0),
      });
    }
    // Add bump items
    for (const fp of bumpProducts) {
      if (bumps[fp.productId]) {
        const tiers = fp.product?.pricingTiers ?? [];
        items.push({
          productId: fp.productId,
          variation: null,
          pricingTier: tiers[0]?.label ?? 'Bump',
          quantity: 1,
          unitPrice: Number(tiers[0]?.price ?? 0),
        });
      }
    }

    try {
      const { data } = await pub.post(`/forms/public/${slug}/submit`, {
        customerName, customerPhone, customerPhone2, address, state, city,
        deliveryFee: getDeliveryFee(),
        items,
      });
      abandonmentSent.current = true; // don't send abandonment now
      setPlacedOrder(data);
    } catch (err) {
      setErrors({ submit: err?.response?.data?.error ?? 'Failed to place order. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpsellAccept = async (product) => {
    setUpsellLoading(true);
    // In a real implementation you'd update the order — here we just advance
    // (backend order update can be added; for now just move to next upsell)
    await new Promise(r => setTimeout(r, 800));
    setUpsellLoading(false);
    setUpsellIdx(i => i + 1);
  };

  const handleUpsellDecline = () => setUpsellIdx(i => i + 1);

  // ── Render states ─────────────────────────────────────────────────────────────

  if (loadError) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
        <p className="text-gray-500">{loadError}</p>
      </div>
    </div>
  );

  if (!form) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (placedOrder) return (
    <SuccessScreen
      order={placedOrder}
      upsellProducts={upsellProducts.map(fp => fp.product)}
      upsellIdx={upsellIdx}
      upsellLoading={upsellLoading}
      onUpsellAccept={handleUpsellAccept}
      onUpsellDecline={handleUpsellDecline}
    />
  );

  const deliveryFee = getDeliveryFee();
  const orderTotal = getOrderTotal();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Products ─────────────────────────────────────────────────── */}
          {mainProducts.map(fp => {
            const product = fp.product;
            const tiers = product?.pricingTiers ?? [];
            const variations = product?.variations ?? [];
            const selectedTierIdx = selectedTiers[fp.productId] ?? 0;
            const currentTier = tiers[selectedTierIdx];

            return (
              <div key={fp.productId} className="bg-white rounded-2xl border p-5 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">{product?.name}</h3>

                {/* Pricing tiers */}
                {tiers.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Package</label>
                    <div className="space-y-2">
                      {tiers.map((tier, i) => (
                        <label key={i}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedTierIdx === i ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" name={`tier-${fp.productId}`} checked={selectedTierIdx === i}
                            onChange={() => setSelectedTiers(prev => ({ ...prev, [fp.productId]: i }))}
                            className="accent-primary" />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{tier.label}</span>
                            {tier.quantity > 1 && <span className="text-xs text-gray-500 ml-2">× {tier.quantity}</span>}
                          </div>
                          <span className="font-bold text-primary">{formatNGN(tier.price)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Single tier display */}
                {tiers.length === 1 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">{tiers[0].label}</span>
                    <span className="text-xl font-bold text-primary">{formatNGN(tiers[0].price)}</span>
                  </div>
                )}

                {/* Variations */}
                {variations.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Variation</label>
                    <div className="flex flex-wrap gap-2">
                      {variations.map((v, i) => (
                        <button key={i} type="button"
                          onClick={() => setSelectedVariations(prev => ({ ...prev, [fp.productId]: v.name }))}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition ${selectedVariations[fp.productId] === v.name ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => setQuantities(prev => ({ ...prev, [fp.productId]: Math.max(1, (prev[fp.productId] ?? 1) - 1) }))}
                      className="w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold hover:bg-gray-50">−</button>
                    <span className="w-8 text-center font-semibold">{quantities[fp.productId] ?? 1}</span>
                    <button type="button"
                      onClick={() => setQuantities(prev => ({ ...prev, [fp.productId]: (prev[fp.productId] ?? 1) + 1 }))}
                      className="w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold hover:bg-gray-50">+</button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Customer Info ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Delivery Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input value={customerName}
                onChange={e => { setCustomerName(e.target.value); handleStartTyping(); }}
                placeholder="Enter your full name"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.customerName ? 'border-red-400' : ''}`} />
              {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Phone *</label>
              <input value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); handleStartTyping(); }}
                placeholder="08012345678"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.customerPhone ? 'border-red-400' : ''}`} />
              {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone (optional)</label>
              <input value={customerPhone2} onChange={e => setCustomerPhone2(e.target.value)}
                placeholder="Optional backup number"
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <select value={state} onChange={e => setState(e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.state ? 'border-red-400' : ''}`}>
                <option value="">Select your state</option>
                {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City / LGA (optional)</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="e.g. Ikeja"
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                placeholder="House/street address"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none ${errors.address ? 'border-red-400' : ''}`} />
              {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
            </div>
          </div>

          {/* ── Order Bumps ───────────────────────────────────────────────── */}
          {bumpProducts.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⚡</span>
                <h3 className="font-bold text-yellow-800 text-sm uppercase tracking-wide">Special Add-On Offer</h3>
              </div>
              {bumpProducts.map(fp => {
                const product = fp.product;
                const tiers = product?.pricingTiers ?? [];
                const bumpPrice = Number(tiers[0]?.price ?? 0);
                return (
                  <label key={fp.productId}
                    className="flex items-start gap-3 cursor-pointer bg-white rounded-xl p-4 border border-yellow-200">
                    <input type="checkbox" checked={!!bumps[fp.productId]}
                      onChange={() => setBumps(prev => ({ ...prev, [fp.productId]: !prev[fp.productId] }))}
                      className="mt-0.5 w-5 h-5 accent-orange-500 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{product?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tiers[0]?.label}</p>
                    </div>
                    <span className="font-bold text-orange-600 shrink-0">{formatNGN(bumpPrice)}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* ── Order Summary ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {mainProducts.map(fp => {
                const qty = quantities[fp.productId] ?? 1;
                const price = getTierPrice(fp.productId);
                return (
                  <div key={fp.productId} className="flex justify-between">
                    <span className="text-gray-600">{fp.product?.name} × {qty}</span>
                    <span className="font-medium">{formatNGN(price * qty)}</span>
                  </div>
                );
              })}
              {bumpProducts.filter(fp => bumps[fp.productId]).map(fp => (
                <div key={fp.productId} className="flex justify-between text-orange-700">
                  <span>{fp.product?.name} (add-on)</span>
                  <span className="font-medium">{formatNGN(fp.product?.pricingTiers?.[0]?.price ?? 0)}</span>
                </div>
              ))}
              {state && (
                <div className="flex justify-between text-gray-500 border-t pt-2 mt-2">
                  <span>Delivery ({state})</span>
                  <span>{deliveryFee > 0 ? formatNGN(deliveryFee) : 'Free'}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                <span>Total</span>
                <span className="text-primary">{formatNGN(orderTotal + deliveryFee)}</span>
              </div>
            </div>
          </div>

          {/* ── Submit ────────────────────────────────────────────────────── */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {errors.submit}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-base disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
            {submitting && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {submitting ? 'Placing Order...' : 'Place Order Now →'}
          </button>

          <p className="text-center text-xs text-gray-400 pb-4">
            By placing this order you agree to be contacted for delivery confirmation.
          </p>
        </form>
      </div>
    </div>
  );
}
