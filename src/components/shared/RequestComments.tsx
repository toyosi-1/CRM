import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStore, reportSaveError } from '../../store/useStore';
import { RoleBadge } from './Badges';
import { formatDateTime } from '../../utils/helpers';

interface Comment { id: string; authorId: string; body: string; createdAt: string }

const toComment = (row: Record<string, unknown>): Comment => ({
  id: String(row.id), authorId: String(row.author_id), body: String(row.body), createdAt: String(row.created_at),
});

export default function RequestComments({ requestId, initialNote, requesterId, requestedAt }: {
  requestId: string; initialNote?: string; requesterId: string; requestedAt: string;
}) {
  const { users, currentUser } = useStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.from('request_comments').select('*').eq('request_id', requestId).order('created_at')
      .then(({ data, error }) => {
        if (error) return reportSaveError(error);
        if (active) setComments((data ?? []).map(toComment));
      });
    const channel = supabase.channel(`request-comments-${requestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'request_comments', filter: `request_id=eq.${requestId}` },
        payload => {
          const c = toComment(payload.new);
          setComments(prev => prev.some(p => p.id === c.id) ? prev : [...prev, c]);
        })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [requestId]);

  const post = async () => {
    const body = draft.trim();
    if (!body || !currentUser) return;
    setPosting(true);
    const { data, error } = await supabase.from('request_comments')
      .insert({ request_id: requestId, author_id: currentUser.id, body }).select().single();
    setPosting(false);
    if (error) return reportSaveError(error);
    const c = toComment(data);
    setComments(prev => prev.some(p => p.id === c.id) ? prev : [...prev, c]);
    setDraft('');
  };

  const thread = [
    ...(initialNote ? [{ id: 'initial', authorId: requesterId, body: initialNote, createdAt: requestedAt }] : []),
    ...comments,
  ];

  return (
    <div className="card p-5">
      <h2 className="section-title mb-3 flex items-center gap-2"><MessageSquare size={14} /> Internal comments</h2>
      <p className="text-[11px] text-slate-400 -mt-2 mb-3">Visible to all internal staff on this request.</p>
      <div className="space-y-3">
        {thread.length === 0 && <p className="text-xs text-slate-400">No comments yet.</p>}
        {thread.map(c => {
          const author = users.find(u => u.id === c.authorId);
          return (
            <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-semibold text-slate-800">{author?.name ?? 'Staff'}</span>
                {author && <RoleBadge role={author.role} />}
                <span className="text-[11px] text-slate-400">{formatDateTime(c.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line">{c.body}</p>
            </div>
          );
        })}
      </div>
      {currentUser && (
        <div className="mt-3 flex gap-2 items-end">
          <textarea className="input flex-1 min-h-[60px]" maxLength={2000} placeholder="Add a comment…"
            value={draft} onChange={e => setDraft(e.target.value)} />
          <button className="btn-primary text-xs" disabled={posting || !draft.trim()} onClick={post}>
            <Send size={12} /> {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      )}
    </div>
  );
}
