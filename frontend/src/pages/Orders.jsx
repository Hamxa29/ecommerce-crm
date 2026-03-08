import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '@/api/orders.api';
import { ORDER_STATUSES, NIGERIA_STATES } from '@/lib/constants';
import { formatNGN, formatDate } from '@/lib/utils';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import PhoneLink from '@/components/shared/PhoneLink';
import EmptyState from '@/components/shared/EmptyState';
import { Search, Filter, RefreshCw, ChevronDown, CheckSquare, Loader2, X, Plus } from 'lucide-react';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'AWAITING', label: 'Awaiting' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'NOT_PICKING_CALLS', label: 'Not Picking' },
  { value: 'SWITCHED_OFF', label: 'Switched Off' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

const BULK_ACTIONS = [
  { value: 'status:CONFIRMED', label: 'Mark Confirmed' },
  { value: 'status:DELIVERED', label: 'Mark Delivered' },
  { value: 'status:AWAITING', label: 'Mark Awaiting' },
  { value: 'status:SCHEDULED', label: 'Mark Scheduled' },
  { value: 'status:NOT_PICKING_CALLS', label: 'Not Picking Calls' },
  { value: 'status:SWITCHED_OFF', label: 'Number Switched Off' },
  { value: 'status:FAILED', label: 'Mark Failed' },
  { value: 'status:CANCELLED', label: 'Cancel Orders' },
  { value: 'delete', label: 'Delete Orders' },
];

function AddOrderModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerPhone2: '', address: '',
    state: '', city: '', totalAmount: '', deliveryFee: '', notes: '', comment: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => ordersApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['orders']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed to create order'),
  });

  const inp = (key, label, type = 'text', required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}{required ? ' *' : ''}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );

  const submit = () => {
    if (!form.customerName || !form.customerPhone || !form.address || !form.state || !form.totalAmount)
      return setError('Name, phone, address, state, and total amount are required');
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-base font-semibold">Add Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {inp('customerName', 'Customer Name', 'text', true)}
            {inp('customerPhone', 'Phone Number', 'text', true)}
            {inp('customerPhone2', 'Phone 2 (optional)')}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
              <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select state...</option>
                {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {inp('city', 'City')}
            {inp('totalAmount', 'Total Amount (NGN)', 'number', true)}
            {inp('deliveryFee', 'Delivery Fee (NGN)', 'number')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
            <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {inp('notes', 'Notes')}
          {inp('comment', 'Comment')}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={mutation.isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Create Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);

  const params = { status: activeTab || undefined, search: search || undefined, state: stateFilter || undefined, page, limit: 50 };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ action, payload }) => ordersApi.bulk(selectedIds, action, payload),
    onSuccess: () => { qc.invalidateQueries(['orders']); setSelectedIds([]); setBulkAction(''); },
  });

  const orders = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  const toggleSelect = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const toggleAll = () => setSelectedIds(selectedIds.length === orders.length ? [] : orders.map(o => o.id));

  const executeBulk = () => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction.startsWith('status:')) {
      bulkMutation.mutate({ action: 'status', payload: { status: bulkAction.split(':')[1] } });
    } else {
      bulkMutation.mutate({ action: bulkAction, payload: {} });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Orders</h2>
          <p className="text-sm text-gray-500">{total.toLocaleString()} total orders</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={15} /> Add Order
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => { setActiveTab(tab.value); setPage(1); setSelectedIds([]); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone, order #..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All States</option>
          {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => refetch()} className="p-2 border rounded-lg hover:bg-gray-50 text-gray-500">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <span className="text-sm text-blue-700 font-medium">{selectedIds.length} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none flex-1 max-w-xs">
            <option value="">Choose action...</option>
            {BULK_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <button onClick={executeBulk} disabled={!bulkAction || bulkMutation.isPending}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60">
            {bulkMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckSquare size={13} />}
            Apply
          </button>
          <button onClick={() => setSelectedIds([])} className="text-gray-500 hover:text-gray-700"><X size={15} /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selectedIds.length === orders.length && orders.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-4 py-3">Order #</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Agent</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? Array(8).fill(0).map((_, i) => (
                <tr key={i}>{Array(9).fill(0).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : orders.length === 0 ? (
                <tr><td colSpan={9}><EmptyState title="No orders found" description="Try adjusting your filters." /></td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className={`hover:bg-gray-50 ${selectedIds.includes(order.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.includes(order.id)}
                      onChange={() => toggleSelect(order.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/orders/${order.id}`} className="text-primary hover:underline font-medium">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{order.customerName}</td>
                  <td className="px-4 py-3"><PhoneLink phone={order.customerPhone} /></td>
                  <td className="px-4 py-3 text-gray-600">{order.state}</td>
                  <td className="px-4 py-3 text-gray-900">{formatNGN(order.totalAmount)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{order.agent?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
            <span>Showing {orders.length} of {total.toLocaleString()}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
              <span className="px-3 py-1">Page {page} of {data.pagination.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!data.pagination.hasNext}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && <AddOrderModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
