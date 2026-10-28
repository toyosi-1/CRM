export type UserRole = 'facility_manager' | 'procurement' | 'supervisor' | 'finance' | 'admin' | 'ict_admin' | 'technician';

export type RequestStatus =
  | 'REQUEST_CREATED'
  | 'PROCUREMENT_REVIEW'
  | 'PO_GENERATED'
  | 'SUPERVISOR_APPROVAL'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CLOSED'
  | 'REJECTED'
  | 'ADMIN_APPROVED';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type VendorType = 'recurring' | 'one_time';
export type TaxType = '5pct_wht' | '10pct_wht' | 'exempt';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  siteId?: string;
  siteIds?: string[];
  avatar?: string;
  department: string;
  phone: string;
  trade: string;
  active?: boolean;
  notes?: string;
  actingForProfileId?: string;
  actingStart?: string;
  actingEnd?: string;
  actingHandover?: Record<string, unknown>;
  actingAcknowledgedAt?: string;
}

export type FacilityType =
  | 'Full residential building'
  | 'Single unit — multiple floors'
  | 'Single floor within a building'
  | 'Selected units within a building'
  | 'Full commercial building — multiple floors'
  | 'Mixed use — residential and commercial'
  | 'Gated estate — multiple structures';

export const FACILITY_TYPES: FacilityType[] = [
  'Full residential building',
  'Single unit — multiple floors',
  'Single floor within a building',
  'Selected units within a building',
  'Full commercial building — multiple floors',
  'Mixed use — residential and commercial',
  'Gated estate — multiple structures',
];

export interface Site {
  id: string;
  name: string;
  address: string;
  size: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  pettyCashEnabled: boolean;
  floatLimit: number;
  monthlyBudget: number;
  currentMonthSpend: number;
  slaExpiryDate: string;
  siteType: FacilityType;
  floors: string;
  units: string;
  scope: string;
  electricityBilling: 'postpaid' | 'prepaid' | 'none';
  meterAccountNo: string;
  emergencyContact: string;
  securityDesk: string;
  status: 'healthy' | 'watch' | 'overspent' | 'inactive';
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  type: VendorType;
  rcNumber?: string;
  exemptionNotes?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  totalJobsCompleted: number;
  totalAmountPaid: number;
  avgCompletionDays: number;
  lastJobDate: string;
  riskScore: 'low' | 'medium' | 'high';
  tier: '1' | '2' | '3';
  contactPerson: string;
  phone: string;
  email?: string;
  alias?: string;
  tin: string;
  verified: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  requestedBy?: string;
  guarantorProfileId?: string;
  createdAt: string;
}

