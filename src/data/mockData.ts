import type {
  User, Site, Vendor, Asset, MaintenanceRequest, Checklist,
  TreasuryEntry, AuditEntry
} from '../types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Amara Osei', email: 'amara@facilityops.com', role: 'facility_manager', siteId: 's1', department: 'Operations', avatar: 'AO' },
  { id: 'u2', name: 'Kwame Mensah', email: 'kwame@facilityops.com', role: 'facility_manager', siteId: 's2', department: 'Operations', avatar: 'KM' },
  { id: 'u3', name: 'Chioma Eze', email: 'chioma@facilityops.com', role: 'procurement', department: 'Procurement', avatar: 'CE' },
  { id: 'u4', name: 'Bola Adeyemi', email: 'bola@facilityops.com', role: 'supervisor', department: 'Management', avatar: 'BA' },
  { id: 'u5', name: 'Tunde Fashola', email: 'tunde@facilityops.com', role: 'finance', department: 'Finance', avatar: 'TF' },
  { id: 'u6', name: 'Ngozi Okonkwo', email: 'ngozi@facilityops.com', role: 'admin', department: 'Administration', avatar: 'NO' },
];

export const MOCK_SITES: Site[] = [
  {
    id: 's1', name: 'Lagos Head Office', address: '14 Marina Street, Lagos Island, Lagos',
    size: '12,500 sqft', contactName: 'Amara Osei', contactPhone: '+234 801 234 5678',
    contactEmail: 'amara@facilityops.com', pettyCashEnabled: true, floatLimit: 150000,
    monthlyBudget: 2500000, currentMonthSpend: 1850000,
    slaExpiryDate: '2026-12-31', createdAt: '2024-01-15',
  },
  {
    id: 's2', name: 'Abuja Regional Office', address: '7 Gana Street, Maitama, Abuja',
    size: '8,200 sqft', contactName: 'Kwame Mensah', contactPhone: '+234 802 345 6789',
    contactEmail: 'kwame@facilityops.com', pettyCashEnabled: true, floatLimit: 100000,
    monthlyBudget: 1800000, currentMonthSpend: 1200000,
    slaExpiryDate: '2026-09-30', createdAt: '2024-03-01',
  },
  {
    id: 's3', name: 'Port Harcourt Depot', address: '22 Aba Road, Port Harcourt, Rivers',
    size: '25,000 sqft', contactName: 'Emeka Nwosu', contactPhone: '+234 803 456 7890',
    contactEmail: 'emeka@facilityops.com', pettyCashEnabled: false, floatLimit: 50000,
    monthlyBudget: 3200000, currentMonthSpend: 2980000,
    slaExpiryDate: '2026-06-30', createdAt: '2024-02-10',
  },
];

