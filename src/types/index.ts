export type UserRole = 'facility_manager' | 'procurement' | 'supervisor' | 'finance' | 'admin';

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
  avatar?: string;
  department: string;
}

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
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  type: VendorType;
  bankName: string;
  accountNumber: string;
  accountName: string;
  totalJobsCompleted: number;
  totalAmountPaid: number;
  avgCompletionDays: number;
  lastJobDate: string;
  riskScore: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  siteId: string;
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

export interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  siteId: string;
  siteName: string;
  submittedBy: string;
  submittedByName: string;
  description: string;
  priority: Priority;
  status: RequestStatus;
  vendorId?: string;
  vendorName?: string;
  vendorType?: VendorType;
  invoiceAmount?: number;
  invoiceUrl?: string;
  faultPhotoUrl?: string;
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
  slaDeadline: string;
  slaBreached: boolean;
  auditTrail: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  timestamp?: string;
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
