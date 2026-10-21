import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../../components/shared/Badges';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { requests } = useStore();

  const posRequests = requests.filter(r => r.purchaseOrder);
  const totalValue = posRequests.reduce((s, r) => s + (r.invoiceAmount ?? 0), 0);

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
                    <span className="text-sm">{req.vendorName ?? '—'}</span>
                  </div>
                </td>
                <td className="table-cell font-semibold">{formatCurrency(req.purchaseOrder!.amount)}</td>
                <td className="table-cell"><StatusBadge status={req.status} /></td>
                <td className="table-cell text-xs text-slate-400">{formatDate(req.purchaseOrder!.generatedAt)}</td>
                <td className="table-cell">
                  <button onClick={() => navigate(`/request/${req.id}`)} className="btn-icon w-7 h-7">
                    <ExternalLink size={13} />
                  </button>
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
    </div>
  );
}
