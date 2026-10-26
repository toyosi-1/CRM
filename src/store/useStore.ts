import { create } from 'zustand';
import type {
  User, Site, Vendor, Asset, MaintenanceRequest,
  Checklist, TreasuryEntry, RequestStatus, TaxType, Priority,
  PPMSchedule, Incident, PettyCashEntry, SupportTicket, Tenant, JobCompletion, ChecklistTemplate, ReconciliationEntry, FacilityVendorSLA, ServiceChargeInvoice, FinAccount, FinJournalEntry, FinJournalLine, FinContact, FinItem, FinDocument, FinBudget, FinActivity
} from '../types';
import {
  MOCK_USERS, MOCK_SITES, MOCK_VENDORS, MOCK_ASSETS,
  MOCK_REQUESTS, MOCK_CHECKLISTS, MOCK_TREASURY
} from '../data/mockData';
import {
  fetchUsers, fetchSites, fetchVendors, fetchAssets, createAsset as createAssetRow, updateAsset as updateAssetRow,
  subscribeRequests, subscribeChecklists, subscribeTreasury,
  subscribePPMSchedules, subscribeIncidents, subscribePettyCash, subscribeSupportTickets,
  subscribeTenants, subscribeJobCompletions, subscribeChecklistTemplates, subscribeReconciliation, subscribeFacilityVendorSLAs,
  createReconciliationEntry, updateReconciliationEntry,
  createRequestInDB, updateRequestInDB, deleteRequestInDB, updateSiteInDB, upsertSiteInDB,
  updateChecklistInDB, addTreasuryEntryInDB, uploadFile,
  createPPMSchedule, updatePPMSchedule, createIncident, updateIncident,
  createPettyCashEntry, updatePettyCashEntry, createSupportTicket, updateSupportTicket,
  createTenant, updateTenant, createJobCompletion, createChecklistTemplate, updateChecklistTemplate, subscribeServiceChargeInvoices, createServiceChargeInvoice as createServiceChargeInvoiceDb,
  upsertVendor, createFacilityVendorSLA, updateFacilityVendorSLA, deleteFacilityVendorSLA,
  assignTechnician as assignTechnicianDb, acknowledgeHandover, markWorkCompleted,
  subscribeFinAccounts, subscribeFinJournal, subscribeFinContacts, subscribeFinItems,
  subscribeFinDocuments, subscribeFinBudgets, subscribeFinActivity, postJournal, logFinActivity,
} from '../lib/db';
import { supabase } from '../lib/supabase';
import { isChecklistMissed } from '../lib/checklists';
import { titleCase, sentenceCase, normalizeFloor } from '../utils/helpers';

type RequestDraft = Partial<MaintenanceRequest> & {
  attachmentFiles?: Array<{ file: File; originalSize: number; compressedSize: number }>;
};

interface AppState {
  currentUser: User | null;
  users: User[];
  sites: Site[];
  vendors: Vendor[];
  assets: Asset[];
  requests: MaintenanceRequest[];
  checklists: Checklist[];
  treasury: TreasuryEntry[];
  ppmSchedules: PPMSchedule[];
  incidents: Incident[];
  pettyCash: PettyCashEntry[];
  supportTickets: SupportTicket[];
  tenants: Tenant[];
  serviceChargeInvoices: ServiceChargeInvoice[];
  finAccounts: FinAccount[];
  finJournalEntries: FinJournalEntry[];
  finJournalLines: FinJournalLine[];
  finContacts: FinContact[];
  finItems: FinItem[];
  finDocuments: FinDocument[];
  finBudgets: FinBudget[];
  finActivity: FinActivity[];
  jobCompletions: JobCompletion[];
  checklistTemplates: ChecklistTemplate[];
  reconciliationEntries: ReconciliationEntry[];
  facilityVendorSLAs: FacilityVendorSLA[];
  activeRequestId: string | null;
  activeSiteId: string | null;
  supabaseReady: boolean;
  saveError: string | null;

  initSupabase: (profileId?: string) => Promise<void>;
  login: (userId: string) => void;
  logout: () => void;

  setActiveRequest: (id: string | null) => void;
  setActiveSiteId: (siteId: string) => void;
  clearSaveError: () => void;

  getPPMForUser: () => PPMSchedule[];
  getOpenIncidentsForUser: () => Incident[];
  getPettyCashForSite: (siteId: string) => PettyCashEntry[];

