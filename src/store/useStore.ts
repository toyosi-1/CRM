import { create } from 'zustand';
import type {
  User, Site, Vendor, Asset, MaintenanceRequest,
  Checklist, TreasuryEntry, RequestStatus, TaxType, Priority
} from '../types';
import {
  MOCK_USERS, MOCK_SITES, MOCK_VENDORS, MOCK_ASSETS,
  MOCK_REQUESTS, MOCK_CHECKLISTS, MOCK_TREASURY
} from '../data/mockData';
import {
  fetchUsers, fetchSites, fetchVendors, fetchAssets,
  subscribeRequests, subscribeChecklists, subscribeTreasury,
  createRequestInDB, updateRequestInDB, updateSiteInDB,
  updateChecklistInDB, addTreasuryEntryInDB,
} from '../lib/firestore';

interface AppState {
  currentUser: User | null;
  users: User[];
  sites: Site[];
  vendors: Vendor[];
  assets: Asset[];
  requests: MaintenanceRequest[];
  checklists: Checklist[];
  treasury: TreasuryEntry[];
  activeRequestId: string | null;
  firebaseReady: boolean;

  initFirebase: () => Promise<void>;
  login: (userId: string) => void;
  logout: () => void;

  setActiveRequest: (id: string | null) => void;

  createRequest: (data: Partial<MaintenanceRequest>) => void;
  updateRequestStatus: (
    requestId: string,
    status: RequestStatus,
    actorId: string,
    action: string,
    comment?: string
  ) => void;
  generatePO: (requestId: string, actorId: string) => void;
  processPayment: (requestId: string, taxType: TaxType, actorId: string) => void;
  markPaid: (requestId: string, actorId: string) => void;

  saveChecklist: (checklistId: string, items: Checklist['items']) => void;
  submitChecklist: (checklistId: string, userId: string) => void;

  updateSite: (siteId: string, data: Partial<Site>) => void;
  addTreasuryEntry: (entry: Omit<TreasuryEntry, 'id'>) => void;

  getBudgetSummaries: () => { siteId: string; siteName: string; monthlyBudget: number; spent: number; remaining: number; utilizationPct: number }[];
  getRequestsBySite: (siteId: string) => MaintenanceRequest[];
  getOpenRequestsForUser: () => MaintenanceRequest[];
}

const SLA_HOURS: Record<Priority, number> = {
  critical: 2, high: 8, medium: 24, low: 72,
};

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function computeSlaDeadline(priority: Priority, createdAt: string): string {
  const d = new Date(createdAt);
  d.setHours(d.getHours() + SLA_HOURS[priority]);
  return d.toISOString();
}

