import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import type { RequestStatus, Priority, UserRole } from '../types';

export const formatCurrency = (amount: number): string =>
  `₦${amount.toLocaleString('en-NG')}`;

export const formatDate = (iso: string): string =>
  format(new Date(iso), 'dd MMM yyyy');

export const formatDateTime = (iso: string): string =>
  format(new Date(iso), 'dd MMM yyyy, HH:mm');

export const timeAgo = (iso: string): string =>
  formatDistanceToNow(new Date(iso), { addSuffix: true });

export const hoursUntil = (iso: string): number =>
  differenceInHours(new Date(iso), new Date());

export const STATUS_LABELS: Record<RequestStatus, string> = {
  REQUEST_CREATED: 'New Request',
  PROCUREMENT_REVIEW: 'Procurement Review',
  PO_GENERATED: 'PO Generated',
  SUPERVISOR_APPROVAL: 'Awaiting Approval',
  PAYMENT_PENDING: 'Payment Pending',
  PAID: 'Paid',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
  ADMIN_APPROVED: 'Admin Approved',
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  REQUEST_CREATED: 'bg-slate-100 text-slate-700',
  PROCUREMENT_REVIEW: 'bg-blue-100 text-blue-700',
  PO_GENERATED: 'bg-indigo-100 text-indigo-700',
  SUPERVISOR_APPROVAL: 'bg-amber-100 text-amber-700',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  REJECTED: 'bg-red-100 text-red-700',
  ADMIN_APPROVED: 'bg-purple-100 text-purple-700',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-400 text-amber-900',
  low: 'bg-slate-200 text-slate-600',
};

export const PRIORITY_DOT: Record<Priority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
};

export const SLA_HOURS: Record<Priority, number> = {
  critical: 2, high: 8, medium: 24, low: 72,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  facility_manager: 'Facility Manager',
  procurement: 'Procurement',
  supervisor: 'Supervisor',
  finance: 'Finance',
  admin: 'Admin',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  facility_manager: 'bg-teal-100 text-teal-700',
  procurement: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-purple-100 text-purple-700',
  finance: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-slate-800 text-white',
};

export const TAX_LABELS = {
  '5pct_wht': '5% WHT',
  '10pct_wht': '10% WHT',
  exempt: 'Tax Exempt',
};

export const getSlaStatus = (deadline: string, status: RequestStatus): {
  label: string; color: string; urgent: boolean
} => {
  const hours = hoursUntil(deadline);
  const done = ['PAID', 'CLOSED', 'REJECTED'].includes(status);
  if (done) return { label: 'Completed', color: 'text-slate-400', urgent: false };
  if (hours < 0) return { label: `Breached ${Math.abs(hours)}h ago`, color: 'text-red-600', urgent: true };
  if (hours < 4) return { label: `${hours}h remaining`, color: 'text-orange-600', urgent: true };
  return { label: `${hours}h remaining`, color: 'text-emerald-600', urgent: false };
};

export const budgetWarningLevel = (utilizationPct: number): 'safe' | 'warning' | 'danger' => {
  if (utilizationPct >= 90) return 'danger';
  if (utilizationPct >= 75) return 'warning';
  return 'safe';
};