  createRequest: (data: RequestDraft) => Promise<void>;
  deleteRequest: (requestId: string) => Promise<void>;
  updateRequest: (requestId: string, data: Partial<MaintenanceRequest>) => Promise<void>;
  updateRequestStatus: (
    requestId: string,
    status: RequestStatus,
    actorId: string,
    action: string,
    comment?: string
  ) => void;
  generatePO: (requestId: string, actorId: string) => Promise<void>;
  processPayment: (requestId: string, taxType: TaxType, actorId: string) => void;
  markPaid: (requestId: string, actorId: string, receiptUrl?: string) => void;

  saveChecklist: (checklistId: string, items: Checklist['items']) => void;
  submitChecklist: (checklistId: string, userId: string) => void;
  assignTechnician: (requestId: string, technicianId: string | null) => Promise<void>;
  acknowledgeActingHandover: () => Promise<void>;
  markWorkComplete: (requestId: string) => Promise<void>;

  updateSite: (siteId: string, data: Partial<Site>) => void;
  saveSite: (site: Site) => Promise<void>;

  createPPMSchedule: (data: Partial<PPMSchedule>) => Promise<void>;
  updatePPMSchedule: (id: string, data: Partial<PPMSchedule>) => Promise<void>;

  createAsset: (data: Partial<Asset>) => Promise<void>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;

  createIncident: (data: Partial<Incident>) => Promise<void>;
  updateIncident: (id: string, data: Partial<Incident>) => Promise<void>;

  createPettyCashEntry: (data: Partial<PettyCashEntry>) => Promise<void>;
  updatePettyCashEntry: (id: string, data: Partial<PettyCashEntry>) => Promise<void>;

  createSupportTicket: (data: Partial<SupportTicket>) => Promise<void>;
  updateSupportTicket: (id: string, data: Partial<SupportTicket>) => Promise<void>;

  upsertVendor: (vendor: Partial<Vendor>) => Promise<void>;

  createFacilityVendorSLA: (data: Partial<FacilityVendorSLA>) => Promise<void>;
  updateFacilityVendorSLA: (id: string, data: Partial<FacilityVendorSLA>) => Promise<void>;
  deleteFacilityVendorSLA: (id: string) => Promise<void>;

  createTenant: (data: Partial<Tenant>) => Promise<void>;
  issueServiceCharge: (inv: { tenantId: string; siteId: string; amount: number; periodLabel: string; dueDate?: string }) => Promise<void>;
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<void>;

  createJobCompletion: (data: Partial<JobCompletion>) => Promise<void>;

  createChecklistTemplate: (data: Partial<ChecklistTemplate>) => Promise<void>;
  updateChecklistTemplate: (id: string, data: Partial<ChecklistTemplate>) => Promise<void>;

  createReconEntry: (data: Partial<ReconciliationEntry>) => Promise<void>;
  updateReconEntry: (id: string, data: Partial<ReconciliationEntry>) => Promise<void>;
  setRequestRecon: (requestId: string, status: 'confirmed' | 'flagged', note: string, by: string) => Promise<void>;

  addTreasuryEntry: (entry: Omit<TreasuryEntry, 'id'>) => void;

  getSiteMonthSpend: (siteId: string) => number;
  getBudgetSummaries: () => { siteId: string; siteName: string; monthlyBudget: number; spent: number; remaining: number; utilizationPct: number }[];
  getRequestsBySite: (siteId: string) => MaintenanceRequest[];
  getOpenRequestsForUser: () => MaintenanceRequest[];
}

const SLA_HOURS: Record<Priority, number> = {
  critical: 2, high: 8, medium: 24, low: 72,
};

const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

