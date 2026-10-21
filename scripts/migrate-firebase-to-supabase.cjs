const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const apply = process.argv.includes('--apply');
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });

const db = admin.firestore();
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const specs = [
  ['sites', 'sites', row => ({ id: row.id, name: row.name, address: row.address || '', size: row.size || '', contact_name: row.contactName || '', contact_phone: row.contactPhone || '', contact_email: row.contactEmail || '', petty_cash_enabled: Boolean(row.pettyCashEnabled), float_limit: row.floatLimit || 0, monthly_budget: row.monthlyBudget || 0, current_month_spend: row.currentMonthSpend || 0, sla_expiry_date: row.slaExpiryDate || null, created_at: row.createdAt || new Date().toISOString() })],
  ['users', 'profiles', row => ({ id: row.id, name: row.name, email: row.email, role: row.role, site_id: row.siteId || null, avatar: row.avatar || null, department: row.department || '', active: true })],
  ['vendors', 'vendors', row => ({ id: row.id, name: row.name, category: row.category || '', type: row.type || 'one_time', bank_name: row.bankName || '', account_number: row.accountNumber || '', account_name: row.accountName || '', total_jobs_completed: row.totalJobsCompleted || 0, total_amount_paid: row.totalAmountPaid || 0, avg_completion_days: row.avgCompletionDays || 0, last_job_date: row.lastJobDate || null, risk_score: row.riskScore || 'low', created_at: row.createdAt || new Date().toISOString() })],
  ['assets', 'assets', row => ({ id: row.id, name: row.name, site_id: row.siteId, installation_date: row.installationDate || null, last_repair_date: row.lastRepairDate || null, total_repair_cost: row.totalRepairCost || 0, maintenance_history: row.maintenanceHistory || [], status: row.status || 'operational' })],
  ['requests', 'requests', row => ({ id: row.id, request_number: row.requestNumber, site_id: row.siteId, site_name: row.siteName, submitted_by: row.submittedBy, submitted_by_name: row.submittedByName, description: row.description, priority: row.priority, status: row.status, vendor_id: row.vendorId || null, vendor_name: row.vendorName || null, vendor_type: row.vendorType || null, invoice_amount: row.invoiceAmount || null, invoice_url: row.invoiceUrl || null, fault_photo_url: row.faultPhotoUrl || null, attachments: row.attachments || [], storage_saved: row.storageSaved || null, asset_id: row.assetId || null, asset_name: row.assetName || null, purchase_order: row.purchaseOrder || null, tax_type: row.taxType || null, gross_amount: row.grossAmount || null, tax_amount: row.taxAmount || null, net_payment: row.netPayment || null, payment_receipt_url: row.paymentReceiptUrl || null, rejection_comment: row.rejectionComment || null, is_emergency_bypass: Boolean(row.isEmergencyBypass), is_budget_warning: Boolean(row.isBudgetWarning), sla_deadline: value(row.slaDeadline), sla_breached: Boolean(row.slaBreached), audit_trail: row.auditTrail || [], created_at: value(row.createdAt), updated_at: value(row.updatedAt) })],
  ['checklists', 'checklists', row => ({ id: row.id, title: row.title, site_id: row.siteId, type: row.type, items: row.items || [], completed_by: row.completedBy || null, completed_at: row.completedAt ? value(row.completedAt) : null, submitted_to_admin: Boolean(row.submittedToAdmin), created_at: value(row.createdAt) })],
  ['treasury', 'treasury', row => ({ id: row.id, description: row.description, source: row.source, amount: row.amount, type: row.type, date: value(row.date), recorded_by: row.recordedBy })],
];

function value(input) {
  if (!input) return new Date().toISOString();
  if (typeof input.toDate === 'function') return input.toDate().toISOString();
  return input;
}

async function readCollection(name) {
  const snapshot = await db.collection(name).get();
  return snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
}

async function run() {
  const summary = [];
  for (const [source, target, map] of specs) {
    const sourceRows = await readCollection(source);
    const rows = sourceRows.map(map);
    summary.push({ source, target, records: rows.length });
    if (apply && rows.length) {
      const { error } = await supabase.from(target).upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`${target}: ${error.message}`);
    }
  }
  console.table(summary);
  console.log(apply ? 'Migration applied successfully.' : 'Dry run only. Re-run with --apply after reviewing counts.');
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
