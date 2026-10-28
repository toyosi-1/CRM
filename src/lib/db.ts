import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { compressImage } from '../utils/imageCompression';
import type { User, Site, Vendor, Asset, MaintenanceRequest, Checklist, TreasuryEntry, PPMSchedule, Incident, PettyCashEntry, SupportTicket, Tenant, JobCompletion, ChecklistTemplate, ReconciliationEntry, FacilityVendorSLA, ServiceChargeInvoice } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export const COLLECTIONS = {
  users: 'profiles',
  sites: 'sites',
  vendors: 'vendors',
  assets: 'assets',
  requests: 'requests',
  checklists: 'checklists',
  treasury: 'treasury',
  ppm_schedules: 'ppm_schedules',
  incidents: 'incidents',
  petty_cash_entries: 'petty_cash_entries',
  support_tickets: 'support_tickets',
  tenants: 'tenants',
  job_completions: 'job_completions',
  checklist_templates: 'checklist_templates',
} as const;

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function siteFromRow(row: Record<string, unknown>): Site {
  return {
    id: String(row.id), name: String(row.name), address: String(row.address ?? ''), size: String(row.size ?? ''),
    contactName: String(row.contact_name ?? ''), contactPhone: String(row.contact_phone ?? ''), contactEmail: String(row.contact_email ?? ''),
    pettyCashEnabled: Boolean(row.petty_cash_enabled), floatLimit: Number(row.float_limit ?? 0), monthlyBudget: Number(row.monthly_budget ?? 0),
    currentMonthSpend: Number(row.current_month_spend ?? 0), slaExpiryDate: String(row.sla_expiry_date ?? ''),
    siteType: (row.site_type as Site['siteType']) ?? 'Full residential building', floors: String(row.floors ?? ''), units: String(row.units ?? ''),
    scope: String(row.scope ?? ''), electricityBilling: (row.electricity_billing as Site['electricityBilling']) ?? 'postpaid',
    meterAccountNo: String(row.meter_account_no ?? ''), emergencyContact: String(row.emergency_contact ?? ''), securityDesk: String(row.security_desk ?? ''),
    status: (row.status as Site['status']) ?? 'healthy', createdAt: String(row.created_at),
  };
}

function siteToRow(site: Partial<Site>) {
  return {
    ...(site.name !== undefined && { name: site.name }), ...(site.address !== undefined && { address: site.address }),
    ...(site.size !== undefined && { size: site.size }), ...(site.contactName !== undefined && { contact_name: site.contactName }),
    ...(site.contactPhone !== undefined && { contact_phone: site.contactPhone }), ...(site.contactEmail !== undefined && { contact_email: site.contactEmail }),
    ...(site.pettyCashEnabled !== undefined && { petty_cash_enabled: site.pettyCashEnabled }), ...(site.floatLimit !== undefined && { float_limit: site.floatLimit }),
    ...(site.monthlyBudget !== undefined && { monthly_budget: site.monthlyBudget }), ...(site.currentMonthSpend !== undefined && { current_month_spend: site.currentMonthSpend }),
    ...(site.slaExpiryDate !== undefined && { sla_expiry_date: site.slaExpiryDate }),
    ...(site.siteType !== undefined && { site_type: site.siteType }), ...(site.floors !== undefined && { floors: site.floors }),
    ...(site.units !== undefined && { units: site.units }), ...(site.scope !== undefined && { scope: site.scope }),
    ...(site.electricityBilling !== undefined && { electricity_billing: site.electricityBilling }), ...(site.meterAccountNo !== undefined && { meter_account_no: site.meterAccountNo }),
    ...(site.emergencyContact !== undefined && { emergency_contact: site.emergencyContact }), ...(site.securityDesk !== undefined && { security_desk: site.securityDesk }),
    ...(site.status !== undefined && { status: site.status }),
  };
}

function userFromRow(row: Record<string, unknown>): User {
  return { id: String(row.id), name: String(row.name), email: String(row.email), role: row.role as User['role'], siteId: row.site_id ? String(row.site_id) : undefined, siteIds: Array.isArray(row.site_ids) ? row.site_ids.map(String) : [], avatar: row.avatar ? String(row.avatar) : undefined, department: String(row.department ?? ''), phone: String(row.phone ?? ''), trade: String(row.trade ?? ''), active: Boolean(row.active), notes: String(row.notes ?? ''),
    actingForProfileId: row.acting_for_profile_id ? String(row.acting_for_profile_id) : undefined,
    actingStart: row.acting_start ? String(row.acting_start) : undefined, actingEnd: row.acting_end ? String(row.acting_end) : undefined,
    actingHandover: (row.acting_handover ?? {}) as Record<string, unknown>, actingAcknowledgedAt: row.acting_acknowledged_at ? String(row.acting_acknowledged_at) : undefined };
}

function vendorFromRow(row: Record<string, unknown>): Vendor {
  return {
    id: String(row.id), name: String(row.name), category: String(row.category ?? ''), type: row.type as Vendor['type'],
    rcNumber: row.rc_number ? String(row.rc_number) : undefined, exemptionNotes: row.exemption_notes ? String(row.exemption_notes) : undefined,
    bankName: String(row.bank_name ?? ''),
    accountNumber: String(row.account_number ?? ''), accountName: String(row.account_name ?? ''), totalJobsCompleted: Number(row.total_jobs_completed ?? 0),
    totalAmountPaid: Number(row.total_amount_paid ?? 0), avgCompletionDays: Number(row.avg_completion_days ?? 0), lastJobDate: String(row.last_job_date ?? ''),
    riskScore: row.risk_score as Vendor['riskScore'], tier: (row.tier as Vendor['tier']) ?? '3', contactPerson: String(row.contact_person ?? ''),
    phone: String(row.phone ?? ''), email: String(row.email ?? ''), alias: String(row.alias ?? ''), tin: String(row.tin ?? ''), verified: Boolean(row.verified),
    approvalStatus: row.approval_status ? (row.approval_status as Vendor['approvalStatus']) : 'approved',
    requestedBy: row.requested_by ? String(row.requested_by) : undefined,
    guarantorProfileId: row.guarantor_profile_id ? String(row.guarantor_profile_id) : undefined, createdAt: String(row.created_at),
  };
}

function vendorToRow(vendor: Partial<Vendor>) {
  return {
    ...(vendor.id !== undefined && { id: vendor.id }), ...(vendor.name !== undefined && { name: vendor.name }),
    ...(vendor.category !== undefined && { category: vendor.category }), ...(vendor.type !== undefined && { type: vendor.type }),
    ...(vendor.rcNumber !== undefined && { rc_number: vendor.rcNumber }), ...(vendor.exemptionNotes !== undefined && { exemption_notes: vendor.exemptionNotes }),
    ...(vendor.bankName !== undefined && { bank_name: vendor.bankName }), ...(vendor.accountNumber !== undefined && { account_number: vendor.accountNumber }),
    ...(vendor.accountName !== undefined && { account_name: vendor.accountName }), ...(vendor.totalJobsCompleted !== undefined && { total_jobs_completed: vendor.totalJobsCompleted }),
    ...(vendor.totalAmountPaid !== undefined && { total_amount_paid: vendor.totalAmountPaid }), ...(vendor.avgCompletionDays !== undefined && { avg_completion_days: vendor.avgCompletionDays }),
    ...(vendor.lastJobDate !== undefined && { last_job_date: vendor.lastJobDate || null }), ...(vendor.riskScore !== undefined && { risk_score: vendor.riskScore }),
    ...(vendor.tier !== undefined && { tier: vendor.tier }), ...(vendor.contactPerson !== undefined && { contact_person: vendor.contactPerson }),
    ...(vendor.phone !== undefined && { phone: vendor.phone }), ...(vendor.email !== undefined && { email: vendor.email }), ...(vendor.alias !== undefined && { alias: vendor.alias }), ...(vendor.tin !== undefined && { tin: vendor.tin }),
    ...(vendor.verified !== undefined && { verified: vendor.verified }), ...(vendor.approvalStatus !== undefined && { approval_status: vendor.approvalStatus }),
    ...(vendor.requestedBy !== undefined && { requested_by: vendor.requestedBy }), ...(vendor.guarantorProfileId !== undefined && { guarantor_profile_id: vendor.guarantorProfileId }),
  };
}

