import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import client from '@/api/client';
import { formatNGN, formatDate } from '@/lib/utils';
import PhoneLink from '@/components/shared/PhoneLink';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import { Truck, CalendarClock } from 'lucide-react';

const TABS = [
  { id: 'deliveries', label: "Deliveries", icon: Truck },
  { id: 'followups', label: "Follow-ups", icon: CalendarClock },
];

export default function TodaySchedule() {
  const [activeTab, setActiveTab] = useState('deliveries');

  const { data: deliveries = [], isLoading: loadingD } = useQuery({
    queryKey: ['deliveries-today'],
    queryFn: () => client.get('/orders/deliveries-today').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: followups = [], isLoading: loadingF } = useQuery({
    queryKey: ['followups-today'],
    queryFn: () => client.get('/orders/followups-today').then(r => r.data),
    refetchInterval: 60000,
  });

  const isLoading = activeTab === 'deliveries' ? loadingD : loadingF;
  const data = activeTab === 'deliveries' ? deliveries : followups;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Today's Schedule</h2>
        <p className="text-sm text-gray-500">
          {deliveries.length} deliveries · {followups.length} follow-ups
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {tab.id === 'deliveries' ? deliveries.length : followups.length}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            {activeTab === 'deliveries'
              ? <><Truck size={32} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No deliveries scheduled for today</p></>
              : <><CalendarClock size={32} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No follow-ups for today</p></>
            }
          </div>
        ) : activeTab === 'deliveries' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Order #</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Address</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Scheduled Time</th>
                <th className="text-left px-4 py-3">Staff</th>
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
                  <td className="px-4 py-3 text-blue-700 font-medium text-xs">
                    {o.scheduledDate ? formatDate(o.scheduledDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{o.assignedStaff?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <th className="text-left px-4 py-3">Last Updated</th>
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
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(o.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