export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'v1', name: 'TechFix Solutions Ltd', category: 'Electrical', type: 'recurring',
    bankName: 'First Bank', accountNumber: '3012345678', accountName: 'TechFix Solutions Ltd',
    totalJobsCompleted: 34, totalAmountPaid: 8450000, avgCompletionDays: 2.3,
    lastJobDate: '2026-03-10', riskScore: 'low', createdAt: '2024-01-20',
  },
  {
    id: 'v2', name: 'CoolAir HVAC Services', category: 'HVAC', type: 'recurring',
    bankName: 'GTBank', accountNumber: '0123456789', accountName: 'CoolAir HVAC Services',
    totalJobsCompleted: 18, totalAmountPaid: 5200000, avgCompletionDays: 3.1,
    lastJobDate: '2026-03-05', riskScore: 'low', createdAt: '2024-02-15',
  },
  {
    id: 'v3', name: 'SwiftGen Power Ltd', category: 'Generator', type: 'recurring',
    bankName: 'Zenith Bank', accountNumber: '2234567890', accountName: 'SwiftGen Power Ltd',
    totalJobsCompleted: 52, totalAmountPaid: 14200000, avgCompletionDays: 1.5,
    lastJobDate: '2026-03-14', riskScore: 'medium', createdAt: '2023-11-01',
  },
  {
    id: 'v4', name: 'ProClean Facilities', category: 'Cleaning', type: 'one_time',
    bankName: 'Access Bank', accountNumber: '0987654321', accountName: 'ProClean Facilities',
    totalJobsCompleted: 5, totalAmountPaid: 750000, avgCompletionDays: 4.8,
    lastJobDate: '2026-02-20', riskScore: 'high', createdAt: '2025-08-10',
  },
  {
    id: 'v5', name: 'Concrete & Civil Works', category: 'Civil', type: 'one_time',
    bankName: 'UBA', accountNumber: '1122334455', accountName: 'Concrete & Civil Works',
    totalJobsCompleted: 8, totalAmountPaid: 22000000, avgCompletionDays: 14.2,
    lastJobDate: '2026-01-15', riskScore: 'medium', createdAt: '2024-05-12',
  },
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'a1', name: 'Perkins 500KVA Generator', siteId: 's1',
    installationDate: '2021-06-15', lastRepairDate: '2026-02-10',
    totalRepairCost: 1250000, status: 'operational',
    maintenanceHistory: [
      { id: 'mh1', date: '2026-02-10', description: 'Oil change & filter replacement', cost: 85000, vendorId: 'v3' },
      { id: 'mh2', date: '2025-11-05', description: 'Full service overhaul', cost: 420000, vendorId: 'v3' },
    ],
  },
  {
    id: 'a2', name: 'Carrier 15-Ton Chiller Unit', siteId: 's1',
    installationDate: '2020-03-22', lastRepairDate: '2026-01-28',
    totalRepairCost: 680000, status: 'operational',
    maintenanceHistory: [
      { id: 'mh3', date: '2026-01-28', description: 'Refrigerant recharge', cost: 180000, vendorId: 'v2' },
    ],
  },
  {
    id: 'a3', name: 'Schneider UPS 80KVA', siteId: 's2',
    installationDate: '2022-09-01', lastRepairDate: '2025-12-15',
    totalRepairCost: 320000, status: 'under_repair',
    maintenanceHistory: [
      { id: 'mh4', date: '2025-12-15', description: 'Battery bank replacement', cost: 320000, vendorId: 'v1' },
    ],
  },
  {
    id: 'a4', name: 'Fire Suppression System', siteId: 's3',
    installationDate: '2019-11-12', lastRepairDate: '2025-09-20',
    totalRepairCost: 950000, status: 'operational',
    maintenanceHistory: [],
  },
];

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

const buildTrail = (entries: Omit<AuditEntry, 'id' | 'requestId'>[], reqId: string): AuditEntry[] =>
  entries.map((e, i) => ({ ...e, id: `ae-${reqId}-${i}`, requestId: reqId }));

