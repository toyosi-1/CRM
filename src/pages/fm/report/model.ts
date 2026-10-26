import { REPORT_LOGO } from './logo';

export type ItemStatus = 'good' | 'acceptable' | 'correction' | 'critical' | 'na';

export const STATUSES: [ItemStatus, string][] = [
  ['good', 'Good'],
  ['acceptable', 'Acceptable'],
  ['correction', 'Correction required'],
  ['critical', 'Critical'],
  ['na', 'Not applicable'],
];
export const STATUS_COLOR: Record<ItemStatus, string> = {
  good: '#2e7d50', acceptable: '#a8790f', correction: '#bf551a', critical: '#b3261e', na: '#6b7b84',
};

export interface ReportItem {
  id: string; section: string; name: string; status: ItemStatus;
  notes: string; action: string; ref: string; photos: string[];
}
export interface DieselDay { d: number; level: number | ''; qty: number | ''; rate: number | ''; }
export interface GridDay { d: number; read: number | ''; bought: number | ''; }
export interface MoneyLine { id: string; date: string; desc: string; amt: number | ''; }
export interface Invoice { id: string; task: string; vendor: string; cost: number | ''; terms: string; validity: string; status: string; }
export interface Outstanding { id: string; item: string; req: string; taken: string; }
export interface Cert { id: string; name: string; no: string; issue: string; exp: string; note: string; freq: string; }

export interface ReportState {
  v: 1;
  period: string; // YYYY-MM
  meta: { building: string; area: string; type: string; sqm: number | ''; fm: string; signer: string; issue: string; cover: string };
  items: ReportItem[];
  recurring: string[];
  diesel: { open: number | ''; budLtr: number | ''; budRate: number | ''; costRate: number | ''; days: DieselDay[] };
  grid: { open: number | ''; budKwh: number | ''; rate: number | ''; budRate: number | ''; budAmt: number | ''; vat: number | ''; days: GridDay[] };
  prev: { diesel: number | ''; grid: number | ''; total: number | ''; perM2: number | ''; day: number | ''; hour: number | '' };
  invoices: Invoice[];
  outstanding: Outstanding[];
  certs: Cert[];
  money: { openCo: number | ''; openPc: number | ''; pcReq: number | ''; coLines: MoneyLine[]; pcLines: MoneyLine[] };
}

