import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi } from '@/api/forms.api';
import { formatDate } from '@/lib/utils';
import { ShoppingCart, RefreshCw, Check, X } from 'lucide-react';

const RECOVERY_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'messaged', label: 'Messaged', color: 'bg-blue-100 text-blue-800' },
  { value: 'recovered', label: 'Recovered', color: 'bg-green-100 text-green-800' },
  { value: 'ignored', label: 'Ignored', color: 'bg-gray-100 text-gray-600' },
];

function StatusBadge({ status }) {
  const s = RECOVERY_STATUSES.find(r => r.value === status) ?? RECOVERY_STATUSES[0];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}

export default function AbandonedCarts() {
  const [filter, setFilter] = useState('');
  const qc = useQueryClient();

  const { data = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['abandoned-carts', filter],
    queryFn: () => formsApi.listAbandoned(filter ? { status: filter } : {}),
    refetchInterval: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => formsApi.updateAbandoned(id, { recoveryStatus: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abandoned-carts'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Abandoned Carts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customers who started but didn't complete an order</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filter ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All
        </button>
        {RECOVERY_STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === s.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {RECOVERY_STATUSES.map(s => {
          const count = data.filter(c => c.recoveryStatus === s.value).length;
          return (
            <div key={s.value} className="bg-white border rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-20 text-center">
            <ShoppingCart size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No abandoned carts found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">Product</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">Form</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase font-medium">Date</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map(cart => (
                <tr key={cart.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cart.customerName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <a href={`https://wa.me/${cart.customerPhone.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-green-600 hover:underline">
                      {cart.customerPhone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {cart.productData?.productName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{cart.form?.name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={cart.recoveryStatus} /></td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(cart.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {cart.recoveryStatus !== 'recovered' && (
                        <button
                          onClick={() => updateMutation.mutate({ id: cart.id, status: 'recovered' })}
                          title="Mark recovered"
                          className="p-1.5 rounded hover:bg-green-50 text-green-600">
                          <Check size={14} />
                        </button>
                      )}
                      {cart.recoveryStatus !== 'ignored' && (
                        <button
                          onClick={() => updateMutation.mutate({ id: cart.id, status: 'ignored' })}
                          title="Mark ignored"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