export interface FacilityVendorSLA {
  id: string;
  siteId: string;
  vendorId: string;
  category: string;
  responseSlaHours: number;
  startDate?: string;
  expiryDate?: string;
  paymentModel?: 'prepaid' | 'per_service';
  suspended?: boolean;
  renewalReview?: boolean;
  breachNotices?: { issuedBy: string; at: string; reason: string }[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  name: string;
  siteId: string;
  floor?: string;
  location?: string;
  category?: string;
  purchaseDate?: string;
  shelfLifeMonths?: number;
  installationDate: string;
  lastRepairDate: string;
  totalRepairCost: number;
  maintenanceHistory: MaintenanceRecord[];
  status: 'operational' | 'under_repair' | 'decommissioned';
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  description: string;
  cost: number;
  vendorId: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  requestId: string;
  vendorId: string;
  description: string;
  amount: number;
  generatedBy: string;
  generatedAt: string;
}

export interface AuditEntry {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  department: string;
  action: string;
  comment?: string;
  timestamp: string;
  tatHours?: number;
}

export interface RequestAttachment {
  name: string;
  url: string;
  originalSize: number;
  compressedSize: number;
}

export interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  siteId: string;
  siteName: string;
  submittedBy: string;
  submittedByName: string;
  description: string;
  category?: string;
  location?: string;
  slaAvailable?: boolean;
  oneTimeVendor?: {
    name?: string;
    contactPerson?: string;
    phone?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    notes?: string;
  };
  priority: Priority;
  status: RequestStatus;
  vendorId?: string;
  vendorName?: string;
  vendorAttendedAt?: string;
  vendorType?: VendorType;
  invoiceAmount?: number;
  invoiceUrl?: string;
  faultPhotoUrl?: string;
  attachments?: RequestAttachment[];
  storageSaved?: number;
  assetId?: string;
  assetName?: string;
  purchaseOrder?: PurchaseOrder;
  taxType?: TaxType;
  grossAmount?: number;
  taxAmount?: number;
  netPayment?: number;
  paymentReceiptUrl?: string;
  rejectionComment?: string;
  isEmergencyBypass?: boolean;
  isBudgetWarning?: boolean;
  isIncident?: boolean;
  linkedIncidentId?: string;
  jobCompletionUrl?: string;
  assignedTo?: string;
  workCompletedAt?: string;
  reconStatus?: 'confirmed' | 'flagged';
  reconNote?: string;
  reconBy?: string;
  slaDeadline: string;
  slaBreached: boolean;
  procurementReceivedAt?: string;
  procurementHandledAt?: string;
  supervisorReceivedAt?: string;
  supervisorApprovedAt?: string;
  paidAt?: string;
  auditTrail: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  timestamp?: string;
  zone?: string;
  responseType?: 'passfail' | 'rating' | 'numeric';
  role?: 'fm' | 'tech' | 'both';
  value?: string | number;
  unit?: string;
  comment?: string;
  flagged?: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  siteId: string;
  type: 'generator_walkaround' | 'facility_inspection' | 'safety_inspection' | 'ppm';
  items: ChecklistItem[];
  completedBy?: string;
  completedAt?: string;
  submittedToAdmin: boolean;
  createdAt: string;
}

export interface TreasuryEntry {
  id: string;
  description: string;
  source: string;
  amount: number;
  type: 'inflow' | 'outflow';
  date: string;
  recordedBy: string;
}

export interface BudgetSummary {
  siteId: string;
  siteName: string;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  utilizationPct: number;
}

export interface TATPerfEntry {
  department: string;
  avgHours: number;
  totalRequests: number;
  onTime: number;
  breached: number;
}

export interface SLAStat {
  priority: Priority;
  slaHours: number;
  total: number;
  onTime: number;
  breached: number;
  compliancePct: number;
}

