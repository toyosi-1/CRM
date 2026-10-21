import { Printer, X } from 'lucide-react';

export default function DocPreview({ html, title, onClose }: { html: string; title: string; onClose: () => void }) {
  const print = () => {
    const frame = document.getElementById('doc-preview-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center p-4" onClick={onClose}>
      <div className="flex items-center gap-3 mb-3" onClick={e => e.stopPropagation()}>
        <span className="text-white font-bold text-sm">{title}</span>
        <button onClick={print} className="btn-primary text-xs"><Printer size={13} />Print / Save PDF</button>
        <button onClick={onClose} className="btn-secondary text-xs"><X size={13} />Close</button>
      </div>
      <iframe
        id="doc-preview-frame"
        title={title}
        srcDoc={html}
        className="w-full max-w-[850px] flex-1 bg-white rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