export const MOCK_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'req1', requestNumber: 'REQ-2026-0041',
    siteId: 's1', siteName: 'Lagos Head Office',
    submittedBy: 'u1', submittedByName: 'Amara Osei',
    description: 'Generator fuel injector fault causing intermittent power cuts to server room. Urgent intervention needed.',
    priority: 'critical', status: 'SUPERVISOR_APPROVAL',
    vendorId: 'v3', vendorName: 'SwiftGen Power Ltd', vendorType: 'recurring',
    invoiceAmount: 480000,
    assetId: 'a1', assetName: 'Perkins 500KVA Generator',
    purchaseOrder: {
      id: 'po1', poNumber: 'PO-2026-0041', requestId: 'req1',
      vendorId: 'v3', description: 'Generator fuel injector replacement + labour',
      amount: 480000, generatedBy: 'Chioma Eze', generatedAt: hoursAgo(18),
    },
    isBudgetWarning: false,
    slaDeadline: hoursAgo(-2), slaBreached: true,
    createdAt: daysAgo(3), updatedAt: hoursAgo(18),
    auditTrail: buildTrail([
      { userId: 'u1', userName: 'Amara Osei', userRole: 'facility_manager', department: 'Operations', action: 'Request created', timestamp: daysAgo(3), tatHours: 0 },
      { userId: 'u3', userName: 'Chioma Eze', userRole: 'procurement', department: 'Procurement', action: 'Invoice verified — vendor approved for PO generation', timestamp: daysAgo(2), tatHours: 24 },
      { userId: 'u3', userName: 'Chioma Eze', userRole: 'procurement', department: 'Procurement', action: 'Purchase Order PO-2026-0041 generated', timestamp: hoursAgo(18), tatHours: 6 },
    ], 'req1'),
  },
  {
    id: 'req2', requestNumber: 'REQ-2026-0039',
    siteId: 's1', siteName: 'Lagos Head Office',
    submittedBy: 'u1', submittedByName: 'Amara Osei',
    description: 'HVAC unit on 3rd floor not cooling. Compressor suspected fault. Staff complaints received.',
    priority: 'high', status: 'PAYMENT_PENDING',
    vendorId: 'v2', vendorName: 'CoolAir HVAC Services', vendorType: 'recurring',
    invoiceAmount: 320000,
    taxType: '5pct_wht', grossAmount: 320000, taxAmount: 16000, netPayment: 304000,
    assetId: 'a2', assetName: 'Carrier 15-Ton Chiller Unit',
    purchaseOrder: {
      id: 'po2', poNumber: 'PO-2026-0039', requestId: 'req2',
      vendorId: 'v2', description: 'HVAC compressor repair + gas recharge',
      amount: 320000, generatedBy: 'Chioma Eze', generatedAt: daysAgo(4),
    },
    isBudgetWarning: false,
    slaDeadline: hoursAgo(5), slaBreached: true,
    createdAt: daysAgo(6), updatedAt: daysAgo(2),
    auditTrail: buildTrail([
      { userId: 'u1', userName: 'Amara Osei', userRole: 'facility_manager', department: 'Operations', action: 'Request created', timestamp: daysAgo(6), tatHours: 0 },
      { userId: 'u3', userName: 'Chioma Eze', userRole: 'procurement', department: 'Procurement', action: 'Invoice verified and PO generated', timestamp: daysAgo(5), tatHours: 8 },
      { userId: 'u4', userName: 'Bola Adeyemi', userRole: 'supervisor', department: 'Management', action: 'Request approved — proceed to payment', timestamp: daysAgo(3), tatHours: 48 },
      { userId: 'u5', userName: 'Tunde Fashola', userRole: 'finance', department: 'Finance', action: 'Tax calculated: 5% WHT = ₦16,000. Net payable: ₦304,000', timestamp: daysAgo(2), tatHours: 24 },
    ], 'req2'),
  },
  {
    id: 'req3', requestNumber: 'REQ-2026-0038',
    siteId: 's2', siteName: 'Abuja Regional Office',
    submittedBy: 'u2', submittedByName: 'Kwame Mensah',
    description: 'Plumbing burst in male restroom, 2nd floor. Water damage to flooring. Requires immediate attention.',
    priority: 'high', status: 'PROCUREMENT_REVIEW',
    vendorId: 'v4', vendorName: 'ProClean Facilities', vendorType: 'one_time',
    invoiceAmount: 185000,
    isBudgetWarning: false,
    slaDeadline: hoursAgo(-6), slaBreached: false,
    createdAt: daysAgo(1), updatedAt: daysAgo(1),
    auditTrail: buildTrail([
      { userId: 'u2', userName: 'Kwame Mensah', userRole: 'facility_manager', department: 'Operations', action: 'Request created — marked high priority', timestamp: daysAgo(1), tatHours: 0 },
    ], 'req3'),
  },
  {
    id: 'req4', requestNumber: 'REQ-2026-0036',
    siteId: 's3', siteName: 'Port Harcourt Depot',
    submittedBy: 'u1', submittedByName: 'Amara Osei',
    description: 'Routine office repainting — 4th floor executive wing. Scheduled PPM.',
    priority: 'low', status: 'PAID',
    vendorId: 'v4', vendorName: 'ProClean Facilities', vendorType: 'one_time',
    invoiceAmount: 750000,
    taxType: '10pct_wht', grossAmount: 750000, taxAmount: 75000, netPayment: 675000,
    purchaseOrder: {
      id: 'po3', poNumber: 'PO-2026-0036', requestId: 'req4',
      vendorId: 'v4', description: 'Executive wing repainting — 4th floor',
      amount: 750000, generatedBy: 'Chioma Eze', generatedAt: daysAgo(14),
    },
    paymentReceiptUrl: 'receipt_req4.pdf',
    isBudgetWarning: false,
    slaDeadline: daysAgo(5), slaBreached: false,
    createdAt: daysAgo(18), updatedAt: daysAgo(7),
    auditTrail: buildTrail([
      { userId: 'u1', userName: 'Amara Osei', userRole: 'facility_manager', department: 'Operations', action: 'Request created — PPM repainting', timestamp: daysAgo(18), tatHours: 0 },
      { userId: 'u3', userName: 'Chioma Eze', userRole: 'procurement', department: 'Procurement', action: 'PO-2026-0036 generated', timestamp: daysAgo(15), tatHours: 72 },
      { userId: 'u4', userName: 'Bola Adeyemi', userRole: 'supervisor', department: 'Management', action: 'Approved for payment', timestamp: daysAgo(13), tatHours: 48 },
      { userId: 'u5', userName: 'Tunde Fashola', userRole: 'finance', department: 'Finance', action: 'Payment processed — 10% WHT applied. Receipt uploaded.', timestamp: daysAgo(7), tatHours: 144 },
    ], 'req4'),
  },
  {
    id: 'req5', requestNumber: 'REQ-2026-0035',
    siteId: 's1', siteName: 'Lagos Head Office',
    submittedBy: 'u1', submittedByName: 'Amara Osei',
    description: 'Main entrance sliding door motor failure. Security risk — door stuck open.',
    priority: 'critical', status: 'ADMIN_APPROVED',
    vendorId: 'v1', vendorName: 'TechFix Solutions Ltd', vendorType: 'recurring',
    invoiceAmount: 210000,
    isEmergencyBypass: true,
    isBudgetWarning: true,
    slaDeadline: hoursAgo(-1), slaBreached: false,
    createdAt: hoursAgo(6), updatedAt: hoursAgo(4),
    auditTrail: buildTrail([
      { userId: 'u1', userName: 'Amara Osei', userRole: 'facility_manager', department: 'Operations', action: 'Emergency request created — sliding door motor failure', timestamp: hoursAgo(6), tatHours: 0 },
      { userId: 'u6', userName: 'Ngozi Okonkwo', userRole: 'admin', department: 'Administration', action: '⚡ EMERGENCY BYPASS ACTIVATED — Admin override applied. Routed directly to Payment.', timestamp: hoursAgo(4), tatHours: 2 },
    ], 'req5'),
  },
  {
    id: 'req6', requestNumber: 'REQ-2026-0033',
    siteId: 's2', siteName: 'Abuja Regional Office',
    submittedBy: 'u2', submittedByName: 'Kwame Mensah',
    description: 'External perimeter fencing repair — section 3 damaged by vehicle impact.',
    priority: 'medium', status: 'REJECTED',
    vendorId: 'v5', vendorName: 'Concrete & Civil Works', vendorType: 'one_time',
    invoiceAmount: 1200000,
    rejectionComment: 'Invoice amount exceeds approved vendor rate card. Vendor must re-submit with revised pricing. Previous quote was ₦850,000.',
    isBudgetWarning: true,
    slaDeadline: daysAgo(2), slaBreached: true,
    createdAt: daysAgo(10), updatedAt: daysAgo(5),
    auditTrail: buildTrail([
      { userId: 'u2', userName: 'Kwame Mensah', userRole: 'facility_manager', department: 'Operations', action: 'Request created', timestamp: daysAgo(10), tatHours: 0 },
      { userId: 'u3', userName: 'Chioma Eze', userRole: 'procurement', department: 'Procurement', action: 'PO generated pending supervisor review', timestamp: daysAgo(8), tatHours: 48 },
      { userId: 'u4', userName: 'Bola Adeyemi', userRole: 'supervisor', department: 'Management', action: 'REJECTED — Invoice exceeds vendor rate card. Re-submission required.', comment: 'Invoice amount exceeds approved vendor rate card.', timestamp: daysAgo(5), tatHours: 72 },
    ], 'req6'),
  },
];

