import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '@/api/orders.api';
import StatCard from '@/components/shared/StatCard';
import { formatNGN } from '@/lib/utils';
import { ORDER_STATUSES } from '@/lib/constants';
import { ShoppingBag, DollarSign, Package, TrendingUp, AlertCircle, ShoppingCart, MessageSquare, CheckCircle, ChevronDown } from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d',  label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m',  label: 'Last 3 months' },
  { value: '6m',  label: 'Last 6 months' },
  { value: '1y',  label: 'Last 1 year' },
  { value: '2y',  label: 'Last 2 years' },
];

function PeriodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = PERIOD_OPTIONS.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm bg-white hover:bg-gray-50 font-medium text-gray-700"
      >
        {selected?.label}
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1 right-0 w-44 bg-white border rounded-xl shadow-lg overflow-hidden">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                value === opt.value ? 'text-primary font-medium bg-primary/5' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState('7d');

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['order-stats', period],
    queryFn: () => ordersApi.stats(period),
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
  const selectedLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Overview</h2>
          <p className="text-sm text-gray-500">{selectedLabel}{period !== 'today' && period !== 'yesterday' ? ' vs previous period' : ''}</p>
        </div>
        <PeriodDropdown value={period} onChange={setPeriod} />
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={stats?.thisWeek?.count ?? '—'}
          change={stats?.weekOverWeek?.countChange}
          changeLabel="vs previous period"
          icon={ShoppingBag}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title="Total Orders Amount"
          value={isLoading ? '—' : formatNGN(stats?.thisWeek?.totalAmount)}
          change={stats?.weekOverWeek?.amountChange}
          changeLabel="vs previous period"
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
