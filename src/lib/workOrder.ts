import type { PPMSchedule, Site, Vendor } from '../types';

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const checked = (yes: boolean) => `Yes${yes ? ' ☒' : ' ☐'}&nbsp;&nbsp;&nbsp;No${yes ? ' ☐' : ' ☒'}`;

export function workOrderDocument(input: { schedule: PPMSchedule; site?: Site; vendor?: Vendor; fmName?: string }): string {
  const { schedule: s, site, vendor, fmName } = input;
  const fmtD = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const urgent = new Date(s.nextDueDate).getTime() < Date.now();
  const description = [
    s.title,
    s.description,
    `Scheduled PPM service — due ${fmtD(s.nextDueDate)}${s.frequencyMonths ? ` · every ${s.frequencyMonths} month${s.frequencyMonths === 1 ? '' : 's'}` : ''}`,
  ].filter(Boolean).join('\n');
  const location = [site?.name, site?.address].filter(Boolean).join(', ');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Work Order — ${esc(s.title)}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#eee;display:flex;justify-content:center;padding:24px;font-size:12px}
    .page{width:794px;min-height:1000px;background:#fff;padding:56px 52px 44px;box-shadow:0 2px 12px rgba(0,0,0,.15)}
    table{width:100%;border-collapse:collapse}
    td{border:1px solid #9a9a9a;padding:8px 10px;vertical-align:top}
    .lbl{font-size:10px;color:#555;letter-spacing:.03em}
    .val{font-size:12px;font-weight:600;min-height:16px;white-space:pre-line}
    .sig{border:1px solid #9a9a9a;padding:8px 10px;height:64px;vertical-align:bottom}
    @media print{body{background:#fff;padding:0}.page{box-shadow:none;width:auto}}
    </style></head><body>
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px">
        <img src="/propel-logo.png" alt="Propel Properties &amp; Facilities Services Ltd. logo" style="width:190px;height:auto" />
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;letter-spacing:.06em">WORK ORDER REQUEST FORM</div>
          <div style="font-size:11px;font-weight:700;color:#555;margin-top:4px">PROPELPFM – FACILITY UNIT</div>
        </div>
      </div>

      <table>
        <tr>
          <td style="width:62%"><span class="lbl">Vendor Name:</span><div class="val">${esc(vendor?.name ?? '')}</div></td>
          <td style="width:38%"><span class="lbl">Date:</span><div class="val">${fmtD(new Date().toISOString())}</div></td>
        </tr>
        <tr>
          <td><span class="lbl">User Department:</span><div class="val">Facility Management</div></td>
          <td><span class="lbl">Telephone:</span><div class="val">${esc(vendor?.phone ?? '')}</div></td>
        </tr>
        <tr>
          <td><span class="lbl">Location:</span><div class="val">${esc(location)}</div></td>
          <td><span class="lbl">Urgent:</span><div class="val">${checked(urgent)}</div></td>
        </tr>
        <tr>
          <td colspan="2" style="min-height:110px"><span class="lbl">Description of Work Order Request:</span><div class="val" style="margin-top:6px">${esc(description)}</div></td>
        </tr>
        <tr>
          <td colspan="2" style="min-height:56px"><span class="lbl">Tools and Material to Be Used:</span><div class="val"></div></td>
        </tr>
        <tr>
          <td colspan="2"><span class="lbl">Mandatory PPE Required:</span><div class="val">Helmet, Goggles, Safety Shoes, Coverall, Hand Glove</div></td>
        </tr>
        <tr>
          <td colspan="2"><span class="lbl">Permit-To-Work Obtained and JSA Conducted:</span><div class="val">Yes ☒&nbsp;&nbsp;&nbsp;No ☐&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:400;color:#555">*Attach a copy of PTW to this work order.</span></div></td>
        </tr>
        <tr>
          <td colspan="2"><span class="lbl">Toolbox Topic to Be Discussed Prior to Work:</span><div class="val">Hand tools safety, Electrical safety</div></td>
        </tr>
      </table>

      <table style="margin-top:0;border-top:none">
        <tr>
          <td class="sig" style="width:33%"><span class="lbl">Facility Manager:${fmName ? ` ${esc(fmName)}` : ''}</span><div style="margin-top:22px"><span class="lbl">Signature:</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="lbl">Date:</span></div></td>
          <td class="sig" style="width:33%"><span class="lbl">Contractor Rep:</span><div style="margin-top:22px"><span class="lbl">Signature:</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="lbl">Date:</span></div></td>
          <td class="sig" style="width:34%"><span class="lbl">Security Rep:</span><div style="margin-top:22px"><span class="lbl">Signature:</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="lbl">Date:</span></div></td>
        </tr>
      </table>

      <p style="font-size:10px;color:#555;margin-top:16px;line-height:1.5"><strong>Note:</strong> *The PropelPFM-Facility Unit receives and process request work orders daily. Our overall goals are to schedule and complete these services in a safe and timely manner. To perfect our goals, each must complete a work order form and return to the Facility office.</p>
    </div>
    </body></html>`;
}

export function mailtoVendorWorkOrder(input: { schedule: PPMSchedule; site?: Site; vendor?: Vendor }) {
  const { schedule: s, site, vendor } = input;
  if (!vendor?.email) return;
  const subject = `Work Order — ${s.title} — ${site?.name ?? 'Propel facility'}`;
  const body = [
    `Dear ${vendor.contactPerson || vendor.name},`,
    '',
    `Please find attached a work order for the scheduled PPM service below.`,
    '',
    `Service: ${s.title}`,
    `Facility: ${site?.name ?? ''}${site?.address ? `, ${site.address}` : ''}`,
    `Due date: ${new Date(s.nextDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    '',
    'The work order document has been downloaded — attach it to this email before sending.',
    '',
    'Propel Properties & Facilities Services Ltd — Facility Management',
  ].join('\n');
  window.location.href = `mailto:${vendor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