export const uid = () => Math.random().toString(36).slice(2, 9);
export const n = (v: unknown): number => { const x = parseFloat(String(v)); return isFinite(x) ? x : 0; };
export const money = (v: unknown) => n(v).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dec = (v: unknown, d = 2) => n(v).toLocaleString('en-NG', { minimumFractionDigits: d, maximumFractionDigits: d });
export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const br = (t: unknown) => esc(t).replace(/\n/g, '<br>');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const daysIn = (p: string) => { const [y, m] = p.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const monthName = (p: string) => { const [y, m] = p.split('-').map(Number); return `${MONTHS[m - 1]}, ${y}`; };
export const nextPeriod = (p: string) => { const [y, m] = p.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
export const currentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

/* ---------- seed: standard facility sections, blank entries ---------- */
const SECTION_ITEMS: [string, string][] = [
  ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Walls'], ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Walkways (Floors / Pavements)'],
  ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Glazing (Shopfronts / Windows)'], ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Doors (Entrance / Service / Fire Escape / Delivery)'],
  ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Gate'], ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Stairs & Railings'],
  ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Paint'], ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Soil drainage'],
  ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Storm water drainage'], ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Perimeter Fencing & Walls'],
  ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Lighting'], ['EXTERNAL BUILDING & INFRASTRUCTURE', 'Accessibility (Public & Deliveries)'],
  ['ROOFS', 'Concrete'], ['ROOFS', 'Copings on parapet walls'], ['ROOFS', 'Gutters and down pipes'],
  ['ROOFS', 'Installations'], ['ROOFS', 'Beams'], ['ROOFS', 'Waterproofing'], ['ROOFS', 'Full bores/floor drains'],
  ['INTERNAL BUILDING', 'Floors & Walkways'], ['INTERNAL BUILDING', 'Ceilings'], ['INTERNAL BUILDING', 'Installations'],
  ['INTERNAL BUILDING', 'Walls'], ['INTERNAL BUILDING', 'Furniture'], ['INTERNAL BUILDING', 'Fixtures & Fittings'],
  ['INTERNAL BUILDING', 'Internet'], ['INTERNAL BUILDING', 'Stairs (Railings & Glazing)'],
  ['INTERNAL BUILDING', 'Doors (Service / Fire Escape / Delivery)'], ['INTERNAL BUILDING', 'Restrooms (Floors / Fixtures & Fittings / Ironmongery / Plumbing)'],
  ['INTERNAL BUILDING', 'Windows'], ['INTERNAL BUILDING', 'Doors'], ['INTERNAL BUILDING', 'Lighting'],
  ['INTERNAL BUILDING', 'Generator'], ['INTERNAL BUILDING', 'Diesel'], ['INTERNAL BUILDING', 'Diesel Tank'],
  ['INTERNAL BUILDING', 'Power distribution box'], ['INTERNAL BUILDING', 'Lightning protection'],
  ['INTERNAL BUILDING', 'HVAC'], ['INTERNAL BUILDING', 'Electrical System'], ['INTERNAL BUILDING', 'UPS'],
  ['FIRE & SECURITY SYSTEMS', 'Fire extinguishers'], ['FIRE & SECURITY SYSTEMS', 'Fire & Smoke Detection System'],
  ['FIRE & SECURITY SYSTEMS', 'DSTV/CCTV'], ['FIRE & SECURITY SYSTEMS', 'Access Control System'],
  ['PLUMBING / DRAINAGE / WATER FEATURES', 'Water storage tanks'], ['PLUMBING / DRAINAGE / WATER FEATURES', 'Water pumps'],
  ['PLUMBING / DRAINAGE / WATER FEATURES', 'Internal water reticulation'], ['PLUMBING / DRAINAGE / WATER FEATURES', 'External water reticulation'],
  ['PLUMBING / DRAINAGE / WATER FEATURES', 'Drainage'], ['PLUMBING / DRAINAGE / WATER FEATURES', 'Water Treatment plant'],
  ['PLUMBING / DRAINAGE / WATER FEATURES', 'Swimming pool'],
  ['GENERAL SOFT SERVICES', 'Security'], ['GENERAL SOFT SERVICES', 'Cleaning'], ['GENERAL SOFT SERVICES', 'Standard of service'],
  ['GENERAL SOFT SERVICES', 'Landscaping'], ['GENERAL SOFT SERVICES', 'Refuse Removal'], ['GENERAL SOFT SERVICES', 'Parking'],
  ['GENERAL SOFT SERVICES', 'Hygiene'], ['GENERAL SOFT SERVICES', 'Fumigation and Pest control'],
  ['ADMINISTRATION & GENERAL OPERATIONS', 'Daily, Weekly, Monthly Inspections'],
  ['ADMINISTRATION & GENERAL OPERATIONS', 'Utilities (Checked & Addressed)'],
  ['ADMINISTRATION & GENERAL OPERATIONS', 'Budget (Expense & Capex Items addressed)'],
  ['ADMINISTRATION & GENERAL OPERATIONS', 'Services & Repairs (As per Budget)'],
  ['ADMINISTRATION & GENERAL OPERATIONS', 'Insurance'],
];

const CERT_NAMES = [
  'Fire Certificate (Federal)', 'Fire Certificate (Lagos State)', 'Land Use Charge', 'Lift Certificate',
  'Certificate of Insurance', 'Parking Permit', 'National Inland Waterways Authority',
  'Environmental Management Certificate / Permit (Sewage)', 'LABSCA Post Construction Demand Notice',
  'Factories Offices and Shops Act, 1970: (ACT 328) Certificate', 'Certificate of Completion for Habitation',
  'Certificate of Installation - HVAC', 'Certificate of Installation - Lighting and Emergency Lighting',
  'Certificate of Installation - Power Distribution', 'Certificate of Installation - Plumbing and Fire System',
];