function assetFromRow(row: Record<string, unknown>): Asset {
  return {
    id: String(row.id), name: String(row.name), siteId: String(row.site_id), floor: row.floor ? String(row.floor) : undefined,
    location: row.location ? String(row.location) : undefined, category: row.category ? String(row.category) : undefined,
    purchaseDate: row.purchase_date ? String(row.purchase_date) : undefined,
    shelfLifeMonths: row.shelf_life_months == null ? undefined : Number(row.shelf_life_months),
    installationDate: String(row.installation_date ?? ''),
    lastRepairDate: String(row.last_repair_date ?? ''), totalRepairCost: Number(row.total_repair_cost ?? 0),
    maintenanceHistory: (row.maintenance_history ?? []) as Asset['maintenanceHistory'], status: row.status as Asset['status'],
  };
}

function requestFromRow(row: Record<string, unknown>): MaintenanceRequest {
  return {
    id: String(row.id), requestNumber: String(row.request_number), siteId: String(row.site_id), siteName: String(row.site_name),
    submittedBy: String(row.submitted_by), submittedByName: String(row.submitted_by_name), description: String(row.description),
    category: row.category ? String(row.category) : undefined, location: row.location ? String(row.location) : undefined,
    slaAvailable: Boolean(row.sla_available), oneTimeVendor: (row.one_time_vendor ?? {}) as MaintenanceRequest['oneTimeVendor'],
    priority: row.priority as MaintenanceRequest['priority'], status: row.status as MaintenanceRequest['status'],
    vendorId: row.vendor_id ? String(row.vendor_id) : undefined, vendorAttendedAt: row.vendor_attended_at ? String(row.vendor_attended_at) : undefined, vendorName: row.vendor_name ? String(row.vendor_name) : undefined,
    vendorType: row.vendor_type as MaintenanceRequest['vendorType'], invoiceAmount: row.invoice_amount == null ? undefined : Number(row.invoice_amount),
    invoiceUrl: row.invoice_url ? String(row.invoice_url) : undefined, faultPhotoUrl: row.fault_photo_url ? String(row.fault_photo_url) : undefined,
    attachments: (row.attachments ?? []) as MaintenanceRequest['attachments'], storageSaved: row.storage_saved == null ? undefined : Number(row.storage_saved),
    assetId: row.asset_id ? String(row.asset_id) : undefined, assetName: row.asset_name ? String(row.asset_name) : undefined,
    purchaseOrder: row.purchase_order as MaintenanceRequest['purchaseOrder'], taxType: row.tax_type as MaintenanceRequest['taxType'],
    grossAmount: row.gross_amount == null ? undefined : Number(row.gross_amount), taxAmount: row.tax_amount == null ? undefined : Number(row.tax_amount),
    netPayment: row.net_payment == null ? undefined : Number(row.net_payment), paymentReceiptUrl: row.payment_receipt_url ? String(row.payment_receipt_url) : undefined,
    rejectionComment: row.rejection_comment ? String(row.rejection_comment) : undefined, isEmergencyBypass: Boolean(row.is_emergency_bypass),
    isBudgetWarning: Boolean(row.is_budget_warning), isIncident: Boolean(row.is_incident),
    linkedIncidentId: row.linked_incident_id ? String(row.linked_incident_id) : undefined,
    jobCompletionUrl: row.job_completion_url ? String(row.job_completion_url) : undefined,
    assignedTo: row.assigned_to ? String(row.assigned_to) : undefined,
    workCompletedAt: row.work_completed_at ? String(row.work_completed_at) : undefined,
    reconStatus: row.recon_status ? (row.recon_status as MaintenanceRequest['reconStatus']) : undefined,
    reconNote: row.recon_note ? String(row.recon_note) : undefined, reconBy: row.recon_by ? String(row.recon_by) : undefined,
    slaDeadline: String(row.sla_deadline), slaBreached: Boolean(row.sla_breached),
    procurementReceivedAt: row.procurement_received_at ? String(row.procurement_received_at) : undefined,
    procurementHandledAt: row.procurement_handled_at ? String(row.procurement_handled_at) : undefined,
    supervisorReceivedAt: row.supervisor_received_at ? String(row.supervisor_received_at) : undefined,
    supervisorApprovedAt: row.supervisor_approved_at ? String(row.supervisor_approved_at) : undefined,
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    auditTrail: (row.audit_trail ?? []) as MaintenanceRequest['auditTrail'], createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function requestToRow(request: Partial<MaintenanceRequest>) {
  return {
    ...(request.id !== undefined && { id: request.id }), ...(request.requestNumber !== undefined && { request_number: request.requestNumber }),
    ...(request.siteId !== undefined && { site_id: request.siteId }), ...(request.siteName !== undefined && { site_name: request.siteName }),
    ...(request.submittedBy !== undefined && { submitted_by: request.submittedBy }), ...(request.submittedByName !== undefined && { submitted_by_name: request.submittedByName }),
    ...(request.description !== undefined && { description: request.description }), ...(request.category !== undefined && { category: request.category }),
    ...(request.location !== undefined && { location: request.location }), ...(request.slaAvailable !== undefined && { sla_available: request.slaAvailable }),
    ...(request.oneTimeVendor !== undefined && { one_time_vendor: request.oneTimeVendor }),
    ...(request.priority !== undefined && { priority: request.priority }),
    ...(request.status !== undefined && { status: request.status }), ...(request.vendorId !== undefined && { vendor_id: request.vendorId }),
    ...(request.vendorName !== undefined && { vendor_name: request.vendorName }), ...(request.vendorType !== undefined && { vendor_type: request.vendorType }),
    ...(request.invoiceAmount !== undefined && { invoice_amount: request.invoiceAmount }), ...(request.invoiceUrl !== undefined && { invoice_url: request.invoiceUrl }),
    ...(request.faultPhotoUrl !== undefined && { fault_photo_url: request.faultPhotoUrl }), ...(request.attachments !== undefined && { attachments: request.attachments }),
    ...(request.storageSaved !== undefined && { storage_saved: request.storageSaved }), ...(request.assetId !== undefined && { asset_id: request.assetId }),
    ...(request.assetName !== undefined && { asset_name: request.assetName }), ...(request.purchaseOrder !== undefined && { purchase_order: request.purchaseOrder }),
    ...(request.taxType !== undefined && { tax_type: request.taxType }), ...(request.grossAmount !== undefined && { gross_amount: request.grossAmount }),
    ...(request.taxAmount !== undefined && { tax_amount: request.taxAmount }), ...(request.netPayment !== undefined && { net_payment: request.netPayment }),
    ...(request.paymentReceiptUrl !== undefined && { payment_receipt_url: request.paymentReceiptUrl }), ...(request.rejectionComment !== undefined && { rejection_comment: request.rejectionComment }),
    ...(request.isEmergencyBypass !== undefined && { is_emergency_bypass: request.isEmergencyBypass }), ...(request.isBudgetWarning !== undefined && { is_budget_warning: request.isBudgetWarning }),
    ...(request.isIncident !== undefined && { is_incident: request.isIncident }),
    ...(request.linkedIncidentId !== undefined && { linked_incident_id: request.linkedIncidentId || null }),
    ...(request.jobCompletionUrl !== undefined && { job_completion_url: request.jobCompletionUrl || null }),
    ...(request.assignedTo !== undefined && { assigned_to: request.assignedTo || null }),
    ...(request.workCompletedAt !== undefined && { work_completed_at: request.workCompletedAt || null }),
    ...(request.reconStatus !== undefined && { recon_status: request.reconStatus }), ...(request.reconNote !== undefined && { recon_note: request.reconNote }),
    ...(request.reconBy !== undefined && { recon_by: request.reconBy }),
    ...(request.slaDeadline !== undefined && { sla_deadline: request.slaDeadline }), ...(request.slaBreached !== undefined && { sla_breached: request.slaBreached }),
    ...(request.procurementReceivedAt !== undefined && { procurement_received_at: request.procurementReceivedAt }),
    ...(request.procurementHandledAt !== undefined && { procurement_handled_at: request.procurementHandledAt }),
    ...(request.supervisorReceivedAt !== undefined && { supervisor_received_at: request.supervisorReceivedAt }),
    ...(request.supervisorApprovedAt !== undefined && { supervisor_approved_at: request.supervisorApprovedAt }),
    ...(request.paidAt !== undefined && { paid_at: request.paidAt }),
    ...(request.auditTrail !== undefined && { audit_trail: request.auditTrail }), ...(request.createdAt !== undefined && { created_at: request.createdAt }),
    ...(request.updatedAt !== undefined && { updated_at: request.updatedAt }),
  };
}

export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('name'); fail(error); return (data ?? []).map(userFromRow);
}

export async function fetchUserByAuthId(authUserId: string): Promise<User | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('auth_user_id', authUserId).eq('active', true).maybeSingle(); fail(error); return data ? userFromRow(data) : null;
}

