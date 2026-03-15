import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '@/api/orders.api';
import client from '@/api/client';
import { ORDER_STATUSES, NIGERIA_STATES } from '@/lib/constants';
import { formatNGN, formatDate, downloadBlob } from '@/lib/utils';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import PhoneLink from '@/components/shared/PhoneLink';
import EmptyState from '@/components/shared/EmptyState';
import CalendarPicker from '@/components/shared/CalendarPicker';
import { Search, Filter, RefreshCw, ChevronDown, CheckSquare, Loader2, X, Plus, FileDown, Upload, UserPlus } from 'lucide-react';

function StateDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = NIGERIA_STATES.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  const select = (state) => { onChange(state); setOpen(false); setSearch(''); };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[130px]">
        <span className={`flex-1 text-left ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value || 'All States'}
        </span>
        {value
          ? <X size={13} className="text-gray-400 hover:text-gray-600 shrink-0" onClick={e => { e.stopPropagation(); select(''); }} />
          : <ChevronDown size={13} className="text-gray-400 shrink-0" />
        }
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 right-0 w-52 bg-white border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search state..."
                className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            <button onClick={() => select('')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!value ? 'text-primary font-medium bg-primary/5' : 'text-gray-700'}`}>
              All States
            </button>
            {filtered.map(s => (
              <button key={s} onClick={() => select(s)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${value === s ? 'text-primary font-medium bg-primary/5' : 'text-gray-700'}`}>
                {s}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-gray-400 px-3 py-3">No states found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

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
  { value: '__REMITTED__', label: 'Cash Remitted' },
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
  { value: 'remit', label: 'Mark Cash Remitted' },
  { value: 'unremit', label: 'Undo Cash Remittance' },
  { value: 'delete', label: 'Delete Orders (Permanent)' },
];

function AddOrderModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerPhone2: '', address: '',
    state: '', city: '', totalAmount: '', notes: '', comment: '',
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
              <StateDropdown value={form.state} onChange={v => setForm(f => ({ ...f, state: v }))} />
            </div>
            {inp('city', 'City')}
            {inp('totalAmount', 'Total Amount (NGN)', 'number', true)}
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
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduleReminder, setScheduleReminder] = useState({ enabled: false, offset: 1440 });

  // Delivered modal state
  const [deliveredModal, setDeliveredModal] = useState(false);
  const [bulkAgentId, setBulkAgentId] = useState('');

  // Remit modal state
  const [remitModal, setRemitModal] = useState(false);
  const [bulkRemitFee, setBulkRemitFee] = useState('');

  const importRef = useRef(null);

  const { data: agentsData } = useQuery({
    queryKey: ['agents-list'],
    queryFn: () => client.get('/agents', { params: { limit: 200 } }).then(r => r.data),
    staleTime: 60000,
  });
  const agents = agentsData?.data ?? agentsData ?? [];

  const isRemittedTab = activeTab === '__REMITTED__';
  const params = {
    status:        (!isRemittedTab && activeTab) ? activeTab : undefined,
    paymentStatus: isRemittedTab ? 'REMITTED' : undefined,
    search:      search || undefined,
    state:       stateFilter || undefined,
    page,
    limit: 50,
  };

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

  const executeBulk = (overrideScheduledDate, overrideAgentId, overrideReminder) => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === 'status:SCHEDULED' && !overrideScheduledDate) {
      setScheduleModal(true);
      return;
    }
    if ((bulkAction === 'status:DELIVERED' || bulkAction === 'status:FAILED') && overrideAgentId === undefined) {
      setDeliveredModal(true);
      return;
    }
    if (bulkAction === 'remit') {
      setRemitModal(true);
      return;
    }
    if (bulkAction === 'unremit') {
      if (!window.confirm(`Undo remittance for ${selectedIds.length} order(s)? They will be marked as Unremitted.`)) return;
      bulkMutation.mutate({ action: 'unremit', payload: {} });
      return;
    }
    if (bulkAction.startsWith('status:')) {
      const status = bulkAction.split(':')[1];
      const reminder = overrideReminder ?? scheduleReminder;
      bulkMutation.mutate({
        action: 'status',
        payload: {
          status,
          scheduledDate: overrideScheduledDate || undefined,
          agentId: overrideAgentId || undefined,
          reminderEnabled: reminder.enabled,
          reminderOffset: reminder.offset,
        },
      });
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
        <div className="flex items-center gap-2">
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImporting(true);
              try {
                const fd = new FormData();
                fd.append('file', file);
                const res = await ordersApi.import(fd);
                qc.invalidateQueries(['orders']);
                alert(`Imported ${res.imported} orders. Skipped ${res.skipped} invalid rows.`);
              } catch (err) {
                alert(err.response?.data?.error ?? 'Import failed');
              } finally { setImporting(false); e.target.value = ''; }
            }} />
          <button onClick={() => importRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 border bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import
          </button>
          <button onClick={async () => {
            setExporting(true);
            try {
              const blob = await ordersApi.export({ status: activeTab || undefined, search: search || undefined, state: stateFilter || undefined });
              downloadBlob(blob, `orders-${new Date().toISOString().slice(0,10)}.xlsx`);
            } finally { setExporting(false); }
          }} disabled={exporting}
            className="flex items-center gap-2 border bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Export
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus size={15} /> Add Order
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 overscroll-x-contain">
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
        <StateDropdown value={stateFilter} onChange={v => { setStateFilter(v); setPage(1); }} />
        <button onClick={() => refetch()} disabled={isLoading} className="p-2 border rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-50">
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
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
          <button onClick={() => executeBulk()} disabled={!bulkAction || bulkMutation.isPending}
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
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Delivery Agent</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? Array(8).fill(0).map((_, i) => (
                <tr key={i}>{Array(10).fill(0).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : orders.length === 0 ? (
                <tr><td colSpan={10}><EmptyState title="No orders found" description="Try adjusting your filters." /></td></tr>
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
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {order.paymentMethod === 'PBD'
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">PBD</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">COD</span>
                      }
                      {order.paymentStatus === 'REMITTED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Remitted</span>
                      )}
                    </div>
                  </td>
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

      {/* Schedule Modal — calendar + reminder */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Schedule Delivery</h3>
              <button onClick={() => { setScheduleModal(false); setScheduledDate(''); setScheduleReminder({ enabled: false, offset: 1440 }); }}
                className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <CalendarPicker
              value={scheduledDate}
              onChange={setScheduledDate}
              reminderEnabled={scheduleReminder.enabled}
              reminderOffset={scheduleReminder.offset}
              onReminderChange={({ enabled, offset }) => setScheduleReminder({ enabled, offset })}
              showReminder={true}
            />
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setScheduleModal(false); setScheduledDate(''); setScheduleReminder({ enabled: false, offset: 1440 }); }}
                className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button
                disabled={!scheduledDate}
                onClick={() => {
                  setScheduleModal(false);
                  executeBulk(scheduledDate, undefined, scheduleReminder);
                  setScheduledDate('');
                  setScheduleReminder({ enabled: false, offset: 1440 });
                }}
                className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivered / Agent modal */}
      {deliveredModal && (() => {
        const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
        const selectedStates = [...new Set(selectedOrders.map(o => o.state).filter(Boolean))];
        // Show agents that cover at least one of the selected orders' states, or agents with no states configured
        const stateAgents = agents.filter(a =>
          !a.states?.length || selectedStates.some(s => a.states.includes(s))
        );
        const hasAgents = agents.length > 0;
        const noAgentsForStates = hasAgents && stateAgents.length === 0;
        const stateLabel = selectedStates.length === 1 ? selectedStates[0] : `${selectedStates.length} states`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">
                {bulkAction === 'status:DELIVERED' ? 'Who delivered these orders?' : 'Assign delivery agent'}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedIds.length} order{selectedIds.length !== 1 ? 's' : ''} selected
                {selectedStates.length > 0 && <> · <span className="font-medium text-gray-700">{stateLabel}</span></>}
              </p>

              {/* No agents at all */}
              {!hasAgents && (
                <a href="/agents" className="flex items-center gap-2 text-xs text-primary hover:underline bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
                  <UserPlus size={13} />
                  No delivery agents added yet — click to add one
                </a>
              )}

              {/* Agents exist but none cover selected states */}
              {noAgentsForStates && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2.5 space-y-1.5">
                  <p className="text-xs text-amber-700 font-medium">
                    No delivery agents set up for {stateLabel}.
                  </p>
                  <a href="/agents" className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                    <UserPlus size={12} />
                    Add an agent for {stateLabel}
                  </a>
                </div>
              )}

              {/* State-filtered agent list */}
              {stateAgents.length > 0 && (
                <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                  <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="bulk-agent" value="" checked={bulkAgentId === ''}
                      onChange={() => setBulkAgentId('')} className="accent-primary" />
                    <span className="text-sm text-gray-500 italic">No delivery agent / skip</span>
                  </label>
                  {stateAgents.map(agent => (
                    <label key={agent.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="bulk-agent" value={agent.id} checked={bulkAgentId === agent.id}
                        onChange={() => setBulkAgentId(agent.id)} className="accent-primary" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">{agent.name}</p>
                        {agent.states?.length > 0 && <p className="text-[10px] text-gray-400 truncate">{agent.states.join(', ')}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setDeliveredModal(false); setBulkAgentId(''); }}
                  className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={() => { setDeliveredModal(false); executeBulk(undefined, bulkAgentId || null); setBulkAgentId(''); }}
                  className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cash Remittance confirmation modal */}
      {remitModal && (() => {
        const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
        const totalCollected = selectedOrders.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
        const enteredFee     = parseFloat(bulkRemitFee) || 0;
        const netRemitted    = totalCollected - enteredFee;
        const fmt = (n) => `₦${Number(n).toLocaleString('en-NG')}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                Cash Remittance Summary
              </h3>
              <p className="text-xs text-gray-500">{selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected</p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Total collected from customers</p>
                  <p className="text-lg font-bold text-gray-900">{fmt(totalCollected)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">
                    Agent delivery charge (₦)
                  </label>
                  <input
                    type="number"
                    value={bulkRemitFee}
                    onChange={e => setBulkRemitFee(e.target.value)}
                    placeholder="Enter total agent charge"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    autoFocus
                  />
                </div>
                <div className="bg-gray-50 border rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Collected from customers</span>
                    <span className="font-medium">{fmt(totalCollected)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Agent delivery charge</span>
                    <span>– {fmt(enteredFee)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-green-700">
                    <span>Net remitted to store</span>
                    <span>{fmt(netRemitted)}</span>
                  </div>
                </div>
              </div>

              {selectedOrders.some(o => o.paymentMethod !== 'COD') && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Note: some selected orders are not COD. Only COD orders should be remitted.
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setRemitModal(false); setBulkRemitFee(''); }}
                  className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={() => {
                  setRemitModal(false);
                  setBulkRemitFee('');
                  bulkMutation.mutate({ action: 'remit', payload: { deliveryFee: enteredFee } });
                }}
                  className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700">
                  Confirm Remittance
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
