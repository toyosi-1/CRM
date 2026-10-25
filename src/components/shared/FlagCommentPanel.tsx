import { useState } from 'react';
import { CheckCircle, FilePlus, Pencil } from 'lucide-react';
import type { ChecklistItem } from '../../types';

interface Props {
  item: ChecklistItem;
  submitted: boolean;
  onSave: (comment: string) => void;
  onRaiseRequest: (comment: string) => void;
  canRaiseRequest?: boolean;
}

// Shown under a flagged checklist item: mandatory comment + optional request shortcut.
// Once saved, the comment collapses to a read view so it's clear the note is stored.
export default function FlagCommentPanel({ item, submitted, onSave, onRaiseRequest, canRaiseRequest = true }: Props) {
  const [editing, setEditing] = useState(!(item.comment ?? '').trim());
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const value = draft ?? item.comment ?? '';

  const save = () => {
    onSave(value);
    setDraft(null);
    if (!value.trim()) return; // comment is required — stay in edit mode
    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const raise = () => {
    if (editing && draft !== null && draft !== item.comment) onSave(draft);
    onRaiseRequest(value);
  };

  if (submitted) {
    return item.comment ? <p className="text-xs text-slate-500 mt-2">{item.comment}</p> : null;
  }

  if (!editing) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{item.comment}</p>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle size={12} />Saved</span>}
          <button type="button" className="btn-ghost text-xs" onClick={() => setEditing(true)}>
            <Pencil size={12} />Edit comment
          </button>
          {canRaiseRequest && <button type="button" className="btn-secondary text-xs" onClick={raise}>
            <FilePlus size={13} />Raise request
          </button>}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        className="input resize-none text-xs"
        rows={2}
        placeholder="Comment required — describe the issue, and add a photo on the request if needed"
        value={value}
        onChange={e => { setDraft(e.target.value); setSaved(false); }}
      />
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary text-xs" onClick={save}>
          <CheckCircle size={13} />Save comment
        </button>
        {canRaiseRequest && <button type="button" className="btn-secondary text-xs" onClick={raise}>
          <FilePlus size={13} />Raise request
        </button>}
      </div>
    </div>
  );
}
