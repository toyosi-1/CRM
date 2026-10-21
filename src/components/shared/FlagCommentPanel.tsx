import { useState } from 'react';
import { CheckCircle, FilePlus } from 'lucide-react';
import type { ChecklistItem } from '../../types';

interface Props {
  item: ChecklistItem;
  submitted: boolean;
  onSave: (comment: string) => void;
  onRaiseRequest: (comment: string) => void;
}

// Shown under a flagged checklist item: mandatory comment + optional request shortcut.
export default function FlagCommentPanel({ item, submitted, onSave, onRaiseRequest }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const value = draft ?? item.comment ?? '';

  const save = () => {
    onSave(value);
    setDraft(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const raise = () => {
    if (draft !== null && draft !== item.comment) onSave(draft);
    onRaiseRequest(value);
  };

  if (submitted) {
    return item.comment ? <p className="text-xs text-slate-500 mt-2">{item.comment}</p> : null;
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        className="input resize-none text-xs"
        rows={2}
        placeholder="Comment required — describe the issue, and add a photo on the request if needed"
        value={value}
        onChange={e => { setDraft(e.target.value); setSaved(false); }}
        onBlur={() => { if (draft !== null && draft !== item.comment) onSave(draft); }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={save}
        >
          {saved ? <><CheckCircle size={13} className="text-emerald-600" />Saved</> : 'Save comment'}
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={raise}>
          <FilePlus size={13} />Raise request
        </button>
      </div>
    </div>
  );
}
