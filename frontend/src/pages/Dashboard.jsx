import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import client from '@/api/client';
import StatCard from '@/components/shared/StatCard';
import { formatNGN } from '@/lib/utils';
import { ORDER_STATUSES } from '@/lib/constants';
import { ShoppingBag, DollarSign, Package, TrendingUp, AlertCircle, ShoppingCart, MessageSquare, CheckCircle } from 'lucide-react';

function fetchStats() {
  return client.get('/orders/stats').then(r => r.data);
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['order-stats'],
    queryFn: fetchStats,
    refetchInterval: 60000,
  });

  if (error) {
    return (
      <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        <AlertCircle size={18} />
        <p className="text-sm">Failed to load dashboard stats.</p>
      </div>
    );
  }

  const revenuePercent = 0.46;
  const totalRevenue = stats ? stats.thisWeek.totalAmount * revenuePercent : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Overview</h2>
        <p className="text-sm text-gray-500">This week vs last week</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={stats?.thisWeek?.count ?? '—'}
          change={stats?.weekOverWeek?.countChange}
          changeLabel="vs last week"
          icon={ShoppingBag}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title="Total Orders Amount"
          value={isLoading ? '—' : formatNGN(stats?.thisWeek?.totalAmount)}
          change={stats?.weekOverWeek?.amountChange}
          changeLabel="vs last week"
          icon={Package}
          color="purple"
          loading={isLoading}
        />
        <StatCard
          title="Revenue (46%)"
          value={isLoading ? '—' : formatNGN(totalRevenue)}
          icon={DollarSign}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Delivered"
          value={stats?.thisWeek?.delivered ?? '—'}
          subValue={isLoading ? '' : formatNGN(stats?.thisWeek?.deliveredAmount)}
          icon={TrendingUp}
          color="green"
          loading={isLoading}
        />
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Status Breakdown</h3>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ORDER_STATUSES.map(s => {
              const count = stats?.byStatus?.[s.value] ?? 0;
              return (
                <div key={s.value} className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500 truncate">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Abandoned Cart Recovery */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Cart Abandonment Recovery</h3>
            <p className="text-xs text-gray-400 mt-0.5">WhatsApp sent 3 min after phone captured</p>
          </div>
          <Link to="/abandoned-carts" className="text-xs text-primary hover:underline font-medium">View all →</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart size={14} className="text-gray-400" />
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats?.abandoned?.total ?? 0}</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-yellow-500" />
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats?.abandoned?.pending ?? 0}</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={14} className="text-blue-500" />
                <p className="text-xs text-gray-500">WA Sent</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats?.abandoned?.messaged ?? 0}</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-green-500" />
                <p className="text-xs text-gray-500">Recovered</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats?.abandoned?.recovered ?? 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
