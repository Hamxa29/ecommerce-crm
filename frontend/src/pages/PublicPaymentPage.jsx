import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { formatNGN } from '@/lib/utils';
import axios from 'axios';
import { CheckCircle, CreditCard, Landmark, MessageCircle, Truck, Loader2, AlertCircle } from 'lucide-react';

const pub = axios.create({ baseURL: '/api' });

// ── Which options to show ─────────────────────────────────────────────────────
// paymentMethod on the order: COD | PBD | BOTH (resolved from form/product)
// effectiveMethod stored in orderInfo comes from getPublicOrderInfo()

export default function PublicPaymentPage() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();

  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [view, setView] = useState('select'); // select | bank | wa | processing | success | already_paid
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // ── Fetch order info ──────────────────────────────────────────────────────
  useEffect(() => {
    pub.get(`/payments/order/${orderNumber}`)
      .then(r => {
        setOrderInfo(r.data);
        // Already paid?
        if (r.data.paymentStatus === 'PAID' || r.data.paymentConfirmedAt) {
          setView('already_paid');
        } else if (searchParams.get('status') === 'success') {
          // Gateway redirected back with ?status=success
          setView('success');
        }
      })
      .catch(e => setError(e.response?.data?.error || 'Order not found'))
      .finally(() => setLoading(false));
  }, [orderNumber, searchParams]);

  // ── Gateway payment ───────────────────────────────────────────────────────
  const handleGatewayPay = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const r = await pub.post(`/payments/send-link/${orderInfo.id}`);
      if (r.data.url) {
        setView('processing');
        window.location.href = r.data.url;
      } else {
        setActionError('Could not generate payment link. Please try another option.');
      }
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed to generate payment link.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── WhatsApp complete ─────────────────────────────────────────────────────
  const handleWhatsAppComplete = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await pub.post(`/payments/whatsapp-redirect/${orderInfo.id}`);
      const text = encodeURIComponent(
        `Hi, I placed an order (${orderInfo.orderNumber}) for ${formatNGN(orderInfo.totalAmount)}. I'd like to complete my purchase on WhatsApp.`
      );
      const waNumber = orderInfo.businessWhatsapp?.replace(/\D/g, '');
      if (waNumber) {
        window.location.href = `https://wa.me/${waNumber}?text=${text}`;
      } else {
        setView('select');
        setActionError('WhatsApp number not configured. Please use another payment method.');
      }
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isPBD = orderInfo?.paymentMethod === 'PBD';
  const isBOTH = orderInfo?.paymentMethod === 'BOTH';
  const showGateway = (isPBD || isBOTH) && orderInfo?.paymentProvider;
  const showBank = (isPBD || isBOTH) && orderInfo?.bankAccountNumber;
  const showWA = isPBD || isBOTH;
  const showCOD = isBOTH;

  const providerLabel = {
    paystack: 'Paystack',
    opay: 'OPay',
    flutterwave: 'Flutterwave',
    mock: 'Test Payment',
  }[orderInfo?.paymentProvider] ?? 'Online';

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Order Not Found</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Already paid ──────────────────────────────────────────────────────────
  if (view === 'already_paid' || view === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Confirmed!</h2>
          <p className="text-gray-500 text-sm mb-1">
            Hi <span className="font-medium text-gray-700">{orderInfo.customerName}</span>,
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Your order <span className="font-mono font-medium text-gray-700">{orderInfo.orderNumber}</span> has been confirmed.
            We'll be in touch shortly.
          </p>
          <div className="bg-green-50 rounded-xl px-4 py-3 text-green-700 font-semibold text-lg">
            {formatNGN(orderInfo.totalAmount)}
          </div>
        </div>
      </div>
    );
  }

  // ── Processing (gateway redirect) ─────────────────────────────────────────
  if (view === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Redirecting to payment gateway…</p>
        </div>
      </div>
    );
  }

  // ── Bank transfer view ────────────────────────────────────────────────────
  if (view === 'bank') {
    const text = encodeURIComponent(
      `Hi, I'm sending my payment receipt for order ${orderInfo.orderNumber} (${formatNGN(orderInfo.totalAmount)}).`
    );
    const waNumber = orderInfo.businessWhatsapp?.replace(/\D/g, '');

    return (
      <PageShell orderInfo={orderInfo}>
        <button onClick={() => setView('select')}
          className="text-sm text-blue-600 hover:underline mb-4 inline-block">&larr; Back</button>
        <h3 className="font-semibold text-gray-800 mb-4">Bank Transfer Details</h3>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3 mb-5">
          <DetailRow label="Bank" value={orderInfo.bankName} />
          <DetailRow label="Account Number" value={orderInfo.bankAccountNumber} mono />
          <DetailRow label="Account Name" value={orderInfo.bankAccountName} />
          <DetailRow label="Amount" value={formatNGN(orderInfo.totalAmount)} highlight />
        </div>
        <p className="text-sm text-gray-500 mb-4">
          After transferring, send your receipt to us on WhatsApp so we can confirm your order.
        </p>
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=${text}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition"
          >
            <MessageCircle className="w-5 h-5" />
            Send Receipt on WhatsApp
          </a>
        )}
      </PageShell>
    );
  }

  // ── Main selection view ───────────────────────────────────────────────────
  return (
    <PageShell orderInfo={orderInfo}>
      <p className="text-sm text-gray-500 mb-5">How would you like to pay?</p>

      {actionError && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {actionError}
        </div>
      )}

      <div className="space-y-3">
        {/* Gateway */}
        {showGateway && (
          <OptionCard
            icon={<CreditCard className="w-5 h-5" />}
            title={`Pay with ${providerLabel}`}
            subtitle="Card, bank transfer, or USSD — powered by payment gateway"
            color="blue"
            loading={actionLoading}
            onClick={handleGatewayPay}
          />
        )}

        {/* Bank transfer */}
        {showBank && (
          <OptionCard
            icon={<Landmark className="w-5 h-5" />}
            title="Bank Transfer"
            subtitle="Transfer to our account and send your receipt via WhatsApp"
            color="purple"
            onClick={() => setView('bank')}
          />
        )}

        {/* WhatsApp complete */}
        {showWA && (
          <OptionCard
            icon={<MessageCircle className="w-5 h-5" />}
            title="Complete on WhatsApp"
            subtitle="Chat with us directly to confirm and pay for your order"
            color="green"
            loading={actionLoading}
            onClick={handleWhatsAppComplete}
          />
        )}

        {/* COD option (only for BOTH) */}
        {showCOD && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-start gap-4 opacity-75">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-600 text-sm">Cash on Delivery</p>
              <p className="text-xs text-gray-400 mt-0.5">Pay when your order arrives at your doorstep</p>
              <p className="text-xs text-gray-400 mt-1 italic">Your order has been placed — no action needed.</p>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ── Shared page shell ─────────────────────────────────────────────────────────
function PageShell({ orderInfo, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-1">
            Order {orderInfo.orderNumber}
          </p>
          <h1 className="text-xl font-bold">
            Hi {orderInfo.customerName}!
          </h1>
          <p className="text-blue-100 text-sm mt-0.5">Your total is</p>
          <p className="text-3xl font-bold mt-1">{formatNGN(orderInfo.totalAmount)}</p>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Option card ───────────────────────────────────────────────────────────────
const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   border: 'border-blue-200 hover:border-blue-400',   text: 'text-blue-900' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', border: 'border-purple-200 hover:border-purple-400', text: 'text-purple-900' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  border: 'border-green-200 hover:border-green-400',  text: 'text-green-900' },
};

function OptionCard({ icon, title, subtitle, color, onClick, loading }) {
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition ${c.border} ${c.bg} disabled:opacity-60`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      </div>
      <div>
        <p className={`font-semibold text-sm ${c.text}`}>{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </button>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ label, value, mono, highlight }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right break-all ${mono ? 'font-mono' : ''} ${highlight ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
        {value || '—'}
      </span>
    </div>
  );
}