export async function inviteStaff(input: { name: string; email: string; phone?: string; role: User['role']; siteId?: string; department: string; trade?: string }): Promise<string> {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { ...input, redirectTo: `${window.location.origin}/set-password` } });
  fail(error);
  if (data?.error) throw new Error(String(data.error));
  return String(data?.message ?? 'Invitation sent');
}

export async function createStaff(input: { name: string; email: string; phone?: string; role: User['role']; siteId?: string; department: string; trade?: string; password: string; notes?: string }): Promise<string> {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'create', ...input } });
  fail(error);
  if (data?.error) throw new Error(String(data.error));
  return String(data?.message ?? 'Account created');
}

export async function updateStaff(input: { profileId: string; name?: string; phone?: string; trade?: string; active?: boolean; siteId?: string | null; siteIds?: string[]; department?: string; role?: User['role']; notes?: string }): Promise<string> {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'update', ...input } });
  fail(error);
  if (data?.error) throw new Error(String(data.error));
  return String(data?.message ?? 'Staff member updated');
}

export async function assignActingFM(input: { actingProfileId: string; coveringProfileId: string; start: string; end: string; handover?: Record<string, unknown> }): Promise<string> {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'assignActing', ...input } });
  fail(error);
  if (data?.error) throw new Error(String(data.error));
  return String(data?.message ?? 'Acting FM assigned');
}

export async function clearActingFM(actingProfileId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'clearActing', actingProfileId } });
  fail(error);
  if (data?.error) throw new Error(String(data.error));
  return String(data?.message ?? 'Acting FM cleared');
}

// The acting FM acknowledges their handover pack (spec §5.8) — logged on their own profile.
export async function acknowledgeHandover(profileId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ acting_acknowledged_at: new Date().toISOString() }).eq('id', profileId); fail(error);
}

// Route a request to a technician. Server-enforced: FMs may only assign requests at their own sites.
export async function assignTechnician(requestId: string, technicianId: string | null): Promise<void> {
  const { error } = await supabase.rpc('assign_technician', { p_request_id: requestId, p_technician_id: technicianId }); fail(error);
}

// Stops the vendor SLA response clock (spec §5.11)
// FM confirms the paid job is physically complete — end of the vendor SLA clock.
export async function markWorkCompleted(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_work_completed', { p_request_id: requestId }); fail(error);
}

export async function markVendorAttended(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_vendor_attended', { p_request_id: requestId }); fail(error);
}

export async function upsertUser(user: User): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({ id: user.id, name: user.name, email: user.email, role: user.role, site_id: user.siteId, avatar: user.avatar, department: user.department }); fail(error);
}

export async function fetchSites(): Promise<Site[]> {
  const { data, error } = await supabase.from('sites').select('*').order('name'); fail(error); return (data ?? []).map(siteFromRow);
}

export async function setSitePettyCash(siteId: string, enabled: boolean, floatLimit: number): Promise<void> {
  const { error } = await supabase.rpc('set_site_petty_cash', { p_site_id: siteId, p_enabled: enabled, p_float_limit: floatLimit });
  fail(error);
}

export async function updateSiteInDB(siteId: string, data: Partial<Site>): Promise<void> {
  const { error } = await supabase.from('sites').update(siteToRow(data)).eq('id', siteId); fail(error);
}

export async function upsertSiteInDB(site: Site): Promise<void> {
  const { error } = await supabase.from('sites').upsert({ id: site.id, ...siteToRow(site) }); fail(error);
}

export async function fetchVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase.from('vendors').select('*').order('name'); fail(error); return (data ?? []).map(vendorFromRow);
}

export async function upsertVendor(vendor: Partial<Vendor>): Promise<void> {
  const { error } = await supabase.from('vendors').upsert(vendorToRow(vendor)); fail(error);
}

export async function fetchFacilityVendorSLAs(): Promise<FacilityVendorSLA[]> {
  const { data, error } = await supabase.from('facility_vendor_slas').select('*').order('created_at', { ascending: false }); fail(error);
  return (data ?? []).map(row => ({
    id: String(row.id), siteId: String(row.site_id), vendorId: String(row.vendor_id), category: String(row.category ?? ''),
    responseSlaHours: Number(row.response_sla_hours), startDate: row.start_date ? String(row.start_date) : undefined,
    expiryDate: row.expiry_date ? String(row.expiry_date) : undefined, createdBy: row.created_by ? String(row.created_by) : undefined,
    paymentModel: (row.payment_model as FacilityVendorSLA['paymentModel']) ?? 'per_service',
    suspended: Boolean(row.suspended), renewalReview: Boolean(row.renewal_review),
    breachNotices: (row.breach_notices ?? []) as FacilityVendorSLA['breachNotices'],
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  } as FacilityVendorSLA));
}

export function subscribeFacilityVendorSLAs(callback: (slas: FacilityVendorSLA[]) => void): () => void {
  const refresh = async () => callback(await fetchFacilityVendorSLAs()); void refresh(); return subscribe('facility_vendor_slas', refresh);
}

export async function createFacilityVendorSLA(sla: Partial<FacilityVendorSLA>): Promise<void> {
  const { error } = await supabase.from('facility_vendor_slas').insert({
    site_id: sla.siteId, vendor_id: sla.vendorId, category: sla.category,
    response_sla_hours: sla.responseSlaHours, start_date: sla.startDate || null, expiry_date: sla.expiryDate || null, created_by: sla.createdBy,
    ...(sla.paymentModel !== undefined && { payment_model: sla.paymentModel }),
  }); fail(error);
}

