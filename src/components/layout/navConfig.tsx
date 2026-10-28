import {
  LayoutDashboard, ClipboardList, ShoppingCart, CheckSquare,
  Package, DollarSign, Settings, BarChart3, Building2,
  BookOpen, ShieldCheck, FileText, Store, Users,
  AlertTriangle, Calendar, Wrench, UserPlus, ClipboardEdit, ClipboardCheck, Wallet,
  TrendingUp, TrendingDown, Clock, Landmark, BookMarked, Activity, Upload,
} from 'lucide-react';
import type { UserRole } from '../../types';

export interface NavItem { label: string; path: string; icon: React.ReactNode; children?: NavItem[]; }
export interface NavSection { section?: string; items: NavItem[]; }

const FM_NAV: NavSection[] = [
  { section: 'Main', items: [
    { label: 'Dashboard', path: '/fm', icon: <LayoutDashboard size={15} /> },
    { label: 'Requests', path: '/fm/requests', icon: <ClipboardList size={15} /> },
    { label: 'New request', path: '/fm/request/new', icon: <ShoppingCart size={15} /> },
    { label: 'Vendors', path: '/fm/vendors', icon: <Store size={15} /> },
    { label: 'PPM schedule', path: '/fm/ppm', icon: <Calendar size={15} /> },
    { label: 'Monthly report', path: '/fm/report', icon: <FileText size={15} /> },
  ]},
  { section: 'Site', items: [
    { label: 'Assets', path: '/fm/assets', icon: <Package size={15} /> },
    { label: 'SLA', path: '/fm/sla', icon: <FileText size={15} /> },
    { label: 'Incidents', path: '/fm/incidents', icon: <AlertTriangle size={15} /> },
    { label: 'Checklists', path: '/fm/checklists', icon: <CheckSquare size={15} /> },
    { label: 'Technicians', path: '/fm/technicians', icon: <Wrench size={15} /> },
  ]},
  { section: 'Finance', items: [
    { label: 'Petty cash', path: '/fm/petty-cash', icon: <DollarSign size={15} /> },
    { label: 'Facility information', path: '/fm/facility', icon: <Building2 size={15} /> },
  ]},
];

const PROCUREMENT_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Dashboard', path: '/procurement', icon: <LayoutDashboard size={15} /> },
    { label: 'Request queue', path: '/procurement/queue', icon: <ClipboardList size={15} /> },
  ]},
  { section: 'Management', items: [
    { label: 'Onboarding', path: '/procurement/vendor-onboarding', icon: <UserPlus size={15} /> },
    { label: 'SLA scorecard', path: '/procurement/scorecard', icon: <BarChart3 size={15} /> },
    { label: 'Purchase orders', path: '/procurement/pos', icon: <FileText size={15} /> },
  ]},
];

const SUPERVISOR_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Dashboard', path: '/supervisor', icon: <LayoutDashboard size={15} /> },
    { label: 'Approval queue', path: '/supervisor/approvals', icon: <ShieldCheck size={15} /> },
  ]},
  { section: 'Configuration', items: [
    { label: 'Site rules', path: '/supervisor/sites', icon: <Settings size={15} /> },
    { label: 'PPM registry', path: '/supervisor/ppm', icon: <Calendar size={15} /> },
    { label: 'Facilities', path: '/supervisor/facilities', icon: <Building2 size={15} /> },
    { label: 'People', path: '/supervisor/people', icon: <Users size={15} /> },
    { label: 'Technicians', path: '/supervisor/technicians', icon: <Wrench size={15} /> },
    { label: 'Checklist builder', path: '/supervisor/checklist-builder', icon: <ClipboardEdit size={15} /> },
  ]},
];