let _unsubRequests: (() => void) | null = null;
let _unsubChecklists: (() => void) | null = null;
let _unsubTreasury: (() => void) | null = null;

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  users: MOCK_USERS,
  sites: MOCK_SITES,
  vendors: MOCK_VENDORS,
  assets: MOCK_ASSETS,
  requests: MOCK_REQUESTS,
  checklists: MOCK_CHECKLISTS,
  treasury: MOCK_TREASURY,
  activeRequestId: null,
  firebaseReady: false,

  initFirebase: async () => {
    try {
      const [users, sites, vendors, assets] = await Promise.all([
        fetchUsers(),
        fetchSites(),
        fetchVendors(),
        fetchAssets(),
      ]);

      if (users.length) set({ users });
      if (sites.length) set({ sites });
      if (vendors.length) set({ vendors });
      if (assets.length) set({ assets });

      if (_unsubRequests) _unsubRequests();
      _unsubRequests = subscribeRequests(requests => {
        if (requests.length) set({ requests });
      });

      if (_unsubChecklists) _unsubChecklists();
      _unsubChecklists = subscribeChecklists(checklists => {
        if (checklists.length) set({ checklists });
      });

      if (_unsubTreasury) _unsubTreasury();
      _unsubTreasury = subscribeTreasury(treasury => {
        if (treasury.length) set({ treasury });
      });

      set({ firebaseReady: true });
    } catch (e) {
      console.warn('Firebase init failed — falling back to mock data', e);
      set({ firebaseReady: true });
    }
  },

  login: (userId) => {
    const { users } = get();
    const user = users.find(u => u.id === userId) ?? null;
    set({ currentUser: user });
  },

  logout: () => {
    if (_unsubRequests) { _unsubRequests(); _unsubRequests = null; }
    if (_unsubChecklists) { _unsubChecklists(); _unsubChecklists = null; }
    if (_unsubTreasury) { _unsubTreasury(); _unsubTreasury = null; }
    set({ currentUser: null, activeRequestId: null });
  },

  setActiveRequest: (id) => set({ activeRequestId: id }),

  createRequest: (data) => {
    const { currentUser, sites, requests } = get();
    if (!currentUser) return;
    const site = sites.find(s => s.id === currentUser.siteId);
    const now = new Date().toISOString();
    const priority = (data.priority ?? 'medium') as Priority;
    const slaDeadline = computeSlaDeadline(priority, now);
    const reqNum = `REQ-2026-${String(requests.length + 42).padStart(4, '0')}`;
    const id = genId();
    const newReq: MaintenanceRequest = {
      id,
      requestNumber: reqNum,
      siteId: currentUser.siteId ?? '',
      siteName: site?.name ?? '',
      submittedBy: currentUser.id,
      submittedByName: currentUser.name,
      description: data.description ?? '',
      priority,
      status: 'REQUEST_CREATED',
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      vendorType: data.vendorType,
      invoiceAmount: data.invoiceAmount,
      assetId: data.assetId,
      assetName: data.assetName,
      isBudgetWarning: data.isBudgetWarning ?? false,
      slaDeadline,
      slaBreached: false,
      createdAt: now,
      updatedAt: now,
      auditTrail: [{
        id: genId(),
        requestId: id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        department: currentUser.department,
        action: `Request created — ${priority.toUpperCase()} priority. SLA: ${SLA_HOURS[priority]}h`,
        timestamp: now,
        tatHours: 0,
      }],
    };
    createRequestInDB(newReq).catch(console.error);
    set({ requests: [newReq, ...requests] });
  },

  updateRequestStatus: (requestId, status, actorId, action, comment) => {
    const { users, requests } = get();
    const actor = users.find(u => u.id === actorId);
    if (!actor) return;
    const now = new Date().toISOString();
    set({
      requests: requests.map(r => {
        if (r.id !== requestId) return r;
        const lastEntry = r.auditTrail[r.auditTrail.length - 1];
        const tatHours = lastEntry
          ? Math.round((new Date(now).getTime() - new Date(lastEntry.timestamp).getTime()) / 3600000)
          : 0;
        const entry = {
          id: genId(), requestId,
          userId: actor.id, userName: actor.name,
          userRole: actor.role, department: actor.department,
          action, comment, timestamp: now, tatHours,
        };
        const updated = { ...r, status, rejectionComment: comment, updatedAt: now, auditTrail: [...r.auditTrail, entry] };
        updateRequestInDB(requestId, updated).catch(console.error);
        return updated;
      }),
    });
  },

  generatePO: (requestId, actorId) => {
    const { users, requests, vendors } = get();
    const actor = users.find(u => u.id === actorId);
    const req = requests.find(r => r.id === requestId);
    if (!actor || !req) return;
    const vendor = vendors.find(v => v.id === req.vendorId);
    const now = new Date().toISOString();
    const poNum = `PO-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const po = {
      id: genId(), poNumber: poNum, requestId,
      vendorId: req.vendorId ?? '',
      description: req.description,
      amount: req.invoiceAmount ?? 0,
      generatedBy: actor.name,
      generatedAt: now,
    };
    const tatHours = Math.round((new Date(now).getTime() - new Date(req.updatedAt).getTime()) / 3600000);
    const entry = {
      id: genId(), requestId, userId: actor.id, userName: actor.name,
      userRole: actor.role, department: actor.department,
      action: `Purchase Order ${poNum} generated for ${vendor?.name ?? 'vendor'}. Amount: ₦${req.invoiceAmount?.toLocaleString()}`,
      timestamp: now, tatHours,
    };
    set({
      requests: requests.map(r => {
        if (r.id !== requestId) return r;
        const updated = { ...r, status: 'PO_GENERATED' as const, purchaseOrder: po, updatedAt: now, auditTrail: [...r.auditTrail, entry] };
        updateRequestInDB(requestId, updated).catch(console.error);
        return updated;
      }),
    });
  },

  processPayment: (requestId, taxType, actorId) => {
    const { users, requests } = get();
    const actor = users.find(u => u.id === actorId);
    const req = requests.find(r => r.id === requestId);
    if (!actor || !req) return;
    const gross = req.invoiceAmount ?? 0;
    const rate = taxType === '5pct_wht' ? 0.05 : taxType === '10pct_wht' ? 0.10 : 0;
    const tax = Math.round(gross * rate);
    const net = gross - tax;
    const now = new Date().toISOString();
    const tatHours = Math.round((new Date(now).getTime() - new Date(req.updatedAt).getTime()) / 3600000);
    const entry = {
      id: genId(), requestId, userId: actor.id, userName: actor.name,
      userRole: actor.role, department: actor.department,
      action: `Tax calculated: ${taxType === 'exempt' ? 'Exempt' : taxType === '5pct_wht' ? '5% WHT' : '10% WHT'} — Gross: ₦${gross.toLocaleString()}, Tax: ₦${tax.toLocaleString()}, Net: ₦${net.toLocaleString()}`,
      timestamp: now, tatHours,
    };
    set({
      requests: requests.map(r => {
        if (r.id !== requestId) return r;
        const updated = { ...r, taxType, grossAmount: gross, taxAmount: tax, netPayment: net, updatedAt: now, auditTrail: [...r.auditTrail, entry] };
        updateRequestInDB(requestId, updated).catch(console.error);
        return updated;
      }),
    });
  },

  markPaid: (requestId, actorId) => {
    const { users, requests, sites } = get();
    const actor = users.find(u => u.id === actorId);
    const req = requests.find(r => r.id === requestId);
    if (!actor || !req) return;
    const now = new Date().toISOString();
    const tatHours = Math.round((new Date(now).getTime() - new Date(req.updatedAt).getTime()) / 3600000);
    const entry = {
      id: genId(), requestId, userId: actor.id, userName: actor.name,
      userRole: actor.role, department: actor.department,
      action: `Payment completed. Net amount ₦${(req.netPayment ?? req.invoiceAmount ?? 0).toLocaleString()} disbursed. Receipt uploaded.`,
      timestamp: now, tatHours,
    };
    const updatedSites = sites.map(s =>
      s.id === req.siteId
        ? { ...s, currentMonthSpend: s.currentMonthSpend + (req.netPayment ?? req.invoiceAmount ?? 0) }
        : s
    );
    set({
      requests: requests.map(r => {
        if (r.id !== requestId) return r;
        const updated = { ...r, status: 'PAID' as const, paymentReceiptUrl: 'receipt.pdf', updatedAt: now, auditTrail: [...r.auditTrail, entry] };
        updateRequestInDB(requestId, updated).catch(console.error);
        return updated;
      }),
      sites: updatedSites,
    });
    updateSiteInDB(req.siteId, { currentMonthSpend: updatedSites.find(s => s.id === req.siteId)?.currentMonthSpend }).catch(console.error);
  },

  saveChecklist: (checklistId, items) => {
    set(state => ({
      checklists: state.checklists.map(c =>
        c.id === checklistId ? { ...c, items } : c
      ),
    }));
    updateChecklistInDB(checklistId, { items }).catch(console.error);
  },

  submitChecklist: (checklistId, userId) => {
    const { users } = get();
    const user = users.find(u => u.id === userId);
    const data = { submittedToAdmin: true, completedBy: userId, completedAt: new Date().toISOString(), completedByName: user?.name };
    set(state => ({
      checklists: state.checklists.map(c =>
        c.id === checklistId ? { ...c, ...data } : c
      ),
    }));
    updateChecklistInDB(checklistId, data).catch(console.error);
  },

  updateSite: (siteId, data) => {
    set(state => ({
      sites: state.sites.map(s => s.id === siteId ? { ...s, ...data } : s),
    }));
    updateSiteInDB(siteId, data).catch(console.error);
  },

  addTreasuryEntry: (entry) => {
    const newEntry = { ...entry, id: genId() };
    set(state => ({
      treasury: [newEntry, ...state.treasury],
    }));
    addTreasuryEntryInDB(newEntry).catch(console.error);
  },

  getBudgetSummaries: () => {
    const { sites } = get();
    return sites.map(s => ({
      siteId: s.id,
      siteName: s.name,
      monthlyBudget: s.monthlyBudget,
      spent: s.currentMonthSpend,
      remaining: s.monthlyBudget - s.currentMonthSpend,
      utilizationPct: Math.round((s.currentMonthSpend / s.monthlyBudget) * 100),
    }));
  },

  getRequestsBySite: (siteId) => get().requests.filter(r => r.siteId === siteId),

  getOpenRequestsForUser: () => {
    const { currentUser, requests } = get();
    if (!currentUser) return [];
    if (currentUser.role === 'facility_manager') return requests.filter(r => r.siteId === currentUser.siteId);
    if (currentUser.role === 'procurement') return requests.filter(r => r.status === 'REQUEST_CREATED' || r.status === 'PROCUREMENT_REVIEW');
    if (currentUser.role === 'supervisor') return requests.filter(r => r.status === 'PO_GENERATED' || r.status === 'SUPERVISOR_APPROVAL');
    if (currentUser.role === 'finance') return requests.filter(r => r.status === 'PAYMENT_PENDING' || r.status === 'ADMIN_APPROVED');
    return requests;
  },
}));