/** Surfaces a user-visible error when a database write fails after an optimistic UI update. */
export function reportSaveError(error: unknown) {
  console.error('[persist] save failed:', error);
  useStore.setState({ saveError: 'A change could not be saved — check your connection and try again. If it persists, reload the page.' });
}

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
let _unsubPPM: (() => void) | null = null;
let _unsubIncidents: (() => void) | null = null;
let _unsubPettyCash: (() => void) | null = null;
let _unsubTickets: (() => void) | null = null;
let _unsubTenants: (() => void) | null = null;
let _unsubJobCompletions: (() => void) | null = null;
let _unsubChecklistTemplates: (() => void) | null = null;
let _unsubRecon: (() => void) | null = null;
let _unsubFacilityVendorSLAs: (() => void) | null = null;

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  activeSiteId: null,
  users: DEMO_MODE ? MOCK_USERS : [],
  sites: DEMO_MODE ? MOCK_SITES : [],
  vendors: DEMO_MODE ? MOCK_VENDORS : [],
  assets: DEMO_MODE ? MOCK_ASSETS : [],
  requests: DEMO_MODE ? MOCK_REQUESTS : [],
  checklists: DEMO_MODE ? MOCK_CHECKLISTS : [],
  treasury: DEMO_MODE ? MOCK_TREASURY : [],
  ppmSchedules: [],
  incidents: [],
  pettyCash: [],
  supportTickets: [],
  tenants: [],
  serviceChargeInvoices: [],
  finAccounts: [],
  finJournalEntries: [],
  finJournalLines: [],
  finContacts: [],
  finItems: [],
  finDocuments: [],
  finBudgets: [],
  finActivity: [],
  jobCompletions: [],
  checklistTemplates: [],
  reconciliationEntries: [],
  facilityVendorSLAs: [],
  activeRequestId: null,
  supabaseReady: false,
  saveError: null,

  clearSaveError: () => set({ saveError: null }),

  initSupabase: async (profileId?: string) => {
    try {
      const [users, sites, vendors, assets] = await Promise.all([
        fetchUsers(),
        fetchSites(),
        fetchVendors(),
        fetchAssets(),
      ]);

      set({ users, sites, vendors, assets });
      if (profileId) get().login(profileId);

      if (_unsubRequests) _unsubRequests();
      _unsubRequests = subscribeRequests(requests => set({ requests }));

      if (_unsubChecklists) _unsubChecklists();
      _unsubChecklists = subscribeChecklists(checklists => set({ checklists }));

      if (_unsubTreasury) _unsubTreasury();
      _unsubTreasury = subscribeTreasury(treasury => set({ treasury }));

      if (_unsubPPM) _unsubPPM();
      _unsubPPM = subscribePPMSchedules(ppmSchedules => set({ ppmSchedules }));

      if (_unsubIncidents) _unsubIncidents();
      _unsubIncidents = subscribeIncidents(incidents => set({ incidents }));

      if (_unsubPettyCash) _unsubPettyCash();
      _unsubPettyCash = subscribePettyCash(pettyCash => set({ pettyCash }));

      if (_unsubTickets) _unsubTickets();
      _unsubTickets = subscribeSupportTickets(supportTickets => set({ supportTickets }));

      if (_unsubTenants) _unsubTenants();
      _unsubTenants = subscribeTenants(tenants => set({ tenants }));
      subscribeServiceChargeInvoices(serviceChargeInvoices => set({ serviceChargeInvoices }));
      subscribeFinAccounts(finAccounts => set({ finAccounts }));
      subscribeFinJournal(j => set({ finJournalEntries: j.entries, finJournalLines: j.lines }));
      subscribeFinContacts(finContacts => set({ finContacts }));
      subscribeFinItems(finItems => set({ finItems }));
      subscribeFinDocuments(finDocuments => set({ finDocuments }));
      subscribeFinBudgets(finBudgets => set({ finBudgets }));
      subscribeFinActivity(finActivity => set({ finActivity }));

      if (_unsubJobCompletions) _unsubJobCompletions();
      _unsubJobCompletions = subscribeJobCompletions(jobCompletions => set({ jobCompletions }));

      if (_unsubChecklistTemplates) _unsubChecklistTemplates();
      _unsubChecklistTemplates = subscribeChecklistTemplates(checklistTemplates => set({ checklistTemplates }));

      if (_unsubRecon) _unsubRecon();
      _unsubRecon = subscribeReconciliation(reconciliationEntries => set({ reconciliationEntries }));

      if (_unsubFacilityVendorSLAs) _unsubFacilityVendorSLAs();
      _unsubFacilityVendorSLAs = subscribeFacilityVendorSLAs(facilityVendorSLAs => set({ facilityVendorSLAs }));

      set({ supabaseReady: true });
    } catch (e) {
      console.error('Supabase initialization failed', e);
      set({ supabaseReady: false });
    }
  },

  login: (userId) => {
    const { users } = get();
    const user = users.find(u => u.id === userId) ?? null;
    set({ currentUser: user, activeSiteId: user?.siteId ?? null });
  },

  logout: () => {
    if (_unsubRequests) { _unsubRequests(); _unsubRequests = null; }
    if (_unsubChecklists) { _unsubChecklists(); _unsubChecklists = null; }
    if (_unsubTreasury) { _unsubTreasury(); _unsubTreasury = null; }
    if (_unsubPPM) { _unsubPPM(); _unsubPPM = null; }
    if (_unsubIncidents) { _unsubIncidents(); _unsubIncidents = null; }
    if (_unsubPettyCash) { _unsubPettyCash(); _unsubPettyCash = null; }
    if (_unsubTickets) { _unsubTickets(); _unsubTickets = null; }
    if (_unsubTenants) { _unsubTenants(); _unsubTenants = null; }
    if (_unsubJobCompletions) { _unsubJobCompletions(); _unsubJobCompletions = null; }
    if (_unsubChecklistTemplates) { _unsubChecklistTemplates(); _unsubChecklistTemplates = null; }
    if (_unsubFacilityVendorSLAs) { _unsubFacilityVendorSLAs(); _unsubFacilityVendorSLAs = null; }
    set({ currentUser: null, activeRequestId: null, activeSiteId: null });
  },

  setActiveRequest: (id) => set({ activeRequestId: id }),
  setActiveSiteId: (siteId) => set({ activeSiteId: siteId }),

  createRequest: async (data) => {
    const { currentUser, sites, requests } = get();
    if (!currentUser) return;
    const attachmentFiles = data.attachmentFiles ?? [];
    const attachments = await Promise.all(attachmentFiles.map(async (attachment, index) => ({
      name: attachment.file.name,
      url: await uploadFile(`requests/${currentUser.id}/${Date.now()}-${index}-${attachment.file.name}`, attachment.file),
      originalSize: attachment.originalSize,
      compressedSize: attachment.compressedSize,
    })));
    const requestSiteId = get().activeSiteId ?? currentUser.siteId;
    const site = sites.find(s => s.id === requestSiteId);
    const now = new Date().toISOString();
    const priority = (data.priority ?? 'medium') as Priority;
    const slaDeadline = computeSlaDeadline(priority, now);
    const { data: reqNumData, error: reqNumError } = await supabase.rpc('generate_request_number', {
      p_site_id: requestSiteId,
      p_created_at: now,
    });
    if (reqNumError) throw reqNumError;
    const reqNum = String(reqNumData ?? '');
    const id = genId();
    const newReq: MaintenanceRequest = {
      id,
      requestNumber: reqNum,
      siteId: requestSiteId ?? '',
      siteName: site?.name ?? '',
      submittedBy: currentUser.id,
      submittedByName: currentUser.name,
      description: sentenceCase(data.description ?? ''),
      category: data.category ? titleCase(data.category) : undefined,
      location: data.location ? data.location.split('—').map(part => titleCase(part)).join('—') : undefined,
      slaAvailable: data.slaAvailable ?? false,
      oneTimeVendor: data.oneTimeVendor ? {
        ...data.oneTimeVendor,
        name: data.oneTimeVendor.name ? titleCase(data.oneTimeVendor.name) : data.oneTimeVendor.name,
        contactPerson: data.oneTimeVendor.contactPerson ? titleCase(data.oneTimeVendor.contactPerson) : data.oneTimeVendor.contactPerson,
        bankName: data.oneTimeVendor.bankName ? titleCase(data.oneTimeVendor.bankName) : data.oneTimeVendor.bankName,
        accountName: data.oneTimeVendor.accountName ? titleCase(data.oneTimeVendor.accountName) : data.oneTimeVendor.accountName,
      } : undefined,
      priority,
      status: 'REQUEST_CREATED',
      vendorId: data.vendorId,
      vendorName: data.vendorName ? titleCase(data.vendorName) : undefined,
      vendorType: data.vendorType,
      invoiceAmount: data.invoiceAmount,
      assetId: data.assetId,
      assetName: data.assetName,
      attachments,
      storageSaved: data.storageSaved,
      faultPhotoUrl: attachments.find(attachment => !attachment.name.startsWith('QUOTE-'))?.url,
      invoiceUrl: attachments.find(attachment => attachment.name.startsWith('QUOTE-'))?.url,
      isBudgetWarning: data.isBudgetWarning ?? false,
      isIncident: data.isIncident ?? false,
      linkedIncidentId: data.linkedIncidentId,
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
    await createRequestInDB(newReq);
    set({ requests: [newReq, ...requests] });
    if (data.isIncident) {
      if (data.linkedIncidentId) {
        await updateIncident(data.linkedIncidentId, { requestId: id, status: 'investigating' }).catch(reportSaveError);
      } else {
        await createIncident({
          id: genId(), siteId: requestSiteId ?? '', requestId: id, reportedBy: currentUser.id,
          title: data.description?.split('\n')[0]?.slice(0, 120) || 'Significant incident',
          description: `Auto-created incident report linked to request ${reqNum}.\n\n${data.description ?? ''}`,
          severity: priority, status: 'open', attachments, occurredAt: now, createdAt: now, updatedAt: now,
        }).catch(reportSaveError);
      }
    }
  },

  deleteRequest: async (requestId) => {
    await deleteRequestInDB(requestId);
    set(state => ({ requests: state.requests.filter(r => r.id !== requestId) }));
  },

  updateRequest: async (requestId, data) => {
    await updateRequestInDB(requestId, { ...data, updatedAt: new Date().toISOString() });
    set(state => ({ requests: state.requests.map(r => r.id === requestId ? { ...r, ...data, updatedAt: new Date().toISOString() } : r) }));
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
        const updated = {
          ...r,
          status,
          ...(status === 'PROCUREMENT_REVIEW' && { procurementReceivedAt: now }),
          ...(status === 'SUPERVISOR_APPROVAL' && { supervisorReceivedAt: now }),
          ...(status === 'PAYMENT_PENDING' && { supervisorApprovedAt: now }),
          ...(status === 'PAID' && { paidAt: now }),
          ...(status === 'ADMIN_APPROVED' && { supervisorApprovedAt: now }),
          rejectionComment: comment,
          isEmergencyBypass: r.isEmergencyBypass || action.includes('EMERGENCY BYPASS'),
          updatedAt: now,
          auditTrail: [...r.auditTrail, entry],
        };
        updateRequestInDB(requestId, updated).catch(reportSaveError);
        return updated;
      }),
    });
  },

  generatePO: async (requestId, actorId) => {
    const { users, requests, vendors } = get();
    const actor = users.find(u => u.id === actorId);
    const req = requests.find(r => r.id === requestId);
    if (!actor || !req) return;
    const vendor = vendors.find(v => v.id === req.vendorId);
    const now = new Date().toISOString();
    const { data: poNumData, error: poNumError } = await supabase.rpc('generate_po_number', {
      p_site_id: req.siteId,
      p_created_at: now,
    });
    if (poNumError) { reportSaveError(poNumError); return; }
    const poNum = String(poNumData);
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
        const updated = { ...r, status: 'PO_GENERATED' as const, purchaseOrder: po, procurementHandledAt: now, supervisorReceivedAt: now, updatedAt: now, auditTrail: [...r.auditTrail, entry] };
        updateRequestInDB(requestId, updated).catch(reportSaveError);
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
        updateRequestInDB(requestId, updated).catch(reportSaveError);
        return updated;
      }),
    });
  },

  markPaid: (requestId, actorId, receiptUrl) => {
    const { users, requests, sites } = get();
    const actor = users.find(u => u.id === actorId);
    const req = requests.find(r => r.id === requestId);
    if (!actor || !req) return;
    const now = new Date().toISOString();
    const tatHours = Math.round((new Date(now).getTime() - new Date(req.updatedAt).getTime()) / 3600000);
    const entry = {
      id: genId(), requestId, userId: actor.id, userName: actor.name,
      userRole: actor.role, department: actor.department,
      action: `Payment completed. Net amount ₦${(req.netPayment ?? req.invoiceAmount ?? 0).toLocaleString()} disbursed.${receiptUrl ? ' Receipt uploaded.' : ' No receipt uploaded.'}`,
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
        const updated = { ...r, status: 'PAID' as const, paymentReceiptUrl: receiptUrl, paidAt: now, updatedAt: now, auditTrail: [...r.auditTrail, entry] };
        updateRequestInDB(requestId, updated).catch(reportSaveError);
        return updated;
      }),
      sites: updatedSites,
    });
    updateSiteInDB(req.siteId, { currentMonthSpend: updatedSites.find(s => s.id === req.siteId)?.currentMonthSpend }).catch(reportSaveError);

    // Auto-post to the ledger: DR expense (request category) / CR operating bank.
    const amount = req.netPayment ?? req.invoiceAmount ?? 0;
    if (amount > 0) {
      const cat = (req.category ?? '').toLowerCase();
      const expenseAcct = cat.includes('diesel') || cat.includes('generator') || cat.includes('power') ? 'acc_6020'
        : cat.includes('office') || cat.includes('supplies') ? 'acc_6040'
        : cat.includes('travel') || cat.includes('transport') ? 'acc_6050'
        : 'acc_6030';
      void postJournal(
        { no: req.requestNumber, source: 'payment', date: now.slice(0, 10), ref: `Request ${req.requestNumber}`, notes: req.description?.slice(0, 200), createdBy: actor.name },
        [{ accountId: expenseAcct, dr: amount, memo: req.category || 'Maintenance' }, { accountId: 'acc_1100', cr: amount, memo: 'Payment disbursed' }],
      ).then(() => logFinActivity(actor.name, `Auto-posted ${req.requestNumber} ${amount.toLocaleString('en-NG')}`, req.requestNumber)).catch(reportSaveError);
    }
  },

  saveChecklist: (checklistId, items) => {
    const { currentUser, users, checklistTemplates } = get();
    const cl = get().checklists.find(c => c.id === checklistId);
    if (cl && isChecklistMissed(cl, checklistTemplates)) {
      reportSaveError(new Error('This checklist missed its scheduled day and can no longer be edited.'));
      return;
    }
    // Role enforcement on tech items: when a site has an active technician,
    // only technicians may record `tech`-scoped items (FMs can still answer
    // 'both'/unassigned items, and everything when no technician exists).
    if (cl && currentUser) {
      const siteHasTech = users.some(u => u.role === 'technician' && u.active !== false
        && (u.siteIds?.includes(cl.siteId) || u.siteId === cl.siteId));
      items = items.map(next => {
        const prev = cl.items.find(i => i.id === next.id);
        if (!prev) return next;
        const changed = prev.checked !== next.checked || prev.value !== next.value
          || prev.flagged !== next.flagged || prev.comment !== next.comment || prev.timestamp !== next.timestamp;
        if (!changed) return next;
        if (currentUser.role === 'technician') return (prev.role === 'tech' || prev.role === 'both') ? next : prev;
        if (currentUser.role === 'facility_manager') return (prev.role === 'tech' && siteHasTech) ? prev : next;
        return prev;
      });
    }
    set(state => ({
      checklists: state.checklists.map(c =>
        c.id === checklistId ? { ...c, items } : c
      ),
    }));
    updateChecklistInDB(checklistId, { items }).catch(reportSaveError);
  },

  submitChecklist: (checklistId, userId) => {
    const { users } = get();
    const cl = get().checklists.find(c => c.id === checklistId);
    if (cl && isChecklistMissed(cl, get().checklistTemplates)) {
      reportSaveError(new Error('This checklist missed its scheduled day and can no longer be submitted.'));
      return;
    }
    if (users.find(u => u.id === userId)?.role === 'technician') {
      reportSaveError(new Error('Technicians record check items — only the FM submits the walk.'));
      return;
    }
    const user = users.find(u => u.id === userId);
    const data = { submittedToAdmin: true, completedBy: userId, completedAt: new Date().toISOString(), completedByName: user?.name };
    set(state => ({
      checklists: state.checklists.map(c =>
        c.id === checklistId ? { ...c, ...data } : c
      ),
    }));
    updateChecklistInDB(checklistId, data).catch(reportSaveError);
  },

  assignTechnician: async (requestId, technicianId) => {
    await assignTechnicianDb(requestId, technicianId);
    set(state => ({
      requests: state.requests.map(r => r.id === requestId ? { ...r, assignedTo: technicianId ?? undefined, updatedAt: new Date().toISOString() } : r),
    }));
  },

  markWorkComplete: async (requestId) => {
    await markWorkCompleted(requestId);
    set(state => ({
      requests: state.requests.map(r => r.id === requestId ? { ...r, workCompletedAt: r.workCompletedAt ?? new Date().toISOString() } : r),
    }));
  },

  acknowledgeActingHandover: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    await acknowledgeHandover(currentUser.id);
    const at = new Date().toISOString();
    set(state => ({
      currentUser: state.currentUser ? { ...state.currentUser, actingAcknowledgedAt: at } : state.currentUser,
      users: state.users.map(u => u.id === currentUser.id ? { ...u, actingAcknowledgedAt: at } : u),
    }));
  },

  updateSite: (siteId, data) => {
    set(state => ({
      sites: state.sites.map(s => s.id === siteId ? { ...s, ...data } : s),
    }));
    updateSiteInDB(siteId, data).catch(reportSaveError);
  },

  saveSite: async (site) => {
    await upsertSiteInDB(site);
    set(state => ({
      sites: state.sites.some(s => s.id === site.id)
        ? state.sites.map(s => (s.id === site.id ? { ...s, ...site } : s))
        : [...state.sites, site],
    }));
  },

  createAsset: async (data) => {
    const asset = {
      ...data, id: genId(), status: data.status ?? 'operational', totalRepairCost: 0, maintenanceHistory: [],
      name: data.name ? titleCase(data.name) : data.name,
      floor: data.floor ? normalizeFloor(data.floor) : data.floor,
      location: data.location ? titleCase(data.location) : data.location,
      category: data.category ? titleCase(data.category) : data.category,
    } as Asset;
    await createAssetRow(asset);
    set(state => ({ assets: [...state.assets, asset].sort((a, b) => a.name.localeCompare(b.name)) }));
  },
  updateAsset: async (id, data) => {
    const normalized: Partial<Asset> = {
      ...data,
      ...(data.name !== undefined && { name: titleCase(data.name) }),
      ...(data.floor !== undefined && { floor: data.floor ? normalizeFloor(data.floor) : data.floor }),
      ...(data.location !== undefined && { location: data.location ? titleCase(data.location) : data.location }),
      ...(data.category !== undefined && { category: data.category ? titleCase(data.category) : data.category }),
    };
    await updateAssetRow(id, normalized);
    set(state => ({ assets: state.assets.map(a => a.id === id ? { ...a, ...normalized } : a).sort((a, b) => a.name.localeCompare(b.name)) }));
  },

  createPPMSchedule: async (data) => {
    await createPPMSchedule({ ...data, id: genId(), status: data.status ?? 'scheduled' });
  },
  updatePPMSchedule: async (id, data) => {
    set(state => ({ ppmSchedules: state.ppmSchedules.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s) }));
    await updatePPMSchedule(id, data).catch(reportSaveError);
  },

  createIncident: async (data) => {
    const id = genId();
    const now = new Date().toISOString();
    await createIncident({
      ...data, id, status: 'open', occurredAt: data.occurredAt ?? now, createdAt: now, updatedAt: now,
      title: data.title ? titleCase(data.title) : data.title,
      description: data.description ? sentenceCase(data.description) : data.description,
      category: data.category ? titleCase(data.category) : data.category,
    });
  },
  updateIncident: async (id, data) => {
    const normalized: Partial<Incident> = {
      ...data,
      ...(data.title !== undefined && { title: titleCase(data.title) }),
      ...(data.description !== undefined && { description: sentenceCase(data.description) }),
      ...(data.category !== undefined && { category: data.category ? titleCase(data.category) : data.category }),
    };
    set(state => ({ incidents: state.incidents.map(item => item.id === id ? { ...item, ...normalized, updatedAt: new Date().toISOString() } : item) }));
    await updateIncident(id, normalized).catch(reportSaveError);
  },

  createPettyCashEntry: async (data) => {
    const id = genId();
    const now = new Date().toISOString();
    await createPettyCashEntry({ ...data, id, status: 'approved', createdAt: now });
  },
  updatePettyCashEntry: async (id, data) => {
    set(state => ({ pettyCash: state.pettyCash.map(item => item.id === id ? { ...item, ...data } : item) }));
    await updatePettyCashEntry(id, data).catch(reportSaveError);
  },

  createSupportTicket: async (data) => {
    const id = genId();
    const now = new Date().toISOString();
    await createSupportTicket({ ...data, id, status: 'open', createdAt: now, updatedAt: now });
  },
  updateSupportTicket: async (id, data) => {
    set(state => ({ supportTickets: state.supportTickets.map(item => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item) }));
    await updateSupportTicket(id, data).catch(reportSaveError);
  },

  upsertVendor: async (vendor) => {
    const normalized: Partial<Vendor> = {
      ...vendor,
      ...(vendor.name !== undefined && { name: titleCase(vendor.name) }),
      ...(vendor.category !== undefined && { category: vendor.category ? titleCase(vendor.category) : vendor.category }),
      ...(vendor.contactPerson !== undefined && { contactPerson: vendor.contactPerson ? titleCase(vendor.contactPerson) : vendor.contactPerson }),
      ...(vendor.bankName !== undefined && { bankName: vendor.bankName ? titleCase(vendor.bankName) : vendor.bankName }),
      ...(vendor.accountName !== undefined && { accountName: vendor.accountName ? titleCase(vendor.accountName) : vendor.accountName }),
      ...(vendor.alias !== undefined && { alias: vendor.alias ? titleCase(vendor.alias) : vendor.alias }),
    };
    set(state => ({
      vendors: normalized.id && state.vendors.some(v => v.id === normalized.id)
        ? state.vendors.map(v => v.id === normalized.id ? { ...v, ...normalized } : v)
        : [...state.vendors, normalized as Vendor],
    }));
    await upsertVendor(normalized).catch(reportSaveError);
  },

  createFacilityVendorSLA: async (data) => {
    await createFacilityVendorSLA(data);
    set(state => ({ facilityVendorSLAs: [data as FacilityVendorSLA, ...state.facilityVendorSLAs] }));
  },
  updateFacilityVendorSLA: async (id, data) => {
    await updateFacilityVendorSLA(id, data);
    set(state => ({ facilityVendorSLAs: state.facilityVendorSLAs.map(s => s.id === id ? { ...s, ...data } : s) }));
  },
  deleteFacilityVendorSLA: async (id) => {
    await deleteFacilityVendorSLA(id);
    set(state => ({ facilityVendorSLAs: state.facilityVendorSLAs.filter(s => s.id !== id) }));
  },

  issueServiceCharge: async (inv) => {
    const me = get().currentUser?.name ?? 'Admin';
    await createServiceChargeInvoiceDb({ ...inv, status: 'sent', issuedBy: me });
  },

  createTenant: async (data) => {
    await createTenant({ ...data, status: data.status ?? 'paid' });
  },
  updateTenant: async (id, data) => {
    set(state => ({ tenants: state.tenants.map(item => item.id === id ? { ...item, ...data } : item) }));
    await updateTenant(id, data).catch(reportSaveError);
  },

  createJobCompletion: async (data) => {
    await createJobCompletion({ ...data });
  },

  createChecklistTemplate: async (data) => {
    await createChecklistTemplate({ ...data, zones: data.zones ?? [] });
  },
  createReconEntry: async (data) => {
    await createReconciliationEntry({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  },
  updateReconEntry: async (id, data) => {
    set(state => ({ reconciliationEntries: state.reconciliationEntries.map(e => e.id === id ? { ...e, ...data } : e) }));
    await updateReconciliationEntry(id, data).catch(reportSaveError);
  },
  setRequestRecon: async (requestId, status, note, by) => {
    set(state => ({ requests: state.requests.map(r => r.id === requestId ? { ...r, reconStatus: status, reconNote: note, reconBy: by } : r) }));
    await updateRequestInDB(requestId, { reconStatus: status, reconNote: note, reconBy: by }).catch(reportSaveError);
  },

  updateChecklistTemplate: async (id, data) => {
    set(state => ({ checklistTemplates: state.checklistTemplates.map(item => item.id === id ? { ...item, ...data } : item) }));
    await updateChecklistTemplate(id, data).catch(reportSaveError);
  },

  addTreasuryEntry: (entry) => {
    const newEntry = { ...entry, id: genId() };
    set(state => ({
      treasury: [newEntry, ...state.treasury],
    }));
    addTreasuryEntryInDB(newEntry).catch(reportSaveError);
  },

  getSiteMonthSpend: (siteId) => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return get().requests
      .filter(r => {
        if (r.siteId !== siteId || r.status !== 'PAID' || !r.paidAt) return false;
        const paid = new Date(r.paidAt);
        return paid.getMonth() === month && paid.getFullYear() === year;
      })
      .reduce((sum, r) => sum + (r.netPayment ?? r.invoiceAmount ?? 0), 0);
  },

  getBudgetSummaries: () => {
    const { sites } = get();
    return sites.map(s => {
      const spent = get().getSiteMonthSpend(s.id);
      return {
        siteId: s.id,
        siteName: s.name,
        monthlyBudget: s.monthlyBudget,
        spent,
        remaining: s.monthlyBudget - spent,
        utilizationPct: s.monthlyBudget > 0 ? Math.round((spent / s.monthlyBudget) * 100) : 0,
      };
    });
  },

  getRequestsBySite: (siteId) => get().requests.filter(r => r.siteId === siteId),

  getOpenRequestsForUser: () => {
    const { currentUser, requests, activeSiteId } = get();
    if (!currentUser) return [];
    if (currentUser.role === 'facility_manager') return requests.filter(r => r.siteId === (activeSiteId ?? currentUser.siteId));
    if (currentUser.role === 'procurement') return requests.filter(r => r.status === 'REQUEST_CREATED' || r.status === 'PROCUREMENT_REVIEW');
    if (currentUser.role === 'supervisor') return requests.filter(r => r.status === 'PO_GENERATED' || r.status === 'SUPERVISOR_APPROVAL');
    if (currentUser.role === 'finance') return requests.filter(r => r.status === 'PAYMENT_PENDING' || r.status === 'ADMIN_APPROVED');
    return requests;
  },

  getPPMForUser: () => {
    const { currentUser, ppmSchedules } = get();
    if (!currentUser) return [];
    if (currentUser.role === 'technician') return ppmSchedules.filter(s => s.assignedTo === currentUser.id);
    if (currentUser.role === 'facility_manager') return ppmSchedules.filter(s => s.siteId === (get().activeSiteId ?? currentUser.siteId));
    return ppmSchedules;
  },

  getOpenIncidentsForUser: () => {
    const { currentUser, incidents } = get();
    if (!currentUser) return [];
    if (currentUser.role === 'facility_manager') return incidents.filter(i => i.siteId === (get().activeSiteId ?? currentUser.siteId) && i.status !== 'closed');
    if (currentUser.role === 'admin') return incidents;
    return incidents.filter(i => i.status !== 'closed');
  },

  getPettyCashForSite: (siteId: string) => {
    const { pettyCash } = get();
    return pettyCash.filter(entry => entry.siteId === siteId);
  },
}));
