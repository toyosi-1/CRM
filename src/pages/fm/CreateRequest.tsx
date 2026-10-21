import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Send, Camera, FileCheck, FileText, Receipt, Info, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Priority, VendorType } from '../../types';
import { formatCurrency, formatDate, compareFloors, normalizeFloor, vendorLabel } from '../../utils/helpers';
import ImageUpload from '../../components/shared/ImageUpload';
import { formatFileSize } from '../../utils/imageCompression';

const REQUEST_CATEGORIES = ['HVAC', 'Water treatment', 'Generator', 'Electrical', 'Plumbing', 'Cleaning', 'Security', 'Lift maintenance', 'Civil works', 'Other'];

export default function CreateRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, vendors, assets, sites, requests, incidents, createRequest, activeSiteId, facilityVendorSLAs } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const site = sites.find(s => s.id === siteId);
  const siteAssets = assets.filter(a => a.siteId === siteId);

  const [form, setForm] = useState({
    description: searchParams.get('prefill') ?? '',
    details: '',
    category: '',
    customCategory: '',
    floor: '',
    customFloor: '',
    space: '',
    priority: 'medium' as Priority,
    slaAvailable: false,
    vendorId: '',
    oneTimeVendorName: '',
    oneTimeVendorContact: '',
    oneTimeVendorPhone: '',
    oneTimeVendorBank: '',
    oneTimeVendorAccount: '',
    oneTimeVendorAccountName: '',
    oneTimeVendorNotes: '',
    vendorType: 'recurring' as VendorType,
    invoiceAmount: '',
    assetId: searchParams.get('asset') ?? '',
    isIncident: false,
    linkedIncidentId: '',
  });
  const [compressedImages, setCompressedImages] = useState<Array<{ file: File; originalSize: number; compressedSize: number; reduction: number }>>([]);
  const [quoteFile, setQuoteFile] = useState<File | null>(null);

  const selectedAsset = assets.find(a => a.id === form.assetId);
  const openIncidents = incidents.filter(i => i.siteId === siteId && (i.status === 'open' || i.status === 'investigating'));
  const derivedFloor = form.floor || selectedAsset?.floor || '';
  const derivedSpace = form.space || selectedAsset?.location || '';
  const floorOptions = useMemo(() => Array.from(new Set(siteAssets.map(asset => asset.floor).filter((f): f is string => Boolean(f)).map(normalizeFloor))).sort(compareFloors), [siteAssets]);
  const siteSLAs = facilityVendorSLAs.filter(sla =>
    sla.siteId === siteId &&
    !sla.suspended &&
    (!form.category || sla.category === form.category) &&
    (!sla.expiryDate || new Date(sla.expiryDate) >= new Date(new Date().toDateString()))
  );
  const slaVendorIds = new Set(siteSLAs.map(sla => sla.vendorId));
  const slaVendors = vendors.filter(v => v.type === 'recurring' && slaVendorIds.has(v.id));
  const availableVendors = form.slaAvailable ? slaVendors : vendors;
  const effectiveVendorId = form.slaAvailable && slaVendors.length === 1 ? slaVendors[0].id : form.vendorId;
  const selectedVendor = vendors.find(v => v.id === effectiveVendorId);
  const remaining = site ? site.monthlyBudget - site.currentMonthSpend : 0;
  const invoiceAmt = parseFloat(form.invoiceAmount.replace(/,/g, '')) || 0;
  const budgetWarning = invoiceAmt > 0 && invoiceAmt > remaining;
  const vendorReady = form.vendorType === 'recurring'
    ? Boolean(effectiveVendorId)
    : Boolean(form.oneTimeVendorName.trim() && form.oneTimeVendorBank.trim() && form.oneTimeVendorAccount.trim() && form.oneTimeVendorAccountName.trim());

  // Price history: previous paid jobs with this vendor
  const priceHistory = requests
    .filter(r => r.vendorId === effectiveVendorId && (r.grossAmount ?? r.invoiceAmount ?? 0) > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const lastPrice = priceHistory[0] ? (priceHistory[0].grossAmount ?? priceHistory[0].invoiceAmount ?? 0) : 0;
  const priceDelta = lastPrice > 0 && invoiceAmt > 0 ? Math.round(((invoiceAmt - lastPrice) / lastPrice) * 100) : null;

  const handleSubmit = async () => {
    if (!form.description.trim()) return;
    const totalSaved = compressedImages.reduce((acc, img) => acc + (img.originalSize - img.compressedSize), 0);
    await createRequest({
      description: form.description + (form.details ? `\n\n${form.details}` : ''),
      category: form.category === 'Other' ? form.customCategory.trim() : form.category,
      location: [(derivedFloor === 'Other' ? form.customFloor : derivedFloor), derivedSpace].filter(Boolean).join(' — ') || '',
      priority: form.priority,
      slaAvailable: form.slaAvailable,
      vendorId: form.vendorType === 'recurring' ? effectiveVendorId || undefined : undefined,
      vendorName: form.vendorType === 'recurring' ? selectedVendor?.name : form.oneTimeVendorName.trim(),
      vendorType: form.vendorType,
      oneTimeVendor: form.vendorType === 'one_time' ? {
        name: form.oneTimeVendorName.trim(),
        contactPerson: form.oneTimeVendorContact.trim(),
        phone: form.oneTimeVendorPhone.trim(),
        bankName: form.oneTimeVendorBank.trim(),
        accountNumber: form.oneTimeVendorAccount.trim(),
        accountName: form.oneTimeVendorAccountName.trim(),
        notes: form.oneTimeVendorNotes.trim(),
      } : undefined,
      invoiceAmount: invoiceAmt || undefined,
      assetId: form.assetId || undefined,
      assetName: selectedAsset?.name,
      isBudgetWarning: budgetWarning,
      isIncident: form.isIncident,
      linkedIncidentId: form.isIncident && form.linkedIncidentId ? form.linkedIncidentId : undefined,
      attachmentFiles: [
        ...compressedImages.map(img => ({ file: img.file, originalSize: img.originalSize, compressedSize: img.compressedSize })),
        ...(quoteFile ? [{ file: new File([quoteFile], `QUOTE-${quoteFile.name}`, { type: quoteFile.type }), originalSize: quoteFile.size, compressedSize: quoteFile.size }] : []),
      ],
      storageSaved: totalSaved,
    });
    navigate('/fm/requests');
  };

  const cardStyle = { padding: '14px 15px' } as const;
  const stepBadge = (n: number) => <span className="badge b-neu">Step {n} of 4</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1400 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <button className="btn-ghost" onClick={() => navigate('/fm/requests')}><ArrowLeft size={13} aria-hidden="true" /> Back</button>
        <div className="card-title" style={{ fontSize: 14 }}>Log new request</div>
        <span className="badge b-neu">{site?.name ?? 'Site'} · draft</span>
      </div>

      <div className="row2" style={{ alignItems: 'flex-start' }}>
        {/* ══ LEFT — form steps ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Step 1 — Fault details */}
          <div className="card" style={cardStyle}>
            <div className="card-hd"><div><div className="card-title">Fault details</div></div>{stepBadge(1)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-field">
                <label>Short description <span className="req">*</span></label>
                <input className="inp" type="text" placeholder="e.g. AC compressor fault — Floor 2 Unit A"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="form-field">
                <label>Additional information</label>
                <textarea className="inp ta" placeholder="Symptoms, impact on operations, access notes…"
                  value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} />
              </div>
              <div className="row2">
                <div className="form-field">
                  <label>Category <span className="req">*</span></label>
                  <select className="sel" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category…</option>
                    {REQUEST_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                  {form.category === 'Other' && <input className="inp" style={{ marginTop: 6 }} placeholder="Enter custom category" value={form.customCategory} onChange={e => setForm(f => ({ ...f, customCategory: e.target.value }))} required />}
                </div>
                <div className="form-field">
                  <label>Priority <span className="req">*</span></label>
                  <select className="sel" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Floor</label>
                  <select className="sel" value={form.floor || derivedFloor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}>
                    <option value="">Select floor…</option>
                    {derivedFloor && !floorOptions.includes(derivedFloor) && <option value={derivedFloor}>{derivedFloor}</option>}
                    {floorOptions.map(floor => <option key={floor} value={floor}>{floor}</option>)}
                    <option value="Other">Other / custom</option>
                  </select>
                  {form.floor === 'Other' && <input className="inp" style={{ marginTop: 6 }} placeholder="Enter floor" value={form.customFloor} onChange={e => setForm(f => ({ ...f, customFloor: e.target.value }))} required />}
                </div>
                <div className="form-field">
                  <label>Space / room / area</label>
                  <input className="inp" value={form.space || derivedSpace} onChange={e => setForm(f => ({ ...f, space: e.target.value }))} placeholder="e.g. kitchen, server room, bedroom 1" />
                </div>
                <div className="form-field">
                  <label>Asset</label>
                  <select className="sel" value={form.assetId} onChange={e => {
                    const asset = siteAssets.find(item => item.id === e.target.value);
                    setForm(f => ({ ...f, assetId: e.target.value, floor: asset?.floor ?? f.floor, space: asset?.location ?? f.space }));
                  }}>
                    <option value="">No asset linked</option>
                    {siteAssets.map(a => <option key={a.id} value={a.id}>{a.name}{a.floor ? ` — ${a.floor}` : ''}{a.location ? `, ${a.location}` : ''}</option>)}
                  </select>
                  <span style={{ fontSize: 10.5, color: 'var(--gh-muted)' }}>Filtered to assets at {site?.name ?? 'this site'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 — Fault photo */}
          <div className="card" style={cardStyle}>
            <div className="card-hd"><div><div className="card-title">Fault photo</div></div>{stepBadge(2)}</div>
            {compressedImages.map((img, i) => (
              <div className="file-uploaded" key={i} style={{ marginBottom: 8 }}>
                <FileCheck size={16} aria-hidden="true" />
                <span className="fname">{img.file.name} · {formatFileSize(img.compressedSize)}</span>
                <span className="remove" onClick={() => setCompressedImages(prev => prev.filter((_, x) => x !== i))}>✕</span>
              </div>
            ))}
            <ImageUpload
              onUpload={() => {}}
              onCompress={setCompressedImages}
              maxFiles={5}
              compressionOptions={{ maxWidth: 1920, maxHeight: 1080, quality: 0.85, maxSizeKB: 500, format: 'jpeg' }}
            />
            {compressedImages.length > 0 && (
              <p style={{ fontSize: 10.5, color: 'var(--green-txt)', marginTop: 6 }}>
                Storage saved: {formatFileSize(compressedImages.reduce((a, i) => a + (i.originalSize - i.compressedSize), 0))}
              </p>
            )}
          </div>

          {/* Step 3 — Vendor selection */}
          <div className="card" style={cardStyle}>
            <div className="card-hd"><div><div className="card-title">Vendor selection</div></div>{stepBadge(3)}</div>
            <div style={{ border: '1px solid var(--gh-border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              <div className="vendor-tabs">
                <div className={`vtab ${form.vendorType === 'recurring' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, vendorType: 'recurring' }))}>Recurring vendor</div>
                <div className={`vtab ${form.vendorType === 'one_time' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, vendorType: 'one_time', vendorId: '' }))}>One-time / new</div>
              </div>
              <div style={{ padding: 13 }}>
                {form.vendorType === 'recurring' && (
                  <>
                    <div className={`toggle-row ${form.slaAvailable ? 'on' : ''}`} style={{ marginBottom: 10 }} onClick={() => setForm(f => ({ ...f, slaAvailable: !f.slaAvailable, vendorId: '' }))} role="switch" aria-checked={form.slaAvailable}>
                      <FileCheck size={17} style={{ color: form.slaAvailable ? 'var(--green)' : 'var(--gh-muted)' }} aria-hidden="true" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 500 }}>SLA available</p>
                        <span style={{ fontSize: 11, color: 'var(--gh-muted)' }}>Filter vendors to active SLA contracts matching the selected category.</span>
                      </div>
                      <div className={`tog ${form.slaAvailable ? 'on' : ''}`}><div className="tog-knob" /></div>
                    </div>
                    <div className="form-field">
                      <label>Select from directory</label>
                      <select className="sel" value={effectiveVendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
                        <option value="">Select vendor…</option>
                        {availableVendors.map(v => <option key={v.id} value={v.id}>{vendorLabel(v)}{v.category ? ` — ${v.category}` : ''}</option>)}
                      </select>
                      {form.slaAvailable && <span style={{ fontSize: 10.5, color: 'var(--gh-muted)' }}>{slaVendors.length} active SLA vendor{slaVendors.length === 1 ? '' : 's'} for {form.category || 'all categories'}</span>}
                    </div>
                  </>
                )}
                {form.vendorType === 'one_time' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    <div className="form-field"><label>Vendor name <span className="req">*</span></label><input className="inp" value={form.oneTimeVendorName} onChange={e => setForm(f => ({ ...f, oneTimeVendorName: e.target.value }))} /></div>
                    <div className="form-field"><label>Contact person</label><input className="inp" value={form.oneTimeVendorContact} onChange={e => setForm(f => ({ ...f, oneTimeVendorContact: e.target.value }))} /></div>
                    <div className="form-field"><label>Phone</label><input className="inp" value={form.oneTimeVendorPhone} onChange={e => setForm(f => ({ ...f, oneTimeVendorPhone: e.target.value }))} /></div>
                    <div className="form-field"><label>Bank <span className="req">*</span></label><input className="inp" value={form.oneTimeVendorBank} onChange={e => setForm(f => ({ ...f, oneTimeVendorBank: e.target.value }))} /></div>
                    <div className="form-field"><label>Account number <span className="req">*</span></label><input className="inp" value={form.oneTimeVendorAccount} onChange={e => setForm(f => ({ ...f, oneTimeVendorAccount: e.target.value }))} /></div>
                    <div className="form-field"><label>Account name <span className="req">*</span></label><input className="inp" value={form.oneTimeVendorAccountName} onChange={e => setForm(f => ({ ...f, oneTimeVendorAccountName: e.target.value }))} /></div>
                    <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>Payment notes / exemption</label><textarea className="inp ta" value={form.oneTimeVendorNotes} onChange={e => setForm(f => ({ ...f, oneTimeVendorNotes: e.target.value }))} placeholder="Explain any tax or compliance exemption…" /></div>
                  </div>
                )}
                {selectedVendor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: 'var(--green-bg)', border: '1px solid var(--acc2)', borderRadius: 'var(--r)', marginTop: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-bg)', border: '1px solid var(--acc2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--green)', flexShrink: 0 }}>
                      {selectedVendor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--gh-text)' }}>{selectedVendor.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--gh-muted)' }}>{selectedVendor.bankName} · ****{selectedVendor.accountNumber?.slice(-4)} · {selectedVendor.category || 'No category'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 4 — Invoice / quote */}
          <div className="card" style={cardStyle}>
            <div className="card-hd"><div><div className="card-title">Invoice / quote</div></div>{stepBadge(4)}</div>
            <div className="form-field">
              <label>Quoted amount (₦) <span className="req">*</span></label>
              <input className="inp" type="text" inputMode="numeric" placeholder="60,000"
                value={form.invoiceAmount}
                onChange={e => setForm(f => ({ ...f, invoiceAmount: e.target.value.replace(/[^\d.,]/g, '') }))} />
            </div>
            {invoiceAmt > 0 && (
              <div style={{ background: 'var(--gh-surface-2)', border: '1px solid var(--gh-border)', borderRadius: 'var(--r)', padding: '11px 13px', marginTop: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}><span style={{ color: 'var(--gh-muted)' }}>Gross amount</span><span className="mono">{formatCurrency(invoiceAmt)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}><span style={{ color: 'var(--gh-muted)' }}>WHT preview (5%)</span><span className="mono">{formatCurrency(invoiceAmt * 0.05)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, paddingTop: 7, marginTop: 4, borderTop: '1px solid var(--gh-border)' }}><span>Est. net to vendor</span><span className="mono" style={{ color: 'var(--green)' }}>{formatCurrency(invoiceAmt * 0.95)}</span></div>
              </div>
            )}
            <p style={{ fontSize: 10.5, color: 'var(--gh-muted)', marginTop: 6 }}>WHT rate is set by Finance. This is a preview only.</p>
            <div className="form-field" style={{ marginTop: 10 }}>
              <label>Upload invoice or quote</label>
              {quoteFile ? (
                <div className="file-uploaded">
                  <FileCheck size={16} aria-hidden="true" />
                  <span className="fname">{quoteFile.name} · {formatFileSize(quoteFile.size)}</span>
                  <span className="remove" onClick={() => setQuoteFile(null)}>✕</span>
                </div>
              ) : (
                <label className="upload-zone" style={{ display: 'block', cursor: 'pointer' }}>
                  <input type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                    onChange={e => setQuoteFile(e.target.files?.[0] ?? null)} />
                  <FileText size={18} style={{ color: 'var(--gh-muted)' }} aria-hidden="true" />
                  <span style={{ fontSize: 12 }}>Click to attach the vendor's invoice or quote — PDF or image</span>
                </label>
              )}
            </div>
            {budgetWarning && (
              <div className="warn-banner" style={{ marginTop: 8 }}>
                <AlertTriangle size={14} aria-hidden="true" />
                <span>This invoice will exceed the remaining budget ({formatCurrency(remaining)} left). It will be flagged for review.</span>
              </div>
            )}
          </div>

          {/* Incident toggle */}
          <div className="card" style={{ padding: '12px 14px' }}>
            <div className={`toggle-row ${form.isIncident ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, isIncident: !f.isIncident }))} role="switch" aria-checked={form.isIncident}>
              <AlertTriangle size={17} style={{ color: form.isIncident ? 'var(--red)' : 'var(--gh-muted)' }} aria-hidden="true" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12.5, fontWeight: 500 }}>Linked to an incident</p>
                <span style={{ fontSize: 11, color: form.isIncident ? 'var(--red)' : 'var(--gh-muted)' }}>{form.isIncident ? 'ON — this request is for an incident from the Incidents log' : 'OFF — switch on if this request is fixing a logged incident'}</span>
              </div>
              <div className={`tog ${form.isIncident ? 'on' : ''}`}><div className="tog-knob" /></div>
            </div>
            {form.isIncident && (
              <div className="form-field" style={{ marginTop: 10 }}>
                <label>Select incident</label>
                <select className="sel" value={form.linkedIncidentId} onChange={e => setForm(f => ({ ...f, linkedIncidentId: e.target.value }))}>
                  <option value="">{openIncidents.length ? 'Select an open incident…' : 'No open incidents — a new report will be created'}</option>
                  {openIncidents.map(i => <option key={i.id} value={i.id}>{i.title} — logged {formatDate(i.createdAt)}</option>)}
                </select>
                <span style={{ fontSize: 10.5, color: 'var(--gh-muted)' }}>
                  {openIncidents.length ? 'Pick the incident this request is fixing. To log a new incident instead, use the Incidents page first.' : 'No open incident exists at this site — a new incident report will be created and linked automatically.'}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 9 }}>
            <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn-acc" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSubmit} disabled={!form.description.trim() || !form.category || (form.category === 'Other' && !form.customCategory.trim()) || !vendorReady || invoiceAmt <= 0}>
              <Send size={13} aria-hidden="true" /> Submit request
            </button>
          </div>
        </div>

        {/* ══ RIGHT — context rail ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Workflow chain */}
          <div className="card" style={cardStyle}>
            <div className="card-hd"><div><div className="card-title">Workflow chain</div></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { n: 1, label: 'FM — you (now)', active: true },
                { n: 2, label: 'Procurement — PO generation', active: false },
                { n: 3, label: 'Supervisor — approval', active: false },
                { n: 4, label: 'Finance — payment', active: false },
              ].map((s, i) => (
                <div key={s.n}>
                  {i > 0 && <div style={{ width: 1, height: 10, background: 'var(--gh-border)', marginLeft: 11 }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: s.active ? 'var(--acc)' : 'var(--gh-surface-3)', border: s.active ? 'none' : '1px solid var(--gh-border)', color: s.active ? '#fff' : 'var(--gh-muted)' }}>
                      {s.active ? <Check size={11} aria-hidden="true" /> : s.n}
                    </div>
                    <span style={{ color: s.active ? 'var(--gh-text)' : 'var(--gh-muted)', fontWeight: s.active ? 500 : 400 }}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document checklist */}
          <div className="card" style={cardStyle}>
            <div className="card-hd"><div><div className="card-title">Document checklist</div></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: <Camera size={15} style={{ color: compressedImages.length ? 'var(--green)' : 'var(--gh-muted)' }} aria-hidden="true" />, label: 'Fault photo', done: compressedImages.length > 0, badge: compressedImages.length ? 'Uploaded' : 'Required', cls: compressedImages.length ? 'b-ok' : 'b-neu' },
                { icon: <FileCheck size={15} style={{ color: invoiceAmt > 0 && quoteFile ? 'var(--green)' : 'var(--gh-muted)' }} aria-hidden="true" />, label: 'Vendor invoice / quote', done: invoiceAmt > 0 && !!quoteFile, badge: invoiceAmt > 0 ? (quoteFile ? 'Uploaded' : 'Amount set — file missing') : 'Required', cls: invoiceAmt > 0 && quoteFile ? 'b-ok' : 'b-neu' },
                { icon: <FileText size={15} style={{ color: 'var(--amber)' }} aria-hidden="true" />, label: 'Purchase order', done: false, badge: 'Procurement', cls: 'b-warn' },
                { icon: <Receipt size={15} style={{ color: 'var(--gh-muted)' }} aria-hidden="true" />, label: 'Payment receipt', done: false, badge: 'Finance', cls: 'b-neu' },
              ].map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', fontSize: 12, borderRadius: 'var(--r)', background: d.done ? 'var(--green-bg)' : 'var(--gh-surface-2)', border: `1px solid ${d.done ? 'var(--acc2)' : 'var(--gh-border)'}` }}>
                  {d.icon}<span style={{ flex: 1 }}>{d.label}</span><span className={`badge ${d.cls}`}>{d.badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected asset */}
          {selectedAsset && (
            <div className="card" style={cardStyle}>
              <div className="card-hd"><div><div className="card-title">Selected asset</div></div></div>
              <div style={{ background: 'var(--gh-surface-2)', border: '1px solid var(--gh-border)', borderRadius: 'var(--r)', padding: '11px 13px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{selectedAsset.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--gh-muted)' }}>Site</span><span>{site?.name}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--gh-muted)' }}>Location</span><span>{[selectedAsset.floor, selectedAsset.location].filter(Boolean).join(' · ') || 'Not specified'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--gh-muted)' }}>Last repair</span><span>{selectedAsset.lastRepairDate || '—'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--gh-muted)' }}>Total repairs</span><span className="mono">{formatCurrency(selectedAsset.totalRepairCost)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Price history */}
          {selectedVendor && (
            <div className="card" style={cardStyle}>
              <div className="card-hd"><div><div className="card-title">Price history — {selectedVendor.name}</div></div></div>
              {priceHistory.length ? priceHistory.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--gh-border)' }}>
                  <span style={{ color: 'var(--gh-muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })} — {r.description.slice(0, 28)}</span>
                  <span className="mono">{formatCurrency(r.grossAmount ?? r.invoiceAmount ?? 0)}</span>
                </div>
              )) : <p style={{ fontSize: 11.5, color: 'var(--gh-muted)' }}>No previous jobs with this vendor.</p>}
              {priceDelta !== null && (
                <div className="info-banner" style={{ marginTop: 9, fontSize: 11 }}>
                  <Info size={14} aria-hidden="true" />
                  Current quote {formatCurrency(invoiceAmt)} is {Math.abs(priceDelta)}% {priceDelta >= 0 ? 'above' : 'below'} last job.{Math.abs(priceDelta) <= 15 ? ' Within normal range.' : ' Review before submitting.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