export async function updateFacilityVendorSLA(slaId: string, data: Partial<FacilityVendorSLA>): Promise<void> {
  const { error } = await supabase.from('facility_vendor_slas').update({
    ...(data.siteId !== undefined && { site_id: data.siteId }), ...(data.vendorId !== undefined && { vendor_id: data.vendorId }),
    ...(data.category !== undefined && { category: data.category }), ...(data.responseSlaHours !== undefined && { response_sla_hours: data.responseSlaHours }),
    ...(data.startDate !== undefined && { start_date: data.startDate || null }), ...(data.expiryDate !== undefined && { expiry_date: data.expiryDate || null }),
    ...(data.paymentModel !== undefined && { payment_model: data.paymentModel }),
    ...(data.suspended !== undefined && { suspended: data.suspended }), ...(data.renewalReview !== undefined && { renewal_review: data.renewalReview }),
    ...(data.breachNotices !== undefined && { breach_notices: data.breachNotices }),
  }).eq('id', slaId); fail(error);
}

export async function deleteFacilityVendorSLA(slaId: string): Promise<void> {
  const { error } = await supabase.from('facility_vendor_slas').delete().eq('id', slaId); fail(error);
}

export async function fetchAssets(): Promise<Asset[]> {
  const { data, error } = await supabase.from('assets').select('*').order('name'); fail(error); return (data ?? []).map(assetFromRow);
}

export async function createAsset(asset: Partial<Asset>): Promise<void> {
  const { error } = await supabase.from('assets').insert({
    id: asset.id, name: asset.name, site_id: asset.siteId,
    floor: asset.floor || null, location: asset.location || null, category: asset.category || '',
    purchase_date: asset.purchaseDate || null, shelf_life_months: asset.shelfLifeMonths ?? null,
    installation_date: asset.installationDate || null, last_repair_date: asset.lastRepairDate || null,
    total_repair_cost: asset.totalRepairCost ?? 0, maintenance_history: asset.maintenanceHistory ?? [],
    status: asset.status ?? 'operational',
  }); fail(error);
}

export async function updateAsset(id: string, asset: Partial<Asset>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (asset.name !== undefined) patch.name = asset.name;
  if (asset.floor !== undefined) patch.floor = asset.floor || null;
  if (asset.location !== undefined) patch.location = asset.location || null;
  if (asset.category !== undefined) patch.category = asset.category;
  if (asset.purchaseDate !== undefined) patch.purchase_date = asset.purchaseDate || null;
  if (asset.installationDate !== undefined) patch.installation_date = asset.installationDate || null;
  if (asset.shelfLifeMonths !== undefined) patch.shelf_life_months = asset.shelfLifeMonths ?? null;
  if (asset.lastRepairDate !== undefined) patch.last_repair_date = asset.lastRepairDate || null;
  if (asset.status !== undefined) patch.status = asset.status;
  const { error } = await supabase.from('assets').update(patch).eq('id', id); fail(error);
}

export async function deleteRequestInDB(id: string): Promise<void> {
  const { error } = await supabase.from('requests').delete().eq('id', id); fail(error);
}

async function fetchRequests(): Promise<MaintenanceRequest[]> {
  const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false }); fail(error); return (data ?? []).map(requestFromRow);
}

async function fetchChecklists(): Promise<Checklist[]> {
  const { data, error } = await supabase.from('checklists').select('*').order('created_at', { ascending: false }); fail(error);
  return (data ?? []).map(row => ({ id: row.id, title: row.title, siteId: row.site_id, type: row.type, items: row.items, completedBy: row.completed_by ?? undefined, completedAt: row.completed_at ?? undefined, submittedToAdmin: row.submitted_to_admin, createdAt: row.created_at } as Checklist));
}

async function fetchTreasury(): Promise<TreasuryEntry[]> {
  const { data, error } = await supabase.from('treasury').select('*').order('date', { ascending: false }); fail(error);
  return (data ?? []).map(row => ({ id: row.id, description: row.description, source: row.source, amount: Number(row.amount), type: row.type, date: row.date, recordedBy: row.recorded_by } as TreasuryEntry));
}