/* ---------- per-facility seeds extracted from the client templates ---------- */
import SITE_SEEDS_JSON from './siteSeeds.json';

type SeedItem = { section: string; name: string; status?: string; action?: string; ref?: string };
type SeedCert = { name: string; no?: string; issue?: string; exp?: string; note?: string; freq?: string };
const SITE_SEEDS = SITE_SEEDS_JSON as unknown as Record<string, { items?: SeedItem[] } | SeedItem[]>;

function siteSeed(building: string): { items?: SeedItem[]; certs?: SeedCert[] } | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = norm(building);
  for (const key of Object.keys(SITE_SEEDS)) {
    if (b.includes(norm(key)) || norm(key).includes(b)) {
      const raw = SITE_SEEDS[key];
      return Array.isArray(raw) ? { items: raw } : raw as { items?: SeedItem[]; certs?: SeedCert[] };
    }
  }
  return null;
}

export function seed(building: string, fmName: string, period = currentPeriod()): ReportState {
  const dd = daysIn(period);
  const [y, m] = period.split('-').map(Number);
  const tpl = siteSeed(building);
  const items = tpl?.items?.length
    ? tpl.items.map(i => ({ id: uid(), section: i.section, name: i.name, status: (i.status as ReportState['items'][number]['status']) ?? 'good', notes: '', action: i.action ?? '', ref: i.ref ?? '', photos: [] }))
    : SECTION_ITEMS.map(([section, name]) => ({ id: uid(), section, name, status: 'good' as const, notes: '', action: '', ref: '', photos: [] }));
  const certs = tpl?.certs?.length
    ? tpl.certs.map(c => ({ id: uid(), name: c.name, no: c.no ?? 'N/A', issue: c.issue ?? '', exp: c.exp ?? '', note: c.note ?? '', freq: c.freq ?? 'Annually' }))
    : CERT_NAMES.map(name => ({ id: uid(), name, no: 'N/A', issue: '', exp: '', note: '', freq: 'Annually' }));
  return {
    v: 1, period,
    meta: {
      building: building.toUpperCase(), area: '', type: '', sqm: '', fm: fmName,
      signer: '', issue: `${MONTHS[m % 12].toUpperCase()} ${m === 12 ? y + 1 : y}`, cover: '',
    },
    items,
    recurring: [],
    diesel: { open: '', budLtr: '', budRate: '', costRate: '', days: Array.from({ length: dd }, (_, i) => ({ d: i + 1, level: '', qty: '', rate: '' })) },
    grid: { open: '', budKwh: '', rate: '', budRate: '', budAmt: '', vat: 0.075, days: Array.from({ length: dd }, (_, i) => ({ d: i + 1, read: '', bought: '' })) },
    prev: { diesel: '', grid: '', total: '', perM2: '', day: '', hour: '' },
    invoices: [],
    outstanding: [],
    certs,
    money: { openCo: '', openPc: '', pcReq: '', coLines: [], pcLines: [] },
  };
}

