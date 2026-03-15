import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '@/api/orders.api';
import StatCard from '@/components/shared/StatCard';
import { formatNGN } from '@/lib/utils';
import { ORDER_STATUSES } from '@/lib/constants';
import {
  ShoppingBag, DollarSign, Package, TrendingUp, AlertCircle, ChevronDown,
  Target, MapPin, Users, BarChart2, Download, Loader2, Trophy,
} from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d',        label: 'Last 7 days' },
  { value: '14d',       label: 'Last 14 days' },
  { value: '30d',       label: 'Last 30 days' },
  { value: '3m',        label: 'Last 3 months' },
  { value: '6m',        label: 'Last 6 months' },
  { value: '1y',        label: 'Last 1 year' },
  { value: '2y',        label: 'Last 2 years' },
];

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'exports',   label: 'Exports' },
  { id: 'top-sales', label: 'Top Sales' },
  { id: 'customers', label: 'Customers' },
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

// ── Shared panel wrapper ──────────────────────────────────────────────────────
function Panel({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ stats, isLoading, selectedLabel }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Status breakdown — period-aware */}
      <Panel className="lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Order Status Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">{selectedLabel} · orders by status</p>
          </div>
          <BarChart2 size={18} className="text-gray-300" />
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {ORDER_STATUSES.filter(s => s.value !== 'DELETED').map(s => {
              const count = stats?.byStatus?.[s.value] ?? 0;
              if (count === 0) return null;
              return (
                <Link
                  key={s.value}
                  to={`/orders?status=${s.value}`}
                  className="border border-gray-100 rounded-xl p-4 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors bg-gray-50/30 group"
                >
                  <p className="text-xs font-medium text-gray-500 truncate mb-1 group-hover:text-primary transition-colors">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </Link>
              );
            })}
            {ORDER_STATUSES.filter(s => s.value !== 'DELETED' && (stats?.byStatus?.[s.value] ?? 0) === 0).map(s => (
              <div key={s.value} className="border border-dashed border-gray-100 rounded-xl p-4 bg-transparent">
                <p className="text-xs font-medium text-gray-300 truncate mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-200">0</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Abandoned Cart Widget */}
      <Panel>
        <div className="flex flex-col h-full">
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Abandoned Carts</h3>
            <p className="text-[13px] text-gray-500 mt-1">Recovery tracking & WhatsApp automation</p>
          </div>

          <div className="mt-8 flex-1 flex flex-col items-center justify-center">
            <div className="relative w-40 h-40 mb-2">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="175" className="transition-all duration-1000 ease-in-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                <p className="text-3xl font-bold text-gray-900">{stats?.abandoned?.total ?? 0}</p>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mt-1">Total</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1 items-center">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div> Pending
              </span>
              <span className="text-lg font-bold text-gray-800">{stats?.abandoned?.pending ?? 0}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1 items-center">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Msg Sent
              </span>
              <span className="text-lg font-bold text-gray-800">{stats?.abandoned?.messaged ?? 0}</span>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex flex-col gap-1 items-center col-span-2 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <div className="w-2 h-2 rounded-full bg-primary outline outline-2 outline-offset-1 outline-primary/30"></div> Recovered
              </span>
              <span className="text-xl font-bold text-primary">{stats?.abandoned?.recovered ?? 0}</span>
            </div>
          </div>

          <Link to="/abandoned-carts" className="mt-4 block text-center text-[13px] text-primary hover:text-primary/80 font-semibold transition-colors">
            View all carts →
          </Link>
        </div>
      </Panel>
    </div>
  );
}