export const MOCK_CHECKLISTS: Checklist[] = [
  {
    id: 'cl1', title: 'Generator Daily Walkaround', siteId: 's1',
    type: 'generator_walkaround', submittedToAdmin: true,
    completedBy: 'u1', completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    items: [
      { id: 'i1', label: 'Check fuel level (minimum 75%)', checked: true, timestamp: hoursAgo(2) },
      { id: 'i2', label: 'Inspect coolant level', checked: true, timestamp: hoursAgo(2) },
      { id: 'i3', label: 'Check oil level and quality', checked: true, timestamp: hoursAgo(2) },
      { id: 'i4', label: 'Test manual start sequence', checked: true, timestamp: hoursAgo(2) },
      { id: 'i5', label: 'Inspect exhaust for abnormal smoke', checked: false },
      { id: 'i6', label: 'Check battery terminals for corrosion', checked: true, timestamp: hoursAgo(2) },
      { id: 'i7', label: 'Verify auto-changeover switch operation', checked: false },
    ],
  },
  {
    id: 'cl2', title: 'Weekly Facility Inspection', siteId: 's1',
    type: 'facility_inspection', submittedToAdmin: false,
    createdAt: daysAgo(2),
    items: [
      { id: 'i8', label: 'Inspect all fire exits are unobstructed', checked: true, timestamp: daysAgo(2) },
      { id: 'i9', label: 'Check all fire extinguishers are mounted', checked: true, timestamp: daysAgo(2) },
      { id: 'i10', label: 'Verify CCTV cameras operational', checked: false },
      { id: 'i11', label: 'Inspect roof for leaks or damage', checked: true, timestamp: daysAgo(2) },
      { id: 'i12', label: 'Check all door locks and access control', checked: false },
      { id: 'i13', label: 'Verify elevator inspection certificate current', checked: true, timestamp: daysAgo(2) },
    ],
  },
  {
    id: 'cl3', title: 'Monthly Safety Inspection', siteId: 's2',
    type: 'safety_inspection', submittedToAdmin: true,
    completedBy: 'u2', completedAt: daysAgo(5),
    createdAt: daysAgo(5),
    items: [
      { id: 'i14', label: 'Test all smoke detectors', checked: true, timestamp: daysAgo(5) },
      { id: 'i15', label: 'Inspect fire suppression system pressure', checked: true, timestamp: daysAgo(5) },
      { id: 'i16', label: 'Check emergency lighting batteries', checked: true, timestamp: daysAgo(5) },
      { id: 'i17', label: 'Verify first aid kit stocked', checked: true, timestamp: daysAgo(5) },
      { id: 'i18', label: 'Inspect electrical panels for hazards', checked: true, timestamp: daysAgo(5) },
    ],
  },
];

export const MOCK_TREASURY: TreasuryEntry[] = [
  { id: 'tr1', description: 'Rental income — ground floor retail space', source: 'Retail Tenant A', amount: 850000, type: 'inflow', date: daysAgo(5), recordedBy: 'Ngozi Okonkwo' },
  { id: 'tr2', description: 'Billboard advertising revenue — Q1', source: 'AdVision Media', amount: 450000, type: 'inflow', date: daysAgo(10), recordedBy: 'Ngozi Okonkwo' },
  { id: 'tr3', description: 'Event space rental — conference room', source: 'Sterling Corp Ltd', amount: 200000, type: 'inflow', date: daysAgo(15), recordedBy: 'Tunde Fashola' },
  { id: 'tr4', description: 'Parking levy income — monthly', source: 'Staff Parking', amount: 120000, type: 'inflow', date: daysAgo(3), recordedBy: 'Tunde Fashola' },
  { id: 'tr5', description: 'Annual facility insurance premium', source: 'AIICO Insurance', amount: 1200000, type: 'outflow', date: daysAgo(20), recordedBy: 'Ngozi Okonkwo' },
];