/* ---------- calculations (same maths as the template) ---------- */
export function calc(S: ReportState) {
  const dd = daysIn(S.period), sqm = n(S.meta.sqm) || 1;
  const dRows = S.diesel.days.filter(r => r.d <= dd);
  let last = n(S.diesel.open);
  dRows.forEach(r => { if (r.level !== '' && r.level != null) last = n(r.level); });
  const bought = dRows.reduce((a, r) => a + n(r.qty), 0);
  const boughtNgn = dRows.reduce((a, r) => a + n(r.qty) * n(r.rate), 0);
  const dCons = n(S.diesel.open) - last + bought;
  const dNgn = dCons * n(S.diesel.costRate);

  const gRows = S.grid.days.filter(r => r.d <= dd);
  let gLast = n(S.grid.open);
  gRows.forEach(r => { if (r.read !== '' && r.read != null) gLast = n(r.read); });
  const gBought = gRows.reduce((a, r) => a + n(r.bought), 0);
  const gCons = n(S.grid.open) + gBought - gLast;
  const gNgn = gCons * n(S.grid.rate);
  const vat = gNgn * n(S.grid.vat);
  const gTotal = gNgn + vat;
  const total = gTotal + dNgn;
  const perM2 = total / sqm, perDay = perM2 / dd, perHour = perDay / 24;
  const pct = (a: number, b: unknown) => n(b) ? ((a - n(b)) / n(b)) * 100 : 0;
  return {
    dd, sqm, dOpen: n(S.diesel.open), dClose: last, dBought: bought, boughtNgn, dCons, dNgn,
    gOpen: n(S.grid.open), gClose: gLast, gBought, gCons, gNgn, vat, gTotal, total, perM2, perDay, perHour,
    dVar: n(S.diesel.budLtr) - dCons, gVar: n(S.grid.budKwh) - gCons,
    dBudNgn: n(S.diesel.budLtr) * n(S.diesel.budRate),
    pTotal: pct(total, S.prev.total), pGrid: pct(gCons, S.prev.grid), pDiesel: pct(dCons, S.prev.diesel),
  };
}

/** Produce the rolled-forward state for the next month. */
export function rollForward(S: ReportState): ReportState {
  const c = calc(S);
  const period = nextPeriod(S.period);
  const dd = daysIn(period);
  const [y, m] = period.split('-').map(Number);
  const next: ReportState = {
    ...S,
    period,
    prev: { diesel: +c.dCons.toFixed(2), grid: +c.gCons.toFixed(2), total: +c.total.toFixed(2), perM2: +c.perM2.toFixed(2), day: +c.perDay.toFixed(2), hour: +c.perHour.toFixed(2) },
    diesel: { ...S.diesel, open: +c.dClose.toFixed(2), days: Array.from({ length: dd }, (_, i) => ({ d: i + 1, level: i === 0 ? +c.dClose.toFixed(2) : '', qty: '', rate: '' })) },
    grid: { ...S.grid, open: +c.gClose.toFixed(2), days: Array.from({ length: dd }, (_, i) => ({ d: i + 1, read: i === 0 ? +c.gClose.toFixed(2) : '', bought: '' })) },
    money: {
      openCo: +(n(S.money.openCo) - S.money.coLines.reduce((a, r) => a + n(r.amt), 0)).toFixed(2),
      openPc: +(n(S.money.openPc) + n(S.money.pcReq) - S.money.pcLines.reduce((a, r) => a + n(r.amt), 0)).toFixed(2),
      pcReq: '', coLines: [], pcLines: [],
    },
    invoices: S.invoices.filter(r => String(r.status).toUpperCase() === 'PENDING'),
    items: S.items.map(it => ({ ...it, notes: '', photos: [] })),
    meta: { ...S.meta, issue: `${MONTHS[m % 12].toUpperCase()} ${m === 12 ? y + 1 : y}` },
  };
  return next;
}