// ── Exports tab ───────────────────────────────────────────────────────────────
function ExportsTab({ period, selectedLabel }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handleExport = async (statusFilter) => {
    setExporting(true);
    setExportError(null);
    try {
      const params = { period };
      if (statusFilter) params.status = statusFilter;
      const blob = await ordersApi.export(params);
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${statusFilter ?? 'all'}-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportOptions = [
    { label: 'All Orders',        status: null,        desc: 'Every order in the period' },
    { label: 'Delivered',         status: 'DELIVERED', desc: 'Successfully delivered orders' },
    { label: 'Pending',           status: 'PENDING',   desc: 'Orders awaiting confirmation' },
    { label: 'Cancelled / Failed',status: 'CANCELLED', desc: 'Cancelled and failed orders' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {exportOptions.map(opt => (
        <Panel key={opt.label}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">{opt.label}</h4>
              <p className="text-sm text-gray-500">{opt.desc}</p>
              <p className="text-xs text-gray-400 mt-1">Period: {selectedLabel}</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-primary" />
            </div>
          </div>
          <button
            onClick={() => handleExport(opt.status)}
            disabled={exporting}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export to Excel
          </button>
        </Panel>
      ))}
      {exportError && (
        <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {exportError}
        </div>
      )}
    </div>
  );
}

// ── Top Sales tab ─────────────────────────────────────────────────────────────
function TopSalesTab({ stats, isLoading, selectedLabel }) {
  const topProducts = stats?.topProducts ?? [];
  const topStates   = stats?.topStates   ?? [];
  const maxRevenue  = topProducts[0]?.revenue ?? 1;
  const maxCount    = topStates[0]?.count ?? 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Products */}
      <Panel>
        <div className="flex items-center gap-2 mb-5">
          <Trophy size={18} className="text-primary" />
          <div>
            <h3 className="font-bold text-gray-900">Top Products</h3>
            <p className="text-xs text-gray-400">{selectedLabel} · by revenue</p>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : topProducts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No sales data for this period.</p>
        ) : (
          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div key={p.productId}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-400 text-yellow-900' :
                      i === 1 ? 'bg-gray-300 text-gray-700' :
                      i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-bold text-gray-900">{formatNGN(p.revenue)}</p>
                    <p className="text-xs text-gray-400">{p.count} order{p.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Top States */}
      <Panel>
        <div className="flex items-center gap-2 mb-5">
          <MapPin size={18} className="text-primary" />
          <div>
            <h3 className="font-bold text-gray-900">Top States</h3>
            <p className="text-xs text-gray-400">{selectedLabel} · by order count</p>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : topStates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No data for this period.</p>
        ) : (
          <div className="space-y-4">
            {topStates.map((s, i) => (
              <div key={s.state}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-400 text-yellow-900' :
                      i === 1 ? 'bg-gray-300 text-gray-700' :
                      i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <Link
                      to={`/orders?state=${encodeURIComponent(s.state)}`}
                      className="text-sm font-medium text-gray-800 hover:text-primary hover:underline transition-colors"
                    >
                      {s.state}
                    </Link>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{s.count} order{s.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-700"
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── Customers tab ─────────────────────────────────────────────────────────────
function CustomersTab({ stats, isLoading, selectedLabel }) {
  const customers = stats?.topCustomers ?? [];

  return (
    <Panel>
      <div className="flex items-center gap-2 mb-5">
        <Users size={18} className="text-primary" />
        <div>
          <h3 className="font-bold text-gray-900">Top Customers</h3>
          <p className="text-xs text-gray-400">{selectedLabel} · ranked by total spend</p>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array(8).fill(0).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : customers.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No customer data for this period.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {customers.map((c, i) => (
            <div key={c.phone} className="flex items-center gap-4 py-3.5">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                i === 0 ? 'bg-yellow-400 text-yellow-900' :
                i === 1 ? 'bg-gray-300 text-gray-700' :
                i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-gray-100 text-gray-500'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.phone}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{formatNGN(c.total)}</p>
                <p className="text-xs text-gray-400">{c.count} order{c.count !== 1 ? 's' : ''}</p>
              </div>
              <Link
                to={`/orders?search=${encodeURIComponent(c.phone)}`}
                className="text-xs text-primary hover:underline font-medium flex-shrink-0"
              >
                View →
              </Link>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [period, setPeriod] = useState('today');
  const [activeTab, setActiveTab] = useState('overview');

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

  const marginPercent = 0.46;
  const estProfit = stats ? stats.thisWeek.deliveredAmount * marginPercent : 0;
  const selectedLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '';

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-px">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Overview</h2>
          <PeriodDropdown value={period} onChange={setPeriod} />
        </div>
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-[15px] pb-3 px-3 -mb-0.5 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-primary border-primary font-semibold'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards — always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
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
          title="Est. Profit (46%)"
          value={isLoading ? '—' : formatNGN(estProfit)}
          icon={DollarSign}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Collected"
          value={stats?.thisWeek?.delivered ?? '—'}
          subValue={isLoading ? '' : formatNGN(stats?.thisWeek?.deliveredAmount)}
          icon={TrendingUp}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Delivery Rate"
          value={isLoading ? '—' : `${stats?.thisWeek?.deliveryRate ?? 0}%`}
          subValue={isLoading ? '' : `${stats?.thisWeek?.delivered ?? 0} of ${stats?.thisWeek?.count ?? 0} delivered`}
          icon={Target}
          color="orange"
          loading={isLoading}
        />
      </div>

      {/* Tab content */}
      {activeTab === 'overview'  && <OverviewTab  stats={stats} isLoading={isLoading} selectedLabel={selectedLabel} />}
      {activeTab === 'exports'   && <ExportsTab   period={period} selectedLabel={selectedLabel} />}
      {activeTab === 'top-sales' && <TopSalesTab  stats={stats} isLoading={isLoading} selectedLabel={selectedLabel} />}
      {activeTab === 'customers' && <CustomersTab stats={stats} isLoading={isLoading} selectedLabel={selectedLabel} />}
    </div>
  );
}