const FINANCE_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Home', path: '/finance/ledger', icon: <LayoutDashboard size={15} /> },
    { label: 'How it connects', path: '/finance/ledger/connect', icon: <BookOpen size={15} /> },
    { label: 'Contacts', path: '/finance/ledger/contacts', icon: <Users size={15} /> },
    { label: 'Items', path: '/finance/ledger/items', icon: <Package size={15} /> },
    { label: 'Sales', path: '/finance/ledger/sales', icon: <TrendingUp size={15} />, children: [
      { label: 'Quotes', path: '/finance/ledger/sales/quotes', icon: <></> },
      { label: 'Sales orders', path: '/finance/ledger/sales/sorders', icon: <></> },
      { label: 'Invoices', path: '/finance/ledger/sales/invoices', icon: <></> },
      { label: 'Receipts', path: '/finance/ledger/sales/receipts', icon: <></> },
      { label: 'Recurring', path: '/finance/ledger/sales/recurring', icon: <></> },
    ]},
    { label: 'Purchases', path: '/finance/ledger/purchases', icon: <TrendingDown size={15} />, children: [
      { label: 'Bills', path: '/finance/ledger/purchases/bills', icon: <></> },
      { label: 'Payments', path: '/finance/ledger/purchases/payments', icon: <></> },
      { label: 'Expenses', path: '/finance/ledger/purchases/expenses', icon: <></> },
    ]},
    { label: 'Projects & time', path: '/finance/ledger/projects', icon: <Clock size={15} /> },
    { label: 'Banking', path: '/finance/ledger/banking', icon: <Landmark size={15} /> },
    { label: 'Accountant', path: '/finance/ledger/journals', icon: <BookMarked size={15} />, children: [
      { label: 'Manual journals', path: '/finance/ledger/journals', icon: <></> },
      { label: 'Chart of accounts', path: '/finance/ledger/reports', icon: <></> },
      { label: 'Transaction locking', path: '/finance/ledger/lock', icon: <></> },
    ]},
    { label: 'Reports', path: '/finance/ledger/reports', icon: <BarChart3 size={15} />, children: [
      { label: 'Trial balance', path: '/finance/ledger/reports/tb', icon: <></> },
      { label: 'Profit & loss', path: '/finance/ledger/reports/pl', icon: <></> },
      { label: 'Balance sheet', path: '/finance/ledger/reports/bs', icon: <></> },
      { label: 'Account transactions', path: '/finance/ledger/reports/acct', icon: <></> },
      { label: 'Receivables aging', path: '/finance/ledger/reports/ar', icon: <></> },
      { label: 'Payables aging', path: '/finance/ledger/reports/ap', icon: <></> },
      { label: 'Cash flow', path: '/finance/ledger/reports/cf', icon: <></> },
      { label: 'Ratios & equity', path: '/finance/ledger/reports/ratios', icon: <></> },
      { label: 'VAT & WHT summary', path: '/finance/ledger/reports/tax', icon: <></> },
      { label: 'Budget vs actual', path: '/finance/ledger/reports/budget', icon: <></> },
    ]},
    { label: 'Activity log', path: '/finance/ledger/activity', icon: <Activity size={15} /> },
    { label: 'Import / export', path: '/finance/ledger/import', icon: <Upload size={15} /> },
  ]},
  { section: 'Operations', items: [
    { label: 'Payment queue', path: '/finance/payments', icon: <DollarSign size={15} /> },
    { label: 'Petty cash', path: '/finance/petty-cash', icon: <Wallet size={15} /> },
    { label: 'Treasury ledger', path: '/finance/treasury', icon: <BookOpen size={15} /> },
    { label: 'Reconciliation', path: '/finance/recon', icon: <CheckSquare size={15} /> },
  ]},
];

const TECHNICIAN_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Dashboard', path: '/technician', icon: <LayoutDashboard size={15} /> },
    { label: 'My tasks', path: '/technician/tasks', icon: <Wrench size={15} /> },
    { label: 'Technical checks', path: '/technician/checklists', icon: <CheckSquare size={15} /> },
  ]},
  { section: 'Operations', items: [
    { label: 'Assets', path: '/technician/assets', icon: <Package size={15} /> },
    { label: 'PPM assigned', path: '/technician/ppm', icon: <Calendar size={15} /> },
    { label: 'Job completion', path: '/technician/jobs', icon: <ClipboardCheck size={15} /> },
  ]},
];

const ADMIN_NAV: NavSection[] = [
  { section: 'Global', items: [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={15} /> },
    { label: 'All requests', path: '/admin/requests', icon: <ClipboardList size={15} /> },
    { label: 'Audit view', path: '/admin/audit', icon: <BookOpen size={15} /> },
  ]},
  { section: 'Finance', items: [
    { label: 'Treasury', path: '/admin/treasury', icon: <Wallet size={15} /> },
  ]},
  { section: 'Oversight', items: [
    { label: 'Report factory', path: '/admin/reports', icon: <BarChart3 size={15} /> },
    { label: 'Vendor scorecard', path: '/admin/vendors', icon: <Store size={15} /> },
  ]},
  { section: 'Config', items: [
    { label: 'Facilities', path: '/admin/facilities', icon: <Building2 size={15} /> },
    { label: 'Site management', path: '/admin/site-management', icon: <Settings size={15} /> },
    { label: 'Site rules', path: '/admin/sites', icon: <ShieldCheck size={15} /> },
    { label: 'PPM registry', path: '/admin/ppm', icon: <Calendar size={15} /> },
    { label: 'People', path: '/admin/people', icon: <Users size={15} /> },
    { label: 'Technicians', path: '/admin/technicians', icon: <Wrench size={15} /> },
    { label: 'Checklist builder', path: '/admin/checklist-builder', icon: <ClipboardEdit size={15} /> },
    { label: 'User management', path: '/admin/users', icon: <UserPlus size={15} /> },
  ]},
];

const ICT_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Dashboard', path: '/ict', icon: <LayoutDashboard size={15} /> },
  ]},
  { section: 'Management', items: [
    { label: 'Staff access', path: '/ict/users', icon: <UserPlus size={15} /> },
    { label: 'People', path: '/ict/people', icon: <Users size={15} /> },
    { label: 'Facilities', path: '/ict/facilities', icon: <Building2 size={15} /> },
    { label: 'Site rules', path: '/ict/sites', icon: <Settings size={15} /> },
    { label: 'Checklist builder', path: '/ict/checklist-builder', icon: <ClipboardEdit size={15} /> },
  ]},
];

export const NAV_MAP: Record<UserRole, NavSection[]> = {
  facility_manager: FM_NAV,
  procurement: PROCUREMENT_NAV,
  supervisor: SUPERVISOR_NAV,
  finance: FINANCE_NAV,
  admin: ADMIN_NAV,
  ict_admin: ICT_NAV,
  technician: TECHNICIAN_NAV,
};