/* ---------- printable document ---------- */
const REPORT_CSS = `
.fmr-root{font-family:Helvetica,Arial,sans-serif;color:#000;font-size:9pt}
.fmr-root table{width:100%;border-collapse:collapse}
.fmr-rt td,.fmr-rt th{border:1px solid #000;padding:3px 5px;vertical-align:top;font-size:8pt}
.fmr-rt th{background:#f2f2f2;font-size:8pt}
.fmr-rt .hdr td{background:#ffc000;text-align:center;font-weight:bold;font-size:9pt}
.fmr-rt .band td{background:#ccc0da;font-weight:bold}
.fmr-rt .cw{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-weight:bold;font-size:7pt;padding:4px 1px}
.fmr-rt .tick{text-align:center;font-size:10pt;width:22px}
.c-good{background:#ffff00}.c-acceptable{background:#92d050}.c-correction{background:#ffc000}.c-critical{background:#ff0000}.c-na{background:#00b0f0}
.fmr-rt img{max-width:100%;max-height:34mm;display:block;margin:1px 0}
.fmr-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;height:180mm}
.fmr-cover h1{font-size:15pt;letter-spacing:0;line-height:1.5;margin-bottom:8mm}
.fmr-cover img.hero{max-width:150mm;max-height:82mm;object-fit:cover}
.fmr-cover .by{margin-top:7mm;font-weight:bold;font-size:11pt}
.fmr-cover img.logo{width:60mm;margin:3mm 0 6mm}
.fmr-cover .mon{font-size:14pt;font-weight:bold}
.fmr-toc{margin:16mm auto 0;max-width:150mm}
.fmr-toc h2{font-size:11pt;margin-bottom:8mm;font-weight:normal}
.fmr-toc div{display:flex;justify-content:space-between;border-bottom:1px dotted #999;padding:4mm 0 1mm;font-size:10pt}
.fmr-ptitle{text-align:center;font-weight:bold;font-size:10pt;margin-bottom:3mm}
.fmr-kv td{border:1px solid #000;padding:3px 6px;font-size:8.5pt}
.fmr-kv td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.fmr-kv .hd td{background:#f2f2f2;font-weight:bold;text-align:center}
.fmr-fin td{padding:2px 4px;font-size:8.5pt;border:0}
.fmr-fin .u{border-bottom:1px solid #000}
.fmr-fin .uu{border-bottom:3px double #000}
.fmr-fin .n{text-align:right;font-variant-numeric:tabular-nums}
.fmr-sig{display:flex;justify-content:flex-end;gap:22mm;margin-top:12mm;font-size:8.5pt;text-align:center}
.fmr-sig div{border-top:1px solid #000;padding-top:2px;min-width:48mm}
.fmr-bars{display:flex;align-items:flex-end;gap:14mm;height:46mm;padding:6mm 10mm 0;border-bottom:1px solid #999}
.fmr-bars .b{flex:1;text-align:center;font-size:8pt}
.fmr-bars .fill{background:#4472c4;margin:0 auto;width:60%}
.fmr-pnum{text-align:right;font-size:9pt;margin-top:4mm}
.fmr-page{width:277mm;margin:0 auto 16px;padding:10mm;background:#fff;box-shadow:0 3px 10px rgba(0,0,0,.28)}
`;

export const PREVIEW_CSS = REPORT_CSS + `
.fmr-preview{background:#8d9a9f;padding:18px 0;margin:0 -16px}
@media print{
  body *{visibility:hidden}
  .fmr-print-host,.fmr-print-host *{visibility:visible}
  .fmr-print-host{position:absolute;inset:0}
  .fmr-page{page-break-after:always;width:auto;padding:0;box-shadow:none;margin:0}
  .fmr-page:last-child{page-break-after:auto}
  tr,img{page-break-inside:avoid}
  @page{size:A4 landscape;margin:9mm}
}`;

const tick = (s: ItemStatus) =>
  `<td class="tick">${s === 'good' ? '✓' : ''}</td><td class="tick">${s === 'acceptable' ? '✓' : ''}</td><td class="tick">${s === 'correction' ? '✓' : ''}</td><td class="tick">${s === 'critical' ? '✓' : ''}</td><td class="tick">${s === 'na' ? '✓' : ''}</td>`;

