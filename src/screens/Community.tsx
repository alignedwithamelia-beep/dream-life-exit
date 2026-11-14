import { useState } from 'react';
import { Crown, MessageCircle, MessagesSquare, Pin, Send, Trash2 } from 'lucide-react';
import { Avatar, Empty, PageHeader } from '../components/ui';
import { MembershipCard } from '../components/Membership';
import { useCommunity, useMembership } from '../lib/club';
import { MEMBER_TONES } from '../lib/theme';
import type { Post, Reaction } from '../lib/types';

const REACTIONS: [Reaction['emoji'], string, string][] = [['heart', '❤️', 'Love'], ['clap', '👏', 'Cheer'], ['sparkle', '✨', 'Inspiring']];

const toneFor = (id: string) => MEMBER_TONES[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % MEMBER_TONES.length];

function when(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Community() {
  const { isMember } = useMembership();
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Community" title={<>You’re not doing this <em>alone</em>.</>} icon={<MessagesSquare size={28} />}
        sub="Share wins, ask questions and cheer each other on with fellow movers and your coach." />
      {isMember ? <Feed /> : <Locked />}
    </div>
  );
}

/** What non-members see: a blurred glimpse and the way in. */
function Locked() {
  return (
    <div className="relative">
      <div className="space-y-4 blur-[6px] opacity-60 pointer-events-none select-none" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3 mb-4"><span className="w-10 h-10 rounded-full bg-teal" /><div className="space-y-1.5"><div className="h-3 w-28 rounded bg-line" /><div className="h-2.5 w-16 rounded bg-line" /></div></div>
            <div className="space-y-2"><div className="h-3 rounded bg-line w-11/12" /><div className="h-3 rounded bg-line w-4/5" /><div className="h-3 rounded bg-line w-2/3" /></div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center p-2">
        <div className="w-full max-w-2xl"><MembershipCard /></div>
      </div>
    </div>
  );
}

function Feed() {
  const c = useCommunity(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function post() {
    if (!draft.trim()) return;
    setSending(true);
    await c.addPost(draft.trim());
    setDraft(''); setSending(false);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="space-y-5">
        <div className="card !p-5">
          <div className="flex gap-3">
            <Avatar name={c.me.name} tone={toneFor(c.me.id)} size={40} />
            <div className="flex-1">
              <textarea className="input !min-h-24" placeholder={c.me.role === 'coach' ? 'Share an update with your members…' : 'Share a win, ask a question, or say hello…'}
                value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={5000}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post(); }} />
              <div className="flex items-center justify-between mt-2 gap-3">
                <span className="text-[11px] muted">Members and your coach can see posts. Keep personal documents and details out of the community.</span>
                <button className="btn shrink-0" disabled={!draft.trim() || sending} onClick={post}><Send size={14} /> Post</button>
              </div>
            </div>
          </div>
        </div>

        {c.loading ? <div className="card muted text-sm">Loading…</div>
          : c.posts.length === 0 ? <div className="card"><Empty>No posts yet. Be the first to say hello!</Empty></div>
          : c.posts.map((p) => <PostCard key={p.id} post={p} c={c} />)}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <MembershipCard compact />
        <div className="card !p-5 text-sm">
          <div className="font-serif text-lg mb-2">Community guidelines</div>
          <ul className="space-y-1.5 muted list-disc pl-4">
            <li>Be kind. Everyone is at a different stage.</li>
            <li>Share experiences, not legal or financial advice.</li>
            <li>Keep other members’ stories in the community.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function PostCard({ post, c }: { post: Post; c: ReturnType<typeof useCommunity> }) {
  const [open, setOpen] = useState(post.comments.length > 0 && post.comments.length <= 3);
  const [reply, setReply] = useState('');
  const mine = post.author_id === c.me.id;
  const coach = c.me.role === 'coach';

  return (
    <article className={`card !p-5 ${post.pinned ? 'ring-1 ring-gold/40' : ''}`}>
      {post.pinned && <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-gold uppercase mb-3"><Pin size={12} className="fill-gold" /> Pinned</div>}
      <header className="flex items-start gap-3 mb-3">
        <Avatar name={post.author_name} tone={post.author_role === 'coach' ? 'gold' : toneFor(post.author_id)} size={42} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-1.5">
            {post.author_name}
            {post.author_role === 'coach' && <span className="chip !bg-gold-soft !text-warn-ink"><Crown size={10} /> Coach</span>}
          </div>
          <div className="text-xs muted">{when(post.created_at)}{post.edited_at && ' · edited'}</div>
        </div>
        <div className="flex gap-1">
          {coach && <button className={`icon-btn ${post.pinned ? '!text-gold' : ''}`} aria-label={post.pinned ? 'Unpin' : 'Pin'} title={post.pinned ? 'Unpin' : 'Pin to top'} onClick={() => c.togglePin(post)}><Pin size={15} /></button>}
          {(mine || coach) && <button className="icon-btn hover:!text-danger" aria-label="Delete post" onClick={() => window.confirm('Delete this post?') && c.deletePost(post.id)}><Trash2 size={15} /></button>}
        </div>
      </header>

      <p className="whitespace-pre-line leading-relaxed mb-4">{post.body}</p>

      <footer className="flex flex-wrap items-center gap-2">
        {REACTIONS.map(([key, emoji, label]) => {
          const count = post.reactions.filter((r) => r.emoji === key).length;
          const on = post.reactions.some((r) => r.emoji === key && r.user_id === c.me.id);
          return (
            <button key={key} onClick={() => c.react(post, key)} aria-pressed={on} title={label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm cursor-pointer transition active:scale-95 ${on ? 'border-teal bg-teal-soft text-teal font-semibold' : 'border-line hover:border-ink/30'}`}>
              <span>{emoji}</span>{count > 0 && <span className="tabular-nums">{count}</span>}
            </button>
          );
        })}
        <button className="link ml-auto" onClick={() => setOpen(!open)}><MessageCircle size={14} /> {post.comments.length ? `${post.comments.length} comment${post.comments.length === 1 ? '' : 's'}` : 'Comment'}</button>
      </footer>

      {open && (
        <div className="mt-4 pt-4 border-t border-line space-y-3">
          {post.comments.map((k) => (
            <div key={k.id} className="flex gap-2.5 group">
              <Avatar name={k.author_name} tone={k.author_role === 'coach' ? 'gold' : toneFor(k.author_id)} size={30} />
              <div className="flex-1 min-w-0 rounded-2xl bg-cream/80 border border-line px-3.5 py-2">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  {k.author_name}{k.author_role === 'coach' && <Crown size={10} className="text-gold" />}
                  <span className="muted font-normal">· {when(k.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-line">{k.body}</p>
              </div>
              {(k.author_id === c.me.id || coach) && (
                <button className="icon-btn opacity-0 group-hover:opacity-100 focus:opacity-100 self-center" aria-label="Delete comment" onClick={() => c.deleteComment(post.id, k.id)}><Trash2 size={13} /></button>
              )}
            </div>
          ))}
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!reply.trim()) return; await c.addComment(post.id, reply.trim()); setReply(''); }}>
            <input className="input !rounded-full" placeholder="Write a reply…" value={reply} maxLength={2000} onChange={(e) => setReply(e.target.value)} />
            <button className="btn shrink-0 !px-4" disabled={!reply.trim()} aria-label="Send reply"><Send size={14} /></button>
          </form>
        </div>
      )}
    </article>
  );
}