export interface PPMSchedule {
  id: string;
  siteId: string;
  assetId?: string;
  vendorId?: string;
  title: string;
  description: string;
  frequencyMonths: number;
  nextDueDate: string;
  lastCompletedDate?: string;
  status: 'scheduled' | 'due' | 'overdue' | 'completed' | 'deferred';
  assignedTo?: string;
  assignedRole?: 'FM' | 'Technician' | 'Vendor' | 'Finance';
  deferralReason?: string;
  contractStart?: string;
  contractEnd?: string;
  visitsIncluded?: number;
  approx?: boolean;
  planDates?: string[];
  serviceHistory?: string[];
  completionPhotos?: RequestAttachment[];
  jobCompletionUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  siteId: string;
  requestId?: string;
  reportedBy: string;
  title: string;
  description: string;
  category?: string;
  severity: Priority;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  attachments: RequestAttachment[];
  occurredAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationEntry {
  id: string;
  entryDate: string;
  reference: string;
  payee: string;
  siteId?: string;
  amount: number;
  state: 'confirmed' | 'pending' | 'exception';
  note: string;
  recordedBy: string;
  createdAt: string;
}

export interface PettyCashEntry {
  id: string;
  siteId: string;
  amount: number;
  type: 'top_up' | 'expense';
  description: string;
  receiptUrl?: string;
  recordedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  editCount?: number;
  editNotes?: { note: string; by: string; at: string }[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  raisedBy: string;
  page: string;
  subject: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'blocking';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUnit {
  label: string;
  rent?: number;
}

export interface Tenant {
  id: string;
  siteId: string;
  name: string;
  unit: string;
  units?: TenantUnit[];   // multi-unit tenancies — unit stays as the primary/legacy label
  email: string;
  phone: string;
  monthlyRent: number;
  serviceCharge?: number;
  serviceChargeBilling?: 'included' | 'separate';
  serviceChargeInvoiceDate?: string;
  leaseExpiry?: string;
  lastPaymentDate?: string;
  nextRentDate?: string;   // next rent due date — the invoice button highlights when reached
  emails?: string[];       // additional recipient emails (email stays primary)
  status: 'paid' | 'expiring_soon' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface ServiceChargeInvoice {
  id: string;
  tenantId: string;
  siteId: string;
  amount: number;
  periodLabel: string;
  dueDate?: string;
  status: 'issued' | 'sent' | 'paid' | 'cancelled';
  issuedBy: string;
  issuedAt: string;
  createdAt: string;
}

/* ---------- GlassHouse Finance ledger ---------- */
export type FinAccountType =
  | 'Cash' | 'Bank' | 'Accounts Receivable' | 'Other Current Asset' | 'Fixed Asset'
  | 'Accounts Payable' | 'Other Current Liability' | 'Long Term Liability'
  | 'Equity' | 'Income' | 'Other Income' | 'Cost of Goods Sold' | 'Expense' | 'Other Expense';

export interface FinAccount {
  id: string;
  code: string;
  name: string;
  type: FinAccountType;
  locked: boolean;
}

export interface FinJournalEntry {
  id: string;
  no: string;
  source: 'journal' | 'invoice' | 'receipt' | 'bill' | 'payment' | 'expense' | 'bank' | 'fx' | 'credit_note' | 'vendor_credit';
  sourceId?: string;
  date: string;
  ref?: string;
  notes?: string;
  status: 'draft' | 'published' | 'void';
  createdBy: string;
  createdAt: string;
}

export interface FinJournalLine {
  id: string;
  entryId: string;
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
  contactId?: string;
}

export interface FinContact {
  id: string;
  name: string;
  type: 'customer' | 'vendor' | 'both';
  email?: string;
  phone?: string;
  address?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankCode?: string;
}

export interface FinItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  accountId?: string;
  stock?: number;
}

export type FinDocKind = 'invoice' | 'receipt' | 'bill' | 'payment' | 'expense' | 'bank' | 'project' | 'timesheet' | 'journal' | 'fx' | 'lock' | 'quote' | 'sales_order' | 'depreciation' | 'credit_note' | 'vendor_credit';
export type FinDocStatus = 'draft' | 'issued' | 'part_paid' | 'paid' | 'void' | 'published' | 'reconciled';

export interface FinDocument {
  id: string;
  kind: FinDocKind;
  no: string;
  date: string;
  status: FinDocStatus;
  contactId?: string;
  siteId?: string;
  projectId?: string;
  total: number;
  paid: number;
  dueDate?: string;
  payload: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface FinRecurring {
  id: string;
  kind: 'invoice' | 'expense';
  name?: string;
  contactId?: string;
  lines: { accountId: string; amount: number; memo?: string }[];
  vat: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  dayOfMonth: number;
  nextRun: string;
  endDate?: string;
  paidThroughId?: string;
  memo?: string;
  active: boolean;
  createdBy: string;
}

export interface FinBudget {
  id: string;
  name: string;
  period: string;
  budgetPeriod?: 'monthly' | 'quarterly' | 'yearly';
  lines: { accountId: string; amount: number }[];
}

export interface FinActivity {
  id: string;
  actor: string;
  action: string;
  ref?: string;
  at: string;
}

export interface JobCompletion {
  id: string;
  requestId?: string;
  ppmScheduleId?: string;
  submittedBy: string;
  narrative: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  createdAt: string;
}

export interface ChecklistTemplateItem {
  id: string;
  name: string;
  type: 'rating' | 'passfail' | 'numeric';
  role: 'fm' | 'tech' | 'both';
  unit?: string;
  locked?: boolean;
}

export interface ChecklistTemplateZone {
  id: string;
  name: string;
  icon?: string;
  active: boolean;
  locked?: boolean;
  items: ChecklistTemplateItem[];
}

export interface ChecklistTemplate {
  id: string;
  siteId: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];
  zones: ChecklistTemplateZone[];
  createdAt: string;
  updatedAt: string;
}
