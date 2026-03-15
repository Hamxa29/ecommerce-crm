import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { formatNGN } from '@/lib/utils';

const pub = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '' });

export default function PublicUpsellPage() {
  const { slug, orderNumber } = useParams();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [otoList, setOtoList] = useState([]); // [{ product, config }]
  const [idx, setIdx] = useState(0);
  const [selectedTier, setSelectedTier] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await pub.get(`/api/forms/public/${slug}`);
        setForm(data);
        const otos = data.embedSettings?.otos ?? {};
        const otoProducts = data.otoProducts ?? [];
        const list = Object.entries(otos)
          .map(([productId, config]) => ({
            product: otoProducts.find(p => p.id === productId),
            config,
          }))
          .filter(o => o.product);
        setOtoList(list);
        if (list.length === 0) finishFlow(data);
      } catch { setLoadError('This page is unavailable.'); }
    })();
  }, [slug]);

  const finishFlow = (formData) => {
    const redirectUrl = (formData ?? form)?.embedSettings?.successRedirectUrl;
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      setDone(true);
    }
  };

  const handleAccept = async () => {
    const { product, config } = otoList[idx];
    const tiers = product.pricingTiers ?? [];
    const tier = tiers[selectedTier] ?? tiers[0];
    const unitPrice = tier ? Number(tier.price) : 0;
    const pricingTier = tier?.label ?? null;
    setLoading(true);
    try {
      await pub.post(`/api/forms/public/${slug}/oto-accept/${orderNumber}`, {
        productId: product.id,
        quantity: 1,
        unitPrice,
        pricingTier,
      });
    } catch { /* silent — don't block on failure */ }
    setLoading(false);
    advance();
  };

  const handleDecline = () => advance();

  const advance = () => {
    setSelectedTier(0);
    if (idx + 1 >= otoList.length) {
      finishFlow(null);
    } else {
      setIdx(i => i + 1);
    }
  };

  if (loadError) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">{loadError}</p>
    </div>
  );

  if (!form || otoList.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
        <p className="text-gray-500 text-sm">Your order has been confirmed. We'll be in touch soon.</p>
      </div>
    </div>
  );

  const { product, config } = otoList[idx];
  const tiers = product.pricingTiers ?? [];
  const tier = tiers[selectedTier] ?? tiers[0];
  const price = tier ? Number(tier.price) : 0;

  const headline = config.headline || `Special One-Time Offer: ${product.name}`;
  const ctaText = config.ctaText || 'Yes! Add To My Order →';
  const declineText = config.declineText || 'No thanks, I don\'t want this';
  const urgencyText = config.urgencyText || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Progress */}
        {otoList.length > 1 && (
          <p className="text-center text-xs text-gray-500 mb-4">
            Special offer {idx + 1} of {otoList.length}
          </p>
        )}

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-white text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-200 mb-1">⚡ Special One-Time Offer</p>
            <h1 className="text-xl font-bold">{headline}</h1>
          </div>

          <div className="p-6 space-y-5">
            {/* Product name */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
              {product.variations?.[0]?.description && (
                <p className="text-sm text-gray-500 mt-1">{product.variations[0].description}</p>
              )}
            </div>

            {/* Pricing tiers */}
            {tiers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Select option:</p>
                <div className="bg-gray-50 rounded-xl overflow-hidden border divide-y">
                  {tiers.map((t, i) => (
                    <div key={i} onClick={() => setSelectedTier(i)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition ${selectedTier === i ? 'bg-purple-600 text-white' : 'hover:bg-gray-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedTier === i ? 'border-white bg-white' : 'border-gray-400 bg-white'}`}>
                          {selectedTier === i && <div className="w-3 h-3 bg-purple-600 rounded-full" />}
                        </div>
                        <span className="font-semibold text-sm">{t.label}</span>
                      </div>
                      <span className="font-bold">₦{Number(t.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price display if no tiers */}
            {tiers.length === 0 && price > 0 && (
              <p className="text-center text-2xl font-bold text-gray-900">{formatNGN(price)}</p>
            )}

            {urgencyText && (
              <p className="text-center text-xs text-red-600 font-semibold bg-red-50 rounded-xl px-3 py-2">{urgencyText}</p>
            )}

            {/* CTA */}
            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-base py-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</>
              ) : (
                ctaText
              )}
            </button>

            {/* Decline */}
            <button
              onClick={handleDecline}
              disabled={loading}
              className="w-full text-gray-400 hover:text-gray-600 text-sm underline underline-offset-2 transition py-1"
            >
              {declineText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
