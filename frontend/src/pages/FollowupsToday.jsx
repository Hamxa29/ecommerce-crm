import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import client from '@/api/client';
import { formatNGN } from '@/lib/utils';
import PhoneLink from '@/components/shared/PhoneLink';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import { CalendarClock } from 'lucide-react';

export default function FollowupsToday() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['followups-today'],
    queryFn: () => client.get('/orders/followups-today').then(r => r.data),
    refetchInterval: 60000,
  });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Today's Follow-ups</h2>
        <p className="text-sm text-gray-500">{data.length} orders to follow up on</p>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarClock size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No follow-ups scheduled for today</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Order #</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/orders/${o.id}`} className="text-primary hover:underline font-medium">{o.orderNumber}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.customerName}</td>
                  <td className="px-4 py-3"><PhoneLink phone={o.customerPhone} /></td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{o.state}</td>
                  <td className="px-4 py-3 text-gray-900">{formatNGN(o.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
