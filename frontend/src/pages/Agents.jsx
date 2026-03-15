import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import { NIGERIA_STATES } from '@/lib/constants';
import { Plus, Pencil, Trash2, Loader2, X, Users, FileDown } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

const api = {
  list:   () => client.get('/agents').then(r => r.data),
  create: (d) => client.post('/agents', d).then(r => r.data),
  update: (id, d) => client.put(`/agents/${id}`, d).then(r => r.data),
  delete: (id) => client.delete(`/agents/${id}`).then(r => r.data),
  export: () => client.get('/agents/export', { responseType: 'blob' }).then(r => r.data),
};

const emptyForm = { name:'', companyName:'', phone:'', phone2:'', country:'Nigeria', states:[], address:'', notes:'' };

function AgentModal({ agent, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(agent ? {
    name: agent.name, companyName: agent.companyName ?? '', phone: agent.phone ?? '',
    phone2: agent.phone2 ?? '', country: agent.country ?? 'Nigeria',
    states: agent.states ?? [], address: agent.address ?? '', notes: agent.notes ?? '',
  } : { ...emptyForm });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: agent ? (d) => api.update(agent.id, d) : api.create,
    onSuccess: () => { qc.invalidateQueries(['agents']); onClose(); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed'),
  });

  const toggleState = (s) => setForm(f => ({
    ...f, states: f.states.includes(s) ? f.states.filter(x => x !== s) : [...f.states, s]
  }));

  const inp = (key, label, req) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}{req ? ' *' : ''}</label>
      <input value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h3 className="font-semibold">{agent ? 'Edit Delivery Agent' : 'Add Delivery Agent'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {inp('name', 'Delivery Agent Name', true)}
            {inp('companyName', 'Company Name')}
            {inp('phone', 'Phone')}
            {inp('phone2', 'Phone 2')}
          </div>
          {inp('address', 'Address')}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">States Covered</label>
            <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto border rounded-lg p-2">
              {NIGERIA_STATES.map(s => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer text-xs p-0.5">
                  <input type="checkbox" checked={form.states.includes(s)} onChange={() => toggleState(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {agent ? 'Save Changes' : 'Add Delivery Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Agents() {
  const qc = useQueryClient();
  const [editAgent, setEditAgent] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: agents = [], isLoading } = useQuery({ queryKey: ['agents'], queryFn: api.list });
  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries(['agents']),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Delivery Agents</h2>
          <p className="text-sm text-gray-500">{agents.length} delivery agents</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            setExporting(true);
            try {
              const blob = await api.export();
              downloadBlob(blob, `agents-${new Date().toISOString().slice(0,10)}.xlsx`);
            } finally { setExporting(false); }
          }} disabled={exporting}
            className="flex items-center gap-2 border bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Export
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus size={15} /> Add Delivery Agent
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No delivery agents yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">States</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agents.filter(a => a.status !== false).map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-gray-600">{a.companyName || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.states?.slice(0,3).join(', ')}{a.states?.length > 3 ? ` +${a.states.length - 3}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditAgent(a)} className="p-1 text-gray-400 hover:text-gray-700"><Pencil size={14} /></button>
                      <button onClick={() => { if(confirm('Deactivate delivery agent?')) deleteMutation.mutate(a.id); }}
                        className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showAdd || editAgent) && (
        <AgentModal agent={editAgent} onClose={() => { setShowAdd(false); setEditAgent(null); }} />
      )}
    </div>
  );
}