function subscribe(table: string, refresh: () => Promise<void>): () => void {
  const channel: RealtimeChannel = supabase.channel(`${table}-changes`).on('postgres_changes', { event: '*', schema: 'public', table }, refresh).subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function subscribeRequests(callback: (requests: MaintenanceRequest[]) => void): () => void {
  const refresh = async () => callback(await fetchRequests()); void refresh(); return subscribe('requests', refresh);
}

export async function createRequestInDB(request: MaintenanceRequest): Promise<void> {
  const { error } = await supabase.from('requests').insert(requestToRow(request)); fail(error);
}

export async function updateRequestInDB(requestId: string, data: Partial<MaintenanceRequest>): Promise<void> {
  const { error } = await supabase.from('requests').update(requestToRow(data)).eq('id', requestId); fail(error);
}

export function subscribeChecklists(callback: (checklists: Checklist[]) => void): () => void {
  const refresh = async () => callback(await fetchChecklists()); void refresh(); return subscribe('checklists', refresh);
}

export async function createChecklistInDB(checklist: Checklist): Promise<void> {
  const { error } = await supabase.from('checklists').insert({
    id: checklist.id,
    title: checklist.title,
    site_id: checklist.siteId,
    type: checklist.type,
    items: checklist.items,
    submitted_to_admin: false,
  });
  fail(error);
}

export async function createChecklistIfMissing(checklist: Checklist): Promise<void> {
  const { error } = await supabase.from('checklists').upsert({
    id: checklist.id,
    title: checklist.title,
    site_id: checklist.siteId,
    type: checklist.type,
    items: checklist.items,
    submitted_to_admin: false,
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error && error.code !== '23505') fail(error);
}

export async function updateChecklistInDB(checklistId: string, data: Partial<Checklist>): Promise<void> {
  const row = { ...(data.title !== undefined && { title: data.title }), ...(data.items !== undefined && { items: data.items }), ...(data.completedBy !== undefined && { completed_by: data.completedBy }), ...(data.completedAt !== undefined && { completed_at: data.completedAt }), ...(data.submittedToAdmin !== undefined && { submitted_to_admin: data.submittedToAdmin }) };
  const { error } = await supabase.from('checklists').update(row).eq('id', checklistId); fail(error);
}

export function subscribeTreasury(callback: (entries: TreasuryEntry[]) => void): () => void {
  const refresh = async () => callback(await fetchTreasury()); void refresh(); return subscribe('treasury', refresh);
}

export async function addTreasuryEntryInDB(entry: TreasuryEntry): Promise<void> {
  const { error } = await supabase.from('treasury').insert({ id: entry.id, description: entry.description, source: entry.source, amount: entry.amount, type: entry.type, date: entry.date, recorded_by: entry.recordedBy }); fail(error);
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30); fail(error);
  return (data ?? []).map(row => ({ id: row.id, title: row.title, body: row.body, link: row.link ?? undefined, readAt: row.read_at ?? undefined, createdAt: row.created_at }));
}

export function subscribeNotifications(callback: (notifications: AppNotification[]) => void): () => void {
  const refresh = async () => callback(await fetchNotifications()); void refresh(); return subscribe('notifications', refresh);
}

function ppmFromRow(row: Record<string, unknown>): PPMSchedule {
  return {
    id: String(row.id), siteId: String(row.site_id), assetId: row.asset_id ? String(row.asset_id) : undefined, vendorId: row.vendor_id ? String(row.vendor_id) : undefined,
    title: String(row.title), description: String(row.description), frequencyMonths: Number(row.frequency_months), nextDueDate: String(row.next_due_date),
    lastCompletedDate: row.last_completed_date ? String(row.last_completed_date) : undefined, status: row.status as PPMSchedule['status'],
    assignedTo: row.assigned_to ? String(row.assigned_to) : undefined, deferralReason: row.deferral_reason ? String(row.deferral_reason) : undefined,
    contractStart: row.contract_start ? String(row.contract_start) : undefined, contractEnd: row.contract_end ? String(row.contract_end) : undefined,
    visitsIncluded: row.visits_included == null ? undefined : Number(row.visits_included), approx: Boolean(row.approx),
    planDates: (row.plan_dates ?? []) as string[], serviceHistory: (row.service_history ?? []) as string[],
    completionPhotos: (row.completion_photos ?? []) as PPMSchedule['completionPhotos'],
    jobCompletionUrl: row.job_completion_url ? String(row.job_completion_url) : undefined, notes: String(row.notes ?? ''),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function ppmToRow(schedule: Partial<PPMSchedule>) {
  return {
    ...(schedule.siteId !== undefined && { site_id: schedule.siteId }), ...(schedule.assetId !== undefined && { asset_id: schedule.assetId }),
    ...(schedule.vendorId !== undefined && { vendor_id: schedule.vendorId }), ...(schedule.title !== undefined && { title: schedule.title }),
    ...(schedule.description !== undefined && { description: schedule.description }), ...(schedule.frequencyMonths !== undefined && { frequency_months: schedule.frequencyMonths }),
    ...(schedule.nextDueDate !== undefined && { next_due_date: schedule.nextDueDate }), ...(schedule.lastCompletedDate !== undefined && { last_completed_date: schedule.lastCompletedDate }),
    ...(schedule.status !== undefined && { status: schedule.status }), ...(schedule.assignedTo !== undefined && { assigned_to: schedule.assignedTo }),
    ...(schedule.deferralReason !== undefined && { deferral_reason: schedule.deferralReason }),
    ...(schedule.contractStart !== undefined && { contract_start: schedule.contractStart || null }), ...(schedule.contractEnd !== undefined && { contract_end: schedule.contractEnd || null }),
    ...(schedule.visitsIncluded !== undefined && { visits_included: schedule.visitsIncluded }), ...(schedule.approx !== undefined && { approx: schedule.approx }),
    ...(schedule.planDates !== undefined && { plan_dates: schedule.planDates }), ...(schedule.serviceHistory !== undefined && { service_history: schedule.serviceHistory }),
    ...(schedule.completionPhotos !== undefined && { completion_photos: schedule.completionPhotos }),
    ...(schedule.jobCompletionUrl !== undefined && { job_completion_url: schedule.jobCompletionUrl }),
    ...(schedule.notes !== undefined && { notes: schedule.notes }),
  };
}

function incidentFromRow(row: Record<string, unknown>): Incident {
  return {
    id: String(row.id), siteId: String(row.site_id), requestId: row.request_id ? String(row.request_id) : undefined, reportedBy: String(row.reported_by),
    title: String(row.title), description: String(row.description), category: row.category ? String(row.category) : undefined,
    severity: row.severity as Incident['severity'], status: row.status as Incident['status'],
    attachments: (row.attachments ?? []) as Incident['attachments'], occurredAt: String(row.occurred_at), resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
    resolutionNotes: row.resolution_notes ? String(row.resolution_notes) : undefined,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function incidentToRow(incident: Partial<Incident>) {
  return {
    ...(incident.siteId !== undefined && { site_id: incident.siteId }), ...(incident.requestId !== undefined && { request_id: incident.requestId }),
    ...(incident.reportedBy !== undefined && { reported_by: incident.reportedBy }), ...(incident.title !== undefined && { title: incident.title }),
    ...(incident.description !== undefined && { description: incident.description }), ...(incident.category !== undefined && { category: incident.category || null }), ...(incident.severity !== undefined && { severity: incident.severity }),
    ...(incident.status !== undefined && { status: incident.status }), ...(incident.attachments !== undefined && { attachments: incident.attachments }),
    ...(incident.occurredAt !== undefined && { occurred_at: incident.occurredAt }), ...(incident.resolvedAt !== undefined && { resolved_at: incident.resolvedAt }),
    ...(incident.resolutionNotes !== undefined && { resolution_notes: incident.resolutionNotes }),
  };
}

function pettyFromRow(row: Record<string, unknown>): PettyCashEntry {
  return {
    id: String(row.id), siteId: String(row.site_id), amount: Number(row.amount), type: row.type as PettyCashEntry['type'],
    description: String(row.description), receiptUrl: row.receipt_url ? String(row.receipt_url) : undefined, recordedBy: String(row.recorded_by),
    approvedBy: row.approved_by ? String(row.approved_by) : undefined, status: row.status as PettyCashEntry['status'],
    editCount: Number(row.edit_count ?? 0), editNotes: (row.edit_notes ?? []) as PettyCashEntry['editNotes'], createdAt: String(row.created_at),
  };
}

function pettyToRow(entry: Partial<PettyCashEntry>) {
  return {
    ...(entry.siteId !== undefined && { site_id: entry.siteId }), ...(entry.amount !== undefined && { amount: entry.amount }),
    ...(entry.type !== undefined && { type: entry.type }), ...(entry.description !== undefined && { description: entry.description }),
    ...(entry.receiptUrl !== undefined && { receipt_url: entry.receiptUrl }), ...(entry.recordedBy !== undefined && { recorded_by: entry.recordedBy }),
    ...(entry.approvedBy !== undefined && { approved_by: entry.approvedBy }), ...(entry.status !== undefined && { status: entry.status }),
    ...(entry.editCount !== undefined && { edit_count: entry.editCount }), ...(entry.editNotes !== undefined && { edit_notes: entry.editNotes }),
  };
}

function ticketFromRow(row: Record<string, unknown>): SupportTicket {
  return {
    id: String(row.id), raisedBy: String(row.raised_by), page: String(row.page ?? ''), subject: String(row.subject),
    body: String(row.body), priority: row.priority as SupportTicket['priority'], status: row.status as SupportTicket['status'],
    attachmentUrl: row.attachment_url ? String(row.attachment_url) : undefined, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function ticketToRow(ticket: Partial<SupportTicket>) {
  return {
    ...(ticket.raisedBy !== undefined && { raised_by: ticket.raisedBy }), ...(ticket.page !== undefined && { page: ticket.page }),
    ...(ticket.subject !== undefined && { subject: ticket.subject }), ...(ticket.body !== undefined && { body: ticket.body }),
    ...(ticket.priority !== undefined && { priority: ticket.priority }), ...(ticket.status !== undefined && { status: ticket.status }),
    ...(ticket.attachmentUrl !== undefined && { attachment_url: ticket.attachmentUrl }),
  };
}

export async function fetchPPMSchedules(): Promise<PPMSchedule[]> {
  const { data, error } = await supabase.from('ppm_schedules').select('*').order('next_due_date', { ascending: true }); fail(error); return (data ?? []).map(ppmFromRow);
}

export function subscribePPMSchedules(callback: (schedules: PPMSchedule[]) => void): () => void {
  const refresh = async () => callback(await fetchPPMSchedules()); void refresh(); return subscribe('ppm_schedules', refresh);
}

export async function fetchTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase.from('tenants').select('*').order('lease_expiry', { ascending: true, nullsFirst: false }); fail(error);
  return (data ?? []).map(row => ({ id: row.id, siteId: row.site_id, name: row.name, unit: row.unit, email: row.email, phone: row.phone, monthlyRent: Number(row.monthly_rent), serviceCharge: Number(row.service_charge ?? 0), serviceChargeBilling: row.service_charge_billing ?? 'separate', serviceChargeInvoiceDate: row.service_charge_invoice_date ?? undefined, leaseExpiry: row.lease_expiry, lastPaymentDate: row.last_payment_date, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }));
}

export function subscribeTenants(callback: (tenants: Tenant[]) => void): () => void {
  const refresh = async () => callback(await fetchTenants()); void refresh(); return subscribe('tenants', refresh);
}

export async function createTenant(tenant: Partial<Tenant>): Promise<void> {
  const { error } = await supabase.from('tenants').insert({
    site_id: tenant.siteId, name: tenant.name, unit: tenant.unit, email: tenant.email, phone: tenant.phone,
    monthly_rent: tenant.monthlyRent, service_charge: tenant.serviceCharge ?? 0, service_charge_billing: tenant.serviceChargeBilling ?? 'separate', service_charge_invoice_date: tenant.serviceChargeInvoiceDate || null, lease_expiry: tenant.leaseExpiry, last_payment_date: tenant.lastPaymentDate, status: tenant.status ?? 'paid',
  }); fail(error);
}

export async function updateTenant(tenantId: string, data: Partial<Tenant>): Promise<void> {
  const { error } = await supabase.from('tenants').update({
    ...(data.siteId !== undefined && { site_id: data.siteId }), ...(data.name !== undefined && { name: data.name }), ...(data.unit !== undefined && { unit: data.unit }),
    ...(data.email !== undefined && { email: data.email }), ...(data.phone !== undefined && { phone: data.phone }), ...(data.monthlyRent !== undefined && { monthly_rent: data.monthlyRent }),
    ...(data.leaseExpiry !== undefined && { lease_expiry: data.leaseExpiry }), ...(data.lastPaymentDate !== undefined && { last_payment_date: data.lastPaymentDate }), ...(data.serviceCharge !== undefined && { service_charge: data.serviceCharge }), ...(data.status !== undefined && { status: data.status }),
    ...(data.serviceChargeBilling !== undefined && { service_charge_billing: data.serviceChargeBilling }), ...(data.serviceChargeInvoiceDate !== undefined && { service_charge_invoice_date: data.serviceChargeInvoiceDate || null }),
  }).eq('id', tenantId); fail(error);
}

export async function fetchServiceChargeInvoices(): Promise<ServiceChargeInvoice[]> {
  const { data, error } = await supabase.from('service_charge_invoices').select('*').order('issued_at', { ascending: false }); fail(error);
  return (data ?? []).map(row => ({ id: row.id, tenantId: row.tenant_id, siteId: row.site_id, amount: Number(row.amount), periodLabel: row.period_label, dueDate: row.due_date ?? undefined, status: row.status, issuedBy: row.issued_by, issuedAt: row.issued_at, createdAt: row.created_at }));
}

export function subscribeServiceChargeInvoices(callback: (invoices: ServiceChargeInvoice[]) => void): () => void {
  const refresh = async () => callback(await fetchServiceChargeInvoices()); void refresh(); return subscribe('service_charge_invoices', refresh);
}

export async function createServiceChargeInvoice(inv: Omit<ServiceChargeInvoice, 'id' | 'createdAt' | 'issuedAt'>): Promise<void> {
  const { error } = await supabase.from('service_charge_invoices').insert({
    tenant_id: inv.tenantId, site_id: inv.siteId, amount: inv.amount, period_label: inv.periodLabel, due_date: inv.dueDate || null, status: inv.status, issued_by: inv.issuedBy,
  }); fail(error);
}

export async function fetchJobCompletions(): Promise<JobCompletion[]> {
  const { data, error } = await supabase.from('job_completions').select('*').order('created_at', { ascending: false }); fail(error);
  return (data ?? []).map(row => ({ id: row.id, requestId: row.request_id ? String(row.request_id) : undefined, ppmScheduleId: row.ppm_schedule_id ? String(row.ppm_schedule_id) : undefined, submittedBy: row.submitted_by, narrative: row.narrative, beforePhotoUrl: row.before_photo_url, afterPhotoUrl: row.after_photo_url, createdAt: row.created_at }));
}

export function subscribeJobCompletions(callback: (completions: JobCompletion[]) => void): () => void {
  const refresh = async () => callback(await fetchJobCompletions()); void refresh(); return subscribe('job_completions', refresh);
}

export async function createJobCompletion(completion: Partial<JobCompletion>): Promise<void> {
  const { error } = await supabase.from('job_completions').insert({
    request_id: completion.requestId, ppm_schedule_id: completion.ppmScheduleId, submitted_by: completion.submittedBy, narrative: completion.narrative,
    before_photo_url: completion.beforePhotoUrl, after_photo_url: completion.afterPhotoUrl,
  }); fail(error);
}

export async function fetchChecklistTemplates(): Promise<ChecklistTemplate[]> {
  const { data, error } = await supabase.from('checklist_templates').select('*').order('title'); fail(error);
  return (data ?? []).map(row => ({ id: row.id, siteId: row.site_id, title: row.title, frequency: row.frequency, daysOfWeek: (row.days_of_week ?? []) as number[], zones: row.zones, createdAt: row.created_at, updatedAt: row.updated_at }));
}

export function subscribeChecklistTemplates(callback: (templates: ChecklistTemplate[]) => void): () => void {
  const refresh = async () => callback(await fetchChecklistTemplates()); void refresh(); return subscribe('checklist_templates', refresh);
}

export async function createChecklistTemplate(template: Partial<ChecklistTemplate>): Promise<void> {
  const { error } = await supabase.from('checklist_templates').insert({ ...(template.id && { id: template.id }), site_id: template.siteId, title: template.title, frequency: template.frequency, days_of_week: template.daysOfWeek ?? [], zones: template.zones }); fail(error);
}

export async function updateChecklistTemplate(templateId: string, data: Partial<ChecklistTemplate>): Promise<void> {
  const { error } = await supabase.from('checklist_templates').update({
    ...(data.siteId !== undefined && { site_id: data.siteId }), ...(data.title !== undefined && { title: data.title }),
    ...(data.frequency !== undefined && { frequency: data.frequency }), ...(data.daysOfWeek !== undefined && { days_of_week: data.daysOfWeek }), ...(data.zones !== undefined && { zones: data.zones }),
  }).eq('id', templateId); fail(error);
}

export async function createPPMSchedule(schedule: Partial<PPMSchedule>): Promise<void> {
  const { error } = await supabase.from('ppm_schedules').insert(ppmToRow(schedule)); fail(error);
}

export async function updatePPMSchedule(scheduleId: string, data: Partial<PPMSchedule>): Promise<void> {
  const { error } = await supabase.from('ppm_schedules').update(ppmToRow(data)).eq('id', scheduleId); fail(error);
}

export async function fetchIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }); fail(error); return (data ?? []).map(incidentFromRow);
}

export function subscribeIncidents(callback: (incidents: Incident[]) => void): () => void {
  const refresh = async () => callback(await fetchIncidents()); void refresh(); return subscribe('incidents', refresh);
}

export async function createIncident(incident: Partial<Incident>): Promise<void> {
  const { error } = await supabase.from('incidents').insert(incidentToRow(incident)); fail(error);
}

export async function updateIncident(incidentId: string, data: Partial<Incident>): Promise<void> {
  const { error } = await supabase.from('incidents').update(incidentToRow(data)).eq('id', incidentId); fail(error);
}

export async function fetchPettyCash(): Promise<PettyCashEntry[]> {
  const { data, error } = await supabase.from('petty_cash_entries').select('*').order('created_at', { ascending: false }); fail(error); return (data ?? []).map(pettyFromRow);
}

export function subscribePettyCash(callback: (entries: PettyCashEntry[]) => void): () => void {
  const refresh = async () => callback(await fetchPettyCash()); void refresh(); return subscribe('petty_cash_entries', refresh);
}

export async function createPettyCashEntry(entry: Partial<PettyCashEntry>): Promise<void> {
  const { error } = await supabase.from('petty_cash_entries').insert(pettyToRow(entry)); fail(error);
}

export async function updatePettyCashEntry(entryId: string, data: Partial<PettyCashEntry>): Promise<void> {
  const { error } = await supabase.from('petty_cash_entries').update(pettyToRow(data)).eq('id', entryId); fail(error);
}

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }); fail(error); return (data ?? []).map(ticketFromRow);
}