export function reportHtml(S: ReportState, photos: Record<string, string>): string {
  const c = calc(S), M = S.meta, per = monthName(S.period), [Y, MO] = S.period.split('-').map(Number);
  const pics = (it: ReportItem) => (it.photos || []).map(p => (photos[p] ? `<img src="${photos[p]}" alt="">` : '')).join('');
  let rows = '', curSec = '';
  S.items.forEach(it => {
    if (it.section !== curSec) { curSec = it.section; rows += `<tr class="band"><td colspan="9">${esc(curSec)}</td></tr>`; }
    rows += `<tr><td style="width:16%">${esc(it.name)}</td>${tick(it.status)}
      <td style="width:23%">${br(it.action)}</td><td style="width:14%">${pics(it)}</td><td style="width:21%">${br(it.ref)}</td></tr>`;
  });
  rows += `<tr class="band"><td colspan="9">REPAIRS AND MAINTENANCE</td></tr>` +
    S.recurring.filter(r => r.trim()).map(r => `<tr><td>${esc(r)}</td><td class="tick"></td><td class="tick"></td><td class="tick"></td><td class="tick"></td><td class="tick"></td><td></td><td></td><td></td></tr>`).join('');

  const kv = (rowsArr: [string, string][], title: string) =>
    `<table class="fmr-kv"><tr class="hd"><td colspan="2">${title}</td></tr>` + rowsArr.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + `</table>`;

  const cmp: [string, number][] = [['Total cost of electricity — grid + diesel (₦)', c.pTotal], ['Grid consumption (kWh)', c.pGrid], ['Diesel consumption (litres)', c.pDiesel]];
  const mx = Math.max(1, ...cmp.map(x => Math.abs(x[1])));
  const bars = `<div class="fmr-bars">${cmp.map(x => `<div class="b" style="display:flex;flex-direction:column;justify-content:flex-end;height:100%"><div>${dec(x[1], 2)}%</div><div class="fill" style="height:${Math.max(2, Math.abs(x[1]) / mx * 80)}%"></div></div>`).join('')}</div>
    <div style="display:flex;gap:14mm;padding:2mm 10mm">${cmp.map(x => `<div style="flex:1;text-align:center;font-size:7.5pt">${x[0]}</div>`).join('')}</div>`;

  const coTot = S.money.coLines.reduce((a, r) => a + n(r.amt), 0);
  const pcTot = S.money.pcLines.reduce((a, r) => a + n(r.amt), 0);
  const coClose = n(S.money.openCo) - coTot, pcClose = n(S.money.openPc) + n(S.money.pcReq) - pcTot;
  const last = new Date(Y, MO, 0);
  const dstr = `${String(last.getDate()).padStart(2, '0')}/${String(MO).padStart(2, '0')}/${Y}`;

  return `
  <div class="fmr-page"><div class="fmr-cover">
    <h1>FACILITIES MANAGEMENT REPORT<br>${esc(M.building)}<br>LAGOS NIGERIA</h1>
    ${M.cover ? `<img class="hero" src="${M.cover}" alt="">` : ''}
    <div class="by">PREPARED AND SUBMITTED BY:</div>
    <img class="logo" src="${REPORT_LOGO}" alt="">
    <div class="mon">${esc(M.issue)}</div>
  </div></div>

  <div class="fmr-page"><div class="fmr-toc">
    <h2>TABLE OF CONTENT</h2>
    ${['Operations Report', 'Diesel Consumption Analysis', 'General Energy Analysis', 'Invoices &amp; Approvals', 'List of Outstanding Works', 'Statutory Certificates', 'Financial Report'].map(t => `<div><span>${t}</span></div>`).join('')}
  </div></div>

  <div class="fmr-page">
    <table class="fmr-rt">
      <tr class="hdr"><td colspan="9">FACILITIES MANAGEMENT REPORT</td></tr>
      <tr><td>BUILDING:</td><td colspan="8">${esc(M.building)}</td></tr>
      <tr><td>AREA</td><td colspan="8">${esc(M.area)}</td></tr>
      <tr><td>TYPE</td><td colspan="8">${esc(M.type)}</td></tr>
      <tr><td>REPORTING PERIOD:</td><td colspan="8">${per}</td></tr>
      <tr><td>FACILITIES MANAGER:</td><td colspan="8">${esc(M.fm)}</td></tr>
      <tr><td>ITEM DESCRIPTION</td>
        <td class="c-good"><div class="cw">GOOD</div></td><td class="c-acceptable"><div class="cw">ACCEPTABLE</div></td>
        <td class="c-correction"><div class="cw">CORRECTION REQUIRED</div></td><td class="c-critical"><div class="cw">CRITICAL ITEM</div></td>
        <td class="c-na"><div class="cw">NOT APPLICABLE</div></td>
        <td>ACTION TAKEN YES / NO</td><td>PICTURES</td><td>MANAGEMENT REPORT REFERENCE</td></tr>
      ${rows}
    </table>
  </div>

  <div class="fmr-page">
    <div class="fmr-ptitle">ANALYSIS OF DIESEL CONSUMPTION FOR ${per.toUpperCase()}</div>
    ${kv([['Budgeted (Litres)', dec(S.diesel.budLtr, 0)], ['Actual Consumed (Litres)', dec(c.dCons, 0)],
      ['Variance (Litres)', dec(c.dVar, 0)], ['Budgeted Amount (NGN)', money(c.dBudNgn)],
      ['Actual Amount Spent (NGN)', money(c.dNgn)], ['Budgeted cost/Litre (NGN)', dec(S.diesel.budRate, 0)],
      ['Actual cost/Litre (NGN)', dec(S.diesel.costRate, 0)], ['Actual Purchased (Litres)', dec(c.dBought, 0)],
      ['Actual Purchased (NGN)', money(c.boughtNgn)]], 'DIESEL')}
  </div>

  <div class="fmr-page">
    ${kv([['Diesel Opening Stock (Ltrs)', dec(c.dOpen)], ['Diesel Supplied (Ltrs)', dec(c.dBought)],
      ['Diesel Closing Stock (Ltrs)', dec(c.dClose)], ['Diesel Consumed (Litres)', dec(c.dCons)],
      ['Diesel Consumed (NGN)', money(c.dNgn)], ['Grid Electricity Consumed (Kwh)', dec(c.gCons)],
      ['Grid Electricity Consumed (NGN)', money(c.gNgn)], ['Total Energy cost + VAT (NGN)', money(c.gTotal)],
      ['Total Cost of Energy Grid + Diesel (NGN)', money(c.total)],
      ['Monthly Cost of Energy/m² Grid + Diesel (NGN)', money(c.perM2)],
      ['Daily Cost of Energy/m² Grid + Diesel (NGN)', money(c.perDay)],
      ['Hourly Cost of Energy/m² Grid + Diesel (NGN)', money(c.perHour)]],
      'ENERGY ANALYSIS FOR ' + per.toUpperCase())}
    ${kv([['Diesel Consumed (Ltrs) — previous month', dec(S.prev.diesel)], ['Grid Consumed (Kwh) — previous month', dec(S.prev.grid)],
      ['Total Cost of Energy Grid + Diesel (NGN) — this month', money(c.total)],
      ['Total Cost of Energy Grid + Diesel (NGN) — previous month', money(S.prev.total)],
      ['Average Monthly Cost of Energy/m² — this month', money(c.perM2)],
      ['Average Monthly Cost of Energy/m² — previous month', money(S.prev.perM2)],
      ['Daily Cost of Energy/m² — previous month', money(S.prev.day)],
      ['Hourly Cost of Energy/m² — previous month', money(S.prev.hour)],
      ['Total cost of electricity — grid + diesel (%)', dec(c.pTotal)],
      ['Grid consumption — kWh (%)', dec(c.pGrid)], ['Diesel consumption — litres (%)', dec(c.pDiesel)]],
      'CONSUMPTION PERCENTILE COMPARISON')}
    ${bars}
  </div>

  <div class="fmr-page">
    <div class="fmr-ptitle">INVOICES FOR THE LANDLORD APPROVAL (${MONTHS[MO - 1].toUpperCase()})</div>
    <table class="fmr-rt"><tr><th>Task</th><th>Vendor</th><th>Cost (NGN)</th><th>Payment Terms</th><th>Validity</th><th>Payment Status</th></tr>
      ${S.invoices.map(r => `<tr><td>${esc(r.task)}</td><td>${esc(r.vendor)}</td><td style="text-align:right">${money(r.cost)}</td><td>${esc(r.terms)}</td><td>${esc(r.validity)}</td><td>${esc(r.status)}</td></tr>`).join('')}
      <tr><td colspan="2"><b>Total</b></td><td style="text-align:right"><b>${money(S.invoices.reduce((a, r) => a + n(r.cost), 0))}</b></td><td colspan="3"></td></tr>
    </table>
  </div>

  <div class="fmr-page">
    <div class="fmr-ptitle">LIST OF OUTSTANDING WORKS AS AT ${dstr}</div>
    <table class="fmr-rt"><tr><th>Item</th><th>Action Required</th><th>Action Taken</th></tr>
      ${S.outstanding.map(r => `<tr><td>${esc(r.item)}</td><td>${esc(r.req)}</td><td>${br(r.taken)}</td></tr>`).join('')}
    </table>
  </div>

  <div class="fmr-page">
    <div class="fmr-ptitle">STATUTORY CERTIFICATES / PERMITS</div>
    <table class="fmr-rt"><tr><th>Certificate / Permit</th><th>Number</th><th>Issued</th><th>Expires</th><th>Comments</th><th>Frequency</th></tr>
      ${S.certs.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.no)}</td><td>${esc(r.issue)}</td><td>${esc(r.exp)}</td><td>${esc(r.note)}</td><td>${esc(r.freq)}</td></tr>`).join('')}
    </table>
  </div>

  <div class="fmr-page">
    <div class="fmr-ptitle">FINANCIAL REPORT FOR ${per.toUpperCase()}</div>
    <table class="fmr-rt"><tr><th>Date</th><th>Description</th><th>Amount (NGN)</th></tr>
      <tr><td></td><td><b>Opening balance — company account</b></td><td style="text-align:right"><b>${money(S.money.openCo)}</b></td></tr>
      ${S.money.coLines.map(r => `<tr><td>${esc(r.date)}</td><td>${esc(r.desc)}</td><td style="text-align:right">${money(r.amt)}</td></tr>`).join('')}
      <tr><td></td><td><b>Total payments</b></td><td style="text-align:right"><b>${money(coTot)}</b></td></tr>
      <tr><td></td><td><b>Closing balance</b></td><td style="text-align:right"><b>${money(coClose)}</b></td></tr>
      <tr><td></td><td><b>Petty cash — opening</b></td><td style="text-align:right"><b>${money(S.money.openPc)}</b></td></tr>
      <tr><td></td><td>Petty cash requested</td><td style="text-align:right">${money(S.money.pcReq)}</td></tr>
      ${S.money.pcLines.map(r => `<tr><td>${esc(r.date)}</td><td>${esc(r.desc)}</td><td style="text-align:right">${money(r.amt)}</td></tr>`).join('')}
      <tr><td></td><td><b>Total petty cash spend</b></td><td style="text-align:right"><b>${money(pcTot)}</b></td></tr>
      <tr><td></td><td><b>Closing petty cash</b></td><td style="text-align:right"><b>${money(pcClose)}</b></td></tr>
      <tr><td></td><td><b>Total closing balance</b></td><td style="text-align:right"><b>${money(coClose + pcClose)}</b></td></tr>
    </table>
    <div class="fmr-sig">
      <div>Prepared by — ${esc(M.fm)}</div>
      <div>Countersigned — ${esc(M.signer)}</div>
    </div>
  </div>`;
}

export function fullDocument(S: ReportState, photos: Record<string, string>): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>FM Report ${S.period} — ${esc(S.meta.building)}</title>
<style>${REPORT_CSS}@media print{.fmr-page{page-break-after:always;width:auto;padding:0;box-shadow:none;margin:0}.fmr-page:last-child{page-break-after:auto}tr,img{page-break-inside:avoid}@page{size:A4 landscape;margin:9mm}}</style>
</head><body><div class="fmr-root">${reportHtml(S, photos)}</div></body></html>`;
}
