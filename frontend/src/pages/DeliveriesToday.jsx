import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import client from '@/api/client';
import { formatNGN, formatDate } from '@/lib/utils';
import PhoneLink from '@/components/shared/PhoneLink';
import { Truck } from 'lucide-react';

export default function DeliveriesToday() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['deliveries-today'],
    queryFn: () => client.get('/orders/deliveries-today').then(r => r.data),
    refetchInterval: 60000,
  });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Today's Deliveries</h2>
        <p className="text-sm text-gray-500">{data.length} orders scheduled for delivery today</p>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            <Truck size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No deliveries scheduled for today</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Order #</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Address</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Agent</th>
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
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{o.address}</td>
                  <td className="px-4 py-3 text-gray-600">{o.state}</td>
                  <td className="px-4 py-3 text-gray-900">{formatNGN(o.totalAmount)}</td>
                  <td className="px-4 py-3 text-gray-500">{o.agent?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