export function subscribeSupportTickets(callback: (tickets: SupportTicket[]) => void): () => void {
  const refresh = async () => callback(await fetchSupportTickets()); void refresh(); return subscribe('support_tickets', refresh);
}

export async function createSupportTicket(ticket: Partial<SupportTicket>): Promise<void> {
  const { error } = await supabase.from('support_tickets').insert(ticketToRow(ticket)); fail(error);
}

export async function updateSupportTicket(ticketId: string, data: Partial<SupportTicket>): Promise<void> {
  const { error } = await supabase.from('support_tickets').update(ticketToRow(data)).eq('id', ticketId); fail(error);
}

// ── Reconciliation (spec §5.6) ───────────────────────────────────────────────

export async function fetchReconciliationEntries(): Promise<ReconciliationEntry[]> {
  const { data, error } = await supabase.from('reconciliation_entries').select('*').order('entry_date', { ascending: false }); fail(error);
  return (data ?? []).map(row => ({
    id: String(row.id), entryDate: String(row.entry_date), reference: String(row.reference), payee: String(row.payee),
    siteId: row.site_id ? String(row.site_id) : undefined, amount: Number(row.amount), state: row.state as ReconciliationEntry['state'],
    note: String(row.note ?? ''), recordedBy: String(row.recorded_by), createdAt: String(row.created_at),
  }));
}

