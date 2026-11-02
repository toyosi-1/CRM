import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink, Pencil } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../../components/shared/Badges';
import { formatCurrency, formatDate } from '../../utils/helpers';
import type { MaintenanceRequest } from '../../types';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { requests, vendors, updateRequest } = useStore();
  const [editReq, setEditReq] = useState<MaintenanceRequest | null>(null);
  const [form, setForm] = useState({ poNumber: '', vendorId: '', amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const posRequests = requests.filter(r => r.purchaseOrder);
  const totalValue = posRequests.reduce((s, r) => s + (r.purchaseOrder?.amount ?? r.invoiceAmount ?? 0), 0);

  const openEdit = (req: MaintenanceRequest) => {
    const po = req.purchaseOrder!;
    setSaveError('');
    setForm({ poNumber: po.poNumber, vendorId: po.vendorId, amount: String(po.amount), description: po.description });
    setEditReq(req);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editReq?.purchaseOrder || saving) return;
    const amount = Number(form.amount);
    if (!form.poNumber.trim() || !form.vendorId || !(amount > 0)) { setSaveError('PO number, vendor and a positive amount are required.'); return; }
    setSaving(true); setSaveError('');
    try {
      const vendor = vendors.find(v => v.id === form.vendorId);
      await updateRequest(editReq.id, {
        vendorId: form.vendorId,
        vendorName: vendor?.name ?? editReq.vendorName,
        invoiceAmount: amount,
        purchaseOrder: { ...editReq.purchaseOrder, poNumber: form.poNumber.trim(), vendorId: form.vendorId, amount, description: form.description.trim() },
      });
      setEditReq(null);
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Could not save PO'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Purchase orders</h1>
          <p className="page-subtitle">{posRequests.length} POs generated · Total value: <strong className="text-slate-700">{formatCurrency(totalValue)}</strong></p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header">PO number</th>
              <th className="table-header">Request</th>
              <th className="table-header">Site</th>
              <th className="table-header">Vendor</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Status</th>
              <th className="table-header">Generated</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {posRequests.map(req => (
              <tr key={req.id} className="table-row">
                <td className="table-cell font-bold text-brand-600">{req.purchaseOrder!.poNumber}</td>
                <td className="table-cell text-slate-700 text-xs">{req.requestNumber}</td>
                <td className="table-cell text-sm">{req.siteName}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-slate-400" />
                    <span className="text-sm">{vendors.find(v => v.id === req.purchaseOrder!.vendorId)?.name ?? req.vendorName ?? '—'}</span>
                  </div>
                </td>
                <td className="table-cell font-semibold">{formatCurrency(req.purchaseOrder!.amount)}</td>
                <td className="table-cell"><StatusBadge status={req.status} /></td>
                <td className="table-cell text-xs text-slate-400">{formatDate(req.purchaseOrder!.generatedAt)}</td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    {!['PAID', 'CLOSED', 'REJECTED'].includes(req.status) && (
                      <button onClick={() => openEdit(req)} className="btn-icon w-7 h-7" title="Edit PO" aria-label={`Edit ${req.purchaseOrder!.poNumber}`}><Pencil size={13} /></button>
                    )}
                    <button onClick={() => navigate(`/request/${req.id}`)} className="btn-icon w-7 h-7" aria-label="Open request"><ExternalLink size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {posRequests.length === 0 && (
              <tr><td colSpan={8}>
                <div className="flex flex-col items-center py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <FileText size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No purchase orders yet</p>
                  <p className="text-xs text-slate-400 mt-1">POs are generated from the Queue</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={save} className="card w-full max-w-lg p-6 space-y-4">
            <h2 className="font-bold text-lg">Edit {editReq.purchaseOrder!.poNumber} · {editReq.requestNumber}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">PO number<input className="input mt-1" required maxLength={40} value={form.poNumber} onChange={e => setForm({ ...form, poNumber: e.target.value })} /></label>
              <label className="block text-sm">Amount (₦)<input className="input mt-1" required type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
            </div>
            <label className="block text-sm">Vendor<select required className="input mt-1" value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })}><option value="">Select vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
            <label className="block text-sm">Scope / description<textarea className="input mt-1" rows={3} maxLength={500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
            <div className="flex justify-end gap-3"><button type="button" disabled={saving} className="btn-secondary" onClick={() => setEditReq(null)}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save PO'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
