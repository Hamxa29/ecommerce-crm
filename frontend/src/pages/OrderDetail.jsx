import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';
import { ORDER_STATUSES } from '@/lib/constants';
import { formatNGN, formatDate } from '@/lib/utils';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import PhoneLink from '@/components/shared/PhoneLink';
import { ArrowLeft, Clock, MessageCircle, Loader2, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id),
  });

  const statusMutation = useMutation({
    mutationFn: () => ordersApi.changeStatus(id, newStatus, note, scheduledDate || undefined),
    onSuccess: () => { qc.invalidateQueries(['order', id]); qc.invalidateQueries(['orders']); setNewStatus(''); setNote(''); setScheduledDate(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => ordersApi.hardDelete(id),
    onSuccess: () => { qc.invalidateQueries(['orders']); navigate('/orders'); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
      Failed to load order. <button onClick={() => navigate(-1)} className="underline">Go back</button>
    </div>
  );

  const items = order.items ?? [];
  const history = order.statusHistory ?? [];
  const waLogs = order.whatsappLogs ?? [];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Order {order.orderNumber}</h2>
          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <OrderStatusBadge status={order.status} size="md" />
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => { if (window.confirm('Permanently delete this order? This cannot be undone.')) deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50"
              title="Delete order permanently"
            >
              {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer info */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Name</span><p className="font-medium text-gray-900 mt-0.5">{order.customerName}</p></div>
              <div><span className="text-gray-500">Phone</span><div className="mt-0.5"><PhoneLink phone={order.customerPhone} /></div></div>
              {order.customerPhone2 && <div><span className="text-gray-500">Phone 2</span><div className="mt-0.5"><PhoneLink phone={order.customerPhone2} /></div></div>}
              {order.customerEmail && <div><span className="text-gray-500">Email</span><p className="mt-0.5">{order.customerEmail}</p></div>}
              <div className="col-span-2"><span className="text-gray-500">Address</span><p className="font-medium mt-0.5">{order.address}</p></div>
              <div><span className="text-gray-500">State</span><p className="font-medium mt-0.5">{order.state}</p></div>
              {order.city && <div><span className="text-gray-500">City</span><p className="font-medium mt-0.5">{order.city}</p></div>}
            </div>
          </div>

          {/* Order items */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Items</h3>
            {items.length === 0 ? (
              <p className="text-sm text-gray-400">No items recorded.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="text-left pb-2">Product</th>
                  <th className="text-left pb-2">Tier</th>
                  <th className="text-center pb-2">Qty</th>
                  <th className="text-right pb-2">Unit Price</th>
                  <th className="text-right pb-2">Subtotal</th>
                </tr></thead>
                <tbody className="divide-y">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="py-2 text-gray-900">{item.product?.name}</td>
                      <td className="py-2 text-gray-500">{item.pricingTier ?? '—'}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{formatNGN(item.unitPrice)}</td>
                      <td className="py-2 text-right font-medium">{formatNGN(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="border-t mt-3 pt-3 space-y-1 text-sm text-right">
              <div className="flex justify-between"><span className="text-gray-500">Total Amount</span><span className="font-semibold">{formatNGN(order.totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span>{formatNGN(order.deliveryFee)}</span></div>
            </div>
          </div>

          {/* Status history */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Clock size={15} /> Status History</h3>
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.fromStatus && <><OrderStatusBadge status={h.fromStatus} /><span className="text-gray-400">→</span></>}
                      <OrderStatusBadge status={h.toStatus} />
                    </div>
                    {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(h.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp logs */}
          {waLogs.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><MessageCircle size={15} className="text-green-600" /> WhatsApp Messages</h3>
              <div className="space-y-3">
                {waLogs.map(log => (
                  <div key={log.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'sent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{log.status}</span>
                      <span className="text-xs text-gray-400">{formatDate(log.sentAt)}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Change status */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Change Status</h3>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Select new status...</option>
              {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {newStatus === 'SCHEDULED' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Date & Time *</label>
                <input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={() => statusMutation.mutate()}
              disabled={!newStatus || statusMutation.isPending || (newStatus === 'SCHEDULED' && !scheduledDate)}
              className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {statusMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Update Status
            </button>
          </div>

          {/* Order details */}
          <div className="bg-white rounded-xl border p-5 text-sm space-y-3">
            <h3 className="font-semibold text-gray-700">Order Details</h3>
            <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="capitalize">{order.source}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="capitalize">{order.paymentStatus?.toLowerCase()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Agent</span><span>{order.agent?.name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Staff</span><span>{order.assignedStaff?.name ?? '—'}</span></div>
            {order.scheduledDate && (
              <div className="flex justify-between"><span className="text-gray-500">Scheduled For</span><span className="font-medium text-blue-700">{formatDate(order.scheduledDate)}</span></div>
            )}
            {order.notes && <div><span className="text-gray-500 block">Notes</span><p className="mt-0.5 text-gray-700">{order.notes}</p></div>}
            {order.comment && <div><span className="text-gray-500 block">Comment</span><p className="mt-0.5 text-gray-700">{order.comment}</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
