import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface Box { title: string; sub: string; to: string }
function Card({ title, sub, to, highlight }: Box & { highlight?: boolean }) {
  const nav = useNavigate();
  return (
    <button onClick={() => nav(to)} className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${highlight ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 hover:border-brand-300'}`}>
      <p className={`font-bold text-sm ${highlight ? 'text-white' : 'text-slate-900'}`}>{title}</p>
      <p className={`text-xs mt-0.5 ${highlight ? 'text-white/80' : 'text-slate-400'}`}>{sub}</p>
    </button>
  );
}

const RULES: [string, string, string, string][] = [
  ['Invoice (sent)', 'Accounts receivable', 'Income account per line, VAT payable', 'P&L, balance sheet, AR aging, sales reports, VAT'],
  ['Payment received', 'Bank or cash, WHT receivable if deducted', 'Accounts receivable', 'Cash flow, AR aging, tax summary'],
  ['Bill (open)', 'Expense or cost account per line, VAT receivable', 'Accounts payable', 'P&L, AP aging, purchases by vendor, VAT'],
  ['Payment made', 'Accounts payable', 'Bank or cash, WHT payable if withheld', 'Cash flow, AP aging, tax summary'],
  ['Expense', 'Expense account, VAT receivable', 'Paid-from account (bank, cash or employee reimbursements)', 'P&L, expenses by category, cash flow'],
  ['Bank deposit', 'Bank or cash', 'Chosen offset account', 'Cash flow, bank summary'],
  ['Bank withdrawal / transfer', 'Offset account or receiving account', 'Bank or cash', 'Cash flow, bank summary'],
  ['Manual journal (published)', 'Lines you enter', 'Lines you enter', 'Every ledger report'],
  ['Currency adjustment', 'Revalued account if asset gain', 'Exchange gain or loss', 'P&L, balance sheet'],
  ['Timesheet', 'Nothing until billed', 'Nothing until billed', 'Project time summary; billing creates an invoice'],
  ['Budget', 'No posting', 'No posting', 'Budget vs actuals compares it with the ledger'],
  ['Transaction locking', 'No posting', 'No posting', 'Blocks creating, editing or deleting entries on or before the lock date'],
  ['Bulk update', 'Moves existing postings to another account', '', 'Changes what every report shows for those transactions'],
  ['Request payment (auto-post)', 'Expense account by request category', 'Operating bank', 'P&L, trial balance — posted when finance marks paid'],
];

export default function FinConnect() {
  const { finAccounts, finJournalEntries, finContacts, finItems, finDocuments, finBudgets } = useStore();
  const count = (kind: string) => finDocuments.filter(d => d.kind === kind && d.status !== 'void').length;
  const posted = finJournalEntries.filter(e => e.status === 'published').length;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-black text-slate-900">How it connects</h2>
        <p className="text-xs text-slate-500 mt-1">Master data feeds transactions, every transaction posts to the general ledger, and reports read from the ledger. Select any box to open that area.</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-5 items-start">
          {/* Master data */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Master data</p>
            <Card title="Items" sub={`${finItems.length} items`} to="/finance/ledger/items" />
            <Card title="Customers" sub={`${finContacts.filter(c => c.type === 'customer' || c.type === 'both').length} customers`} to="/finance/ledger/contacts" />
            <Card title="Vendors" sub={`${finContacts.filter(c => c.type === 'vendor' || c.type === 'both').length} vendors`} to="/finance/ledger/contacts" />
            <Card title="Projects" sub={`${count('project')} projects`} to="/finance/ledger/projects" />
            <Card title="Timesheets" sub={`${count('timesheet')} entries`} to="/finance/ledger/projects" />
          </div>

          {/* Transactions */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Transactions</p>
            <Card title="Invoices" sub={`${count('invoice')} invoices`} to="/finance/ledger/sales/invoices" />
            <Card title="Payments received" sub={`${count('receipt')} receipts`} to="/finance/ledger/sales/receipts" />
            <Card title="Bank transactions" sub={`${count('bank')} transactions`} to="/finance/ledger/banking" />
            <Card title="Bills" sub={`${count('bill')} bills`} to="/finance/ledger/purchases/bills" />
            <Card title="Expenses" sub={`${count('expense')} expenses`} to="/finance/ledger/purchases/expenses" />
            <Card title="Payments made" sub={`${count('payment')} payments`} to="/finance/ledger/purchases/payments" />
            <Card title="Manual journals" sub={`${finJournalEntries.filter(e => e.source === 'journal').length} journals`} to="/finance/ledger/journals" />
            <Card title="Currency adjustments" sub={`${finJournalEntries.filter(e => e.source === 'fx').length} revaluations`} to="/finance/ledger/journals" />
          </div>

          {/* Ledger + controls */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ledger &amp; controls</p>
            <Card title="General ledger" sub={`${posted} posted entries · ${finAccounts.length} accounts`} to="/finance/ledger/reports/acct" highlight />
            <Card title="Chart of accounts" sub="Add or update accounts" to="/finance/ledger/reports" />
            <Card title="Transaction locking" sub={`${finDocuments.filter(d => d.kind === 'lock' && d.status !== 'void').length ? 'Lock active' : 'No active lock'}`} to="/finance/ledger/lock" />
            <Card title="Bulk update" sub="Reclassify postings" to="/finance/ledger/lock" />
            <Card title="Budgets" sub={`${finBudgets.length} budgets`} to="/finance/ledger/reports/budget" />
            <Card title="Import / export" sub="Zoho CSV in & out" to="/finance/ledger/import" />
            <Card title="Activity log" sub="Who posted what" to="/finance/ledger/activity" />
          </div>

          {/* Reports */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reports</p>
            <Card title="Profit & loss" sub="Income vs expenses" to="/finance/ledger/reports/pl" />
            <Card title="Balance sheet" sub="Assets, liabilities, equity" to="/finance/ledger/reports/bs" />
            <Card title="Cash flow" sub="Money in vs out" to="/finance/ledger/reports/cf" />
            <Card title="Trial balance & GL" sub="Every account's position" to="/finance/ledger/reports/tb" />
            <Card title="Ratios & equity" sub="Current ratio, margins" to="/finance/ledger/reports/ratios" />
            <Card title="VAT & WHT summary" sub="Tax position" to="/finance/ledger/reports/tax" />
            <Card title="Receivables aging" sub="Open invoices by age" to="/finance/ledger/reports/ar" />
            <Card title="Payables aging" sub="Open bills by age" to="/finance/ledger/reports/ap" />
            <Card title="Account transactions" sub="Drill into an account" to="/finance/ledger/reports/acct" />
            <Card title="Budget vs actuals" sub="Targets vs the ledger" to="/finance/ledger/reports/budget" />
          </div>
        </div>
      </div>

      {/* Posting rules — reference for what each document does to the books */}
      <div className="card p-5">
        <h2 className="font-black text-slate-900">Posting rules</h2>
        <p className="text-xs text-slate-500 mt-1 mb-3">What each document does to the books.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-4">Item</th><th className="pr-4">Debit</th><th className="pr-4">Credit</th><th>Shows up in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {RULES.map(([item, dr, cr, shows]) => (
                <tr key={item}>
                  <td className="py-2 pr-4 font-bold text-slate-800 whitespace-nowrap">{item}</td>
                  <td className="py-2 pr-4 text-slate-600">{dr}</td>
                  <td className="py-2 pr-4 text-slate-600">{cr}</td>
                  <td className="py-2 text-xs text-slate-400">{shows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