export function subscribeReconciliation(callback: (entries: ReconciliationEntry[]) => void): () => void {
  const refresh = async () => callback(await fetchReconciliationEntries()); void refresh(); return subscribe('reconciliation_entries', refresh);
}

export async function createReconciliationEntry(entry: Partial<ReconciliationEntry>): Promise<void> {
  const { error } = await supabase.from('reconciliation_entries').insert({
    entry_date: entry.entryDate, reference: entry.reference, payee: entry.payee, site_id: entry.siteId ?? null,
    amount: entry.amount, state: entry.state ?? 'exception', note: entry.note ?? '', recorded_by: entry.recordedBy,
  }); fail(error);
}

export async function updateReconciliationEntry(entryId: string, data: Partial<ReconciliationEntry>): Promise<void> {
  const { error } = await supabase.from('reconciliation_entries').update({
    ...(data.state !== undefined && { state: data.state }), ...(data.note !== undefined && { note: data.note }),
  }).eq('id', entryId); fail(error);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id); fail(error);
}

export async function uploadFile(path: string, file: File): Promise<string> {
  let payload = file;
  if (file.type.startsWith('image/')) {
    try {
      const compressed = await compressImage(file, { maxSizeKB: 400, quality: 0.8 });
      if (compressed.compressedSize < file.size) payload = compressed.file;
    } catch { /* fall back to the original file */ }
  }
  const { data, error } = await supabase.storage.from('request-files').upload(path, payload, { upsert: false, contentType: payload.type }); fail(error);
  const { data: signed, error: signedError } = await supabase.storage.from('request-files').createSignedUrl(data!.path, 60 * 60 * 24 * 365); fail(signedError);
  return signed!.signedUrl;
}

/* ---------- FM monthly reports ---------- */
export interface FmReportRow { payload: Record<string, unknown>; photos: Record<string, string>; }

export async function fetchFmReport(siteId: string, period: string): Promise<FmReportRow | null> {
  const { data, error } = await supabase.from('fm_reports').select('payload, photos').eq('site_id', siteId).eq('period', period).maybeSingle();
  fail(error);
  if (!data) return null;
  return { payload: data.payload as Record<string, unknown>, photos: (data.photos as Record<string, string>) ?? {} };
}

export async function saveFmReport(siteId: string, period: string, payload: Record<string, unknown>, photos: Record<string, string>, userId?: string): Promise<void> {
  const { error } = await supabase.from('fm_reports').upsert(
    { site_id: siteId, period, payload, photos, updated_by: userId ?? null },
    { onConflict: 'site_id,period' },
  );
  fail(error);
}

/* ---------- GlassHouse Finance ledger ---------- */
import type { FinAccount, FinJournalEntry, FinJournalLine, FinContact, FinItem, FinDocument, FinBudget, FinActivity } from '../types';

export async function fetchFinAccounts(): Promise<FinAccount[]> {
  const { data, error } = await supabase.from('fin_accounts').select('*').order('code'); fail(error);
  return (data ?? []).map(r => ({ id: r.id, code: r.code, name: r.name, type: r.type, locked: r.locked }));
}
export function subscribeFinAccounts(cb: (v: FinAccount[]) => void): () => void {
  const refresh = async () => cb(await fetchFinAccounts()); void refresh(); return subscribe('fin_accounts', refresh);
}

export async function fetchFinJournal(): Promise<{ entries: FinJournalEntry[]; lines: FinJournalLine[] }> {
  const [e, l] = await Promise.all([
    supabase.from('fin_journal_entries').select('*').order('date', { ascending: false }),
    supabase.from('fin_journal_lines').select('*'),
  ]);
  fail(e.error); fail(l.error);
  return {
    entries: (e.data ?? []).map(r => ({ id: r.id, no: r.no, source: r.source, sourceId: r.source_id ?? undefined, date: r.date, ref: r.ref ?? undefined, notes: r.notes ?? undefined, status: r.status, createdBy: r.created_by, createdAt: r.created_at })),
    lines: (l.data ?? []).map(r => ({ id: r.id, entryId: r.entry_id, accountId: r.account_id, debit: Number(r.debit), credit: Number(r.credit), memo: r.memo ?? undefined })),
  };
}
export function subscribeFinJournal(cb: (v: { entries: FinJournalEntry[]; lines: FinJournalLine[] }) => void): () => void {
  const refresh = async () => cb(await fetchFinJournal()); void refresh();
  const a = subscribe('fin_journal_entries', refresh);
  const b = subscribe('fin_journal_lines', refresh);
  return () => { a(); b(); };
}

export async function fetchFinContacts(): Promise<FinContact[]> {
  const { data, error } = await supabase.from('fin_contacts').select('*').order('name'); fail(error);
  return (data ?? []).map(r => ({ id: r.id, name: r.name, type: r.type, email: r.email ?? undefined, phone: r.phone ?? undefined, address: r.address ?? undefined }));
}
export function subscribeFinContacts(cb: (v: FinContact[]) => void): () => void {
  const refresh = async () => cb(await fetchFinContacts()); void refresh(); return subscribe('fin_contacts', refresh);
}
export async function createFinContact(c: Omit<FinContact, 'id'>): Promise<void> {
  const { error } = await supabase.from('fin_contacts').insert({ name: c.name, type: c.type, email: c.email, phone: c.phone, address: c.address }); fail(error);
}
export async function updateFinContact(id: string, c: Partial<FinContact>): Promise<void> {
  const { error } = await supabase.from('fin_contacts').update({ ...(c.name !== undefined && { name: c.name }), ...(c.type !== undefined && { type: c.type }), ...(c.email !== undefined && { email: c.email }), ...(c.phone !== undefined && { phone: c.phone }), ...(c.address !== undefined && { address: c.address }) }).eq('id', id); fail(error);
}

export async function fetchFinItems(): Promise<FinItem[]> {
  const { data, error } = await supabase.from('fin_items').select('*').order('name'); fail(error);
  return (data ?? []).map(r => ({ id: r.id, name: r.name, description: r.description ?? undefined, price: Number(r.price), accountId: r.account_id ?? undefined, stock: r.stock == null ? undefined : Number(r.stock) }));
}
export function subscribeFinItems(cb: (v: FinItem[]) => void): () => void {
  const refresh = async () => cb(await fetchFinItems()); void refresh(); return subscribe('fin_items', refresh);
}
export async function upsertFinItem(item: Partial<FinItem> & { name: string }): Promise<void> {
  const { error } = await supabase.from('fin_items').upsert({ ...(item.id && { id: item.id }), name: item.name, description: item.description, price: item.price ?? 0, account_id: item.accountId || null, stock: item.stock ?? null }); fail(error);
}
export async function deleteFinItem(id: string): Promise<void> {
  const { error } = await supabase.from('fin_items').delete().eq('id', id); fail(error);
}

export async function fetchFinDocuments(kind?: string): Promise<FinDocument[]> {
  let q = supabase.from('fin_documents').select('*').order('date', { ascending: false });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q; fail(error);
  return (data ?? []).map(r => ({ id: r.id, kind: r.kind, no: r.no, date: r.date, status: r.status, contactId: r.contact_id ?? undefined, siteId: r.site_id ?? undefined, projectId: r.project_id ?? undefined, total: Number(r.total), paid: Number(r.paid), dueDate: r.due_date ?? undefined, payload: r.payload ?? {}, createdBy: r.created_by, createdAt: r.created_at }));
}
export function subscribeFinDocuments(cb: (v: FinDocument[]) => void): () => void {
  const refresh = async () => cb(await fetchFinDocuments()); void refresh(); return subscribe('fin_documents', refresh);
}

export async function fetchFinBudgets(): Promise<FinBudget[]> {
  const { data, error } = await supabase.from('fin_budgets').select('*').order('name'); fail(error);
  return (data ?? []).map(r => ({ id: r.id, name: r.name, period: r.period, lines: (r.lines as FinBudget['lines']) ?? [] }));
}
export function subscribeFinBudgets(cb: (v: FinBudget[]) => void): () => void {
  const refresh = async () => cb(await fetchFinBudgets()); void refresh(); return subscribe('fin_budgets', refresh);
}
export async function upsertFinBudget(b: Partial<FinBudget> & { name: string; period: string }): Promise<void> {
  const { error } = await supabase.from('fin_budgets').upsert({ ...(b.id && { id: b.id }), name: b.name, period: b.period, lines: b.lines ?? [] }); fail(error);
}

export async function fetchFinActivity(): Promise<FinActivity[]> {
  const { data, error } = await supabase.from('fin_activity').select('*').order('at', { ascending: false }).limit(200); fail(error);
  return (data ?? []).map(r => ({ id: r.id, actor: r.actor, action: r.action, ref: r.ref ?? undefined, at: r.at }));
}
export function subscribeFinActivity(cb: (v: FinActivity[]) => void): () => void {
  const refresh = async () => cb(await fetchFinActivity()); void refresh(); return subscribe('fin_activity', refresh);
}
export async function logFinActivity(actor: string, action: string, ref?: string): Promise<void> {
  const { error } = await supabase.from('fin_activity').insert({ actor, action, ref }); fail(error);
}

/* ---------- posting engine ---------- */
// Every document posts a balanced journal entry. Lines: [{accountId, dr, cr, memo}]
export interface PostLine { accountId: string; dr?: number; cr?: number; memo?: string }

export async function postJournal(
  meta: { no: string; source: FinJournalEntry['source']; sourceId?: string; date: string; ref?: string; notes?: string; status?: string; createdBy: string },
  lines: PostLine[],
): Promise<string> {
  const drTotal = lines.reduce((s, l) => s + (l.dr ?? 0), 0);
  const crTotal = lines.reduce((s, l) => s + (l.cr ?? 0), 0);
  if (Math.abs(drTotal - crTotal) > 0.005) throw new Error(`Journal unbalanced: DR ${drTotal} ≠ CR ${crTotal}`);
  const entryId = `je_${crypto.randomUUID()}`;
  const { error } = await supabase.from('fin_journal_entries').insert({
    id: entryId, no: meta.no, source: meta.source, source_id: meta.sourceId ?? null, date: meta.date,
    ref: meta.ref ?? null, notes: meta.notes ?? null, status: meta.status ?? 'published', created_by: meta.createdBy,
  });
  fail(error);
  const { error: lErr } = await supabase.from('fin_journal_lines').insert(
    lines.filter(l => (l.dr ?? 0) > 0 || (l.cr ?? 0) > 0).map(l => ({ entry_id: entryId, account_id: l.accountId, debit: l.dr ?? 0, credit: l.cr ?? 0, memo: l.memo ?? null })),
  );
  fail(lErr);
  return entryId;
}

export async function createFinDocument(doc: Omit<FinDocument, 'id' | 'createdAt'>, lines?: PostLine[]): Promise<string> {
  const id = `doc_${crypto.randomUUID()}`;
  const { error } = await supabase.from('fin_documents').insert({
    id, kind: doc.kind, no: doc.no, date: doc.date, status: doc.status, contact_id: doc.contactId ?? null,
    site_id: doc.siteId ?? null, project_id: doc.projectId ?? null, total: doc.total, paid: doc.paid, due_date: doc.dueDate ?? null, payload: doc.payload, created_by: doc.createdBy,
  });
  fail(error);
  if (lines?.length) await postJournal({ no: doc.no, source: doc.kind === 'journal' ? 'journal' : doc.kind as FinJournalEntry['source'], sourceId: id, date: doc.date, createdBy: doc.createdBy }, lines);
  return id;
}

export async function updateFinDocument(id: string, data: Partial<FinDocument>): Promise<void> {
  const { error } = await supabase.from('fin_documents').update({
    ...(data.status !== undefined && { status: data.status }), ...(data.paid !== undefined && { paid: data.paid }),
    ...(data.payload !== undefined && { payload: data.payload }), ...(data.dueDate !== undefined && { due_date: data.dueDate }),
    ...(data.contactId !== undefined && { contact_id: data.contactId }), ...(data.no !== undefined && { no: data.no }),
  }).eq('id', id); fail(error);
}

// Void a document: mark it void and void its journal entry (balances unwind).
export async function voidFinDocument(id: string, no: string, by: string): Promise<void> {
  const { error } = await supabase.from('fin_documents').update({ status: 'void' }).eq('id', id); fail(error);
  const { error: e2 } = await supabase.from('fin_journal_entries').update({ status: 'void' }).eq('source_id', id); fail(e2);
  await logFinActivity(by, `Voided ${no}`, id).catch(() => undefined);
}

export async function upsertFinAccount(a: { code: string; name: string; type: string }): Promise<void> {
  const { error } = await supabase.from('fin_accounts').upsert({ code: a.code, name: a.name, type: a.type }, { onConflict: 'code' }); fail(error);
}

export async function reclassifyFinLines(fromAccountId: string, toAccountId: string): Promise<void> {
  const { error } = await supabase.from('fin_journal_lines').update({ account_id: toAccountId }).eq('account_id', fromAccountId); fail(error);
}
