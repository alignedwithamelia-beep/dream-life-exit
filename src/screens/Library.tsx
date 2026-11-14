import { useState } from 'react';
import { BookOpen, Download, ExternalLink, FileText, GraduationCap, Library as LibraryIcon, Lock, Pencil, Plus, PlayCircle, Radio, Unlock } from 'lucide-react';
import { Disclaimer, Empty, Field, IconTile, Modal, PageHeader, confirmDelete } from '../components/ui';
import { Checkbox, Select } from '../components/controls';
import { MembersOnlyBadge, MembershipCard, PaywallModal } from '../components/Membership';
import { useLibrary, useMe, useMembership } from '../lib/club';
import { useHub } from '../lib/store';
import type { LibraryContent, LibraryItem, LibraryKind } from '../lib/types';
import type { Tone } from '../lib/theme';

const KINDS: Record<LibraryKind, { label: string; icon: typeof BookOpen; tone: Tone }> = {
  lesson: { label: 'Guide', icon: BookOpen, tone: 'teal' },
  video: { label: 'Video', icon: PlayCircle, tone: 'terracotta' },
  worksheet: { label: 'Worksheet', icon: FileText, tone: 'sage' },
  replay: { label: 'Masterclass replay', icon: Radio, tone: 'plum' },
  course: { label: 'Course', icon: GraduationCap, tone: 'gold' },
};

const blankItem = (sort: number): LibraryItem => ({ id: '', title: '', summary: '', kind: 'lesson', category: '', locked: true, published: false, sort });
const blankContent = (): LibraryContent => ({ body: '', video_url: '', file_path: null, file_name: null });

/** YouTube / Vimeo links become an embedded player. */
function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

/** Plain text with blank-line paragraphs and "- " bullets. Never renders HTML. */
export function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {text.split(/\n\s*\n/).map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return <ul key={i} className="list-disc pl-5 space-y-1">{lines.map((l, j) => <li key={j}>{l.trim().slice(2)}</li>)}</ul>;
        }
        return <p key={i} className="whitespace-pre-line">{block}</p>;
      })}
    </div>
  );
}

export default function Library() {
  const { toast } = useHub();
  const me = useMe();
  const { isMember } = useMembership();
  const lib = useLibrary();
  const coach = me.role === 'coach';
  const [kind, setKind] = useState<'all' | LibraryKind>('all');
  const [reading, setReading] = useState<{ item: LibraryItem; content: LibraryContent } | null>(null);
  const [paywall, setPaywall] = useState<LibraryItem | null>(null);
  const [editing, setEditing] = useState<{ item: LibraryItem; content: LibraryContent } | null>(null);

  const shown = lib.items.filter((i) => (coach || i.published) && (kind === 'all' || i.kind === kind));
  const kinds = [...new Set(lib.items.map((i) => i.kind))];

  async function open(item: LibraryItem) {
    if (item.locked && !isMember) { setPaywall(item); return; }
    const content = await lib.getContent(item.id);
    if (!content) { setPaywall(item); return; }
    setReading({ item, content });
  }

  async function edit(item: LibraryItem) {
    setEditing({ item, content: (await lib.getContent(item.id)) ?? blankContent() });
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Members’ library" title={<>Learn at your <em>own pace</em>.</>} icon={<LibraryIcon size={28} />}
        sub="Guides, worksheets and masterclass replays to support every step of your move. Free resources are open to everyone; the rest are for members." />

      <MembershipCard />

      <div className="flex flex-wrap items-center gap-2">
        {(['all', ...kinds] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border cursor-pointer transition ${kind === k ? 'bg-navy text-white border-navy' : 'bg-paper border-line hover:border-ink/40'}`}>
            {k === 'all' ? 'Everything' : KINDS[k].label}
          </button>
        ))}
        {coach && <button className="btn sm:ml-auto" onClick={() => setEditing({ item: blankItem(lib.items.length + 1), content: blankContent() })}><Plus size={16} /> Add to library</button>}
      </div>

      {lib.loading ? <div className="card muted text-sm">Loading…</div> : shown.length === 0 ? (
        <div className="card"><Empty>{coach ? 'Nothing here yet. Add your first guide, worksheet or replay.' : 'New resources are on their way.'}</Empty></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {shown.map((item) => {
            const k = KINDS[item.kind];
            const lockedForMe = item.locked && !isMember;
            return (
              <div key={item.id} role="button" tabIndex={0} onClick={() => open(item)} onKeyDown={(e) => e.key === 'Enter' && open(item)}
                className="card lift !p-0 overflow-hidden cursor-pointer group flex flex-col">
                <div className={`relative h-32 grid place-items-center overflow-hidden ${lockedForMe ? 'bg-beige' : 'bg-teal-soft'}`}>
                  <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(160px 90px at 80% 0%, var(--color-gold-soft), transparent), radial-gradient(160px 90px at 0% 100%, var(--color-teal-soft), transparent)' }} />
                  <span className={`relative transition group-hover:scale-110 ${lockedForMe ? 'opacity-40' : ''}`}><IconTile icon={k.icon} tone={k.tone} size="lg" /></span>
                  {lockedForMe && <span className="absolute inset-0 grid place-items-center"><span className="w-12 h-12 rounded-full bg-paper/90 grid place-items-center shadow-lg"><Lock size={20} className="text-gold" /></span></span>}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {item.locked ? <MembersOnlyBadge /> : <span className="rounded-full bg-sage text-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">Free</span>}
                    {coach && !item.published && <span className="rounded-full bg-ink/70 text-paper px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">Draft</span>}
                  </div>
                  {coach && <button className="absolute top-2.5 right-2.5 icon-btn bg-paper/90" aria-label="Edit" onClick={(e) => { e.stopPropagation(); edit(item); }}><Pencil size={14} /></button>}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[10px] tracking-[0.18em] font-bold muted uppercase mb-1">{k.label}{item.category && ` · ${item.category}`}</div>
                  <h3 className="font-serif text-lg leading-snug mb-1.5">{item.title}</h3>
                  <p className="text-sm muted leading-snug flex-1">{item.summary}</p>
                  <div className="mt-4 text-sm font-semibold flex items-center gap-1.5 text-teal">
                    {lockedForMe ? <><Lock size={14} className="text-gold" /> <span className="text-gold">Unlock with membership</span></> : <><Unlock size={14} /> Open</>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reading && <Reader item={reading.item} content={reading.content} fileLink={lib.fileLink} onClose={() => setReading(null)} />}
      {paywall && <PaywallModal title={paywall.title} onClose={() => setPaywall(null)} />}
      {editing && (
        <Editor item={editing.item} content={editing.content} remote={lib.remote} onClose={() => setEditing(null)}
          onSave={async (i, c, f) => { try { await lib.save(i, c, f); setEditing(null); toast(i.id ? 'Saved.' : 'Added to the library.'); } catch (e) { toast((e as Error).message); } }}
          onDelete={async () => { if (!confirmDelete(`“${editing.item.title}”`)) return; await lib.remove(editing.item.id); setEditing(null); toast('Removed from the library.'); }} />
      )}
      <Disclaimer />
    </div>
  );
}

function Reader({ item, content, fileLink, onClose }: { item: LibraryItem; content: LibraryContent; fileLink: (c: LibraryContent) => Promise<string | null>; onClose: () => void }) {
  const embed = content.video_url ? embedUrl(content.video_url) : null;
  return (
    <Modal title={item.title} onClose={onClose} wide>
      <div className="text-[10px] tracking-[0.18em] font-bold muted uppercase">{KINDS[item.kind].label}{item.category && ` · ${item.category}`}</div>
      {embed && (
        <div className="aspect-video rounded-2xl overflow-hidden bg-black">
          <iframe src={embed} title={item.title} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        </div>
      )}
      {content.video_url && !embed && <a className="link" href={content.video_url} target="_blank" rel="noreferrer noopener"><ExternalLink size={14} /> Watch the recording</a>}
      {content.body ? <RichText text={content.body} /> : !embed && <p className="muted text-sm">No written content yet.</p>}
      {content.file_name && (
        <button className="btn-outline" onClick={async () => { const u = await fileLink(content); if (u) window.open(u, '_blank', 'noopener'); }}>
          <Download size={15} /> Download {content.file_name}
        </button>
      )}
    </Modal>
  );
}

function Editor({ item, content, remote, onClose, onSave, onDelete }: {
  item: LibraryItem; content: LibraryContent; remote: boolean; onClose: () => void;
  onSave: (i: LibraryItem, c: LibraryContent, f: File | null) => Promise<void>; onDelete: () => void;
}) {
  const [i, setI] = useState(item);
  const [c, setC] = useState(content);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal wide title={item.id ? 'Edit library item' : 'Add to library'} onClose={onClose} footer={<>
      {item.id && <button className="btn-danger" onClick={onDelete}>Delete</button>}
      <div className="flex-1" />
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn" disabled={busy || !i.title.trim()} onClick={async () => { setBusy(true); await onSave(i, c, file); setBusy(false); }}>{busy ? 'Saving…' : 'Save'}</button>
    </>}>
      <Field label="Title"><input autoFocus className="input" value={i.title} onChange={(e) => setI({ ...i, title: e.target.value })} /></Field>
      <Field label="Teaser" hint="Everyone sees this, members or not. Make it tempting."><textarea className="input !min-h-20" value={i.summary} onChange={(e) => setI({ ...i, summary: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Type"><Select className="input" value={i.kind} onChange={(e) => setI({ ...i, kind: e.target.value as LibraryKind })}>
          {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
        <Field label="Topic"><input className="input" placeholder="e.g. Finances" value={i.category} onChange={(e) => setI({ ...i, category: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap gap-6 rounded-2xl bg-cream/60 border border-line px-4 py-3">
        <Checkbox checked={i.locked} onChange={(locked) => setI({ ...i, locked })} label={<span><b>Members only</b> <span className="muted">· locked for non-members</span></span>} />
        <Checkbox checked={i.published} onChange={(published) => setI({ ...i, published })} label={<span><b>Published</b> <span className="muted">· visible in the library</span></span>} />
      </div>
      <Field label="Content" hint="Plain text. Leave a blank line between paragraphs; start a line with “- ” for a bullet."><textarea className="input !min-h-40" value={c.body} onChange={(e) => setC({ ...c, body: e.target.value })} /></Field>
      <Field label="Video link" hint="YouTube or Vimeo links play inside the library. Use unlisted videos for members-only content."><input className="input" type="url" placeholder="https://" value={c.video_url} onChange={(e) => setC({ ...c, video_url: e.target.value })} /></Field>
      {remote && (
        <Field label="Attachment" hint="A worksheet or PDF members can download (up to 50 MB).">
          <input type="file" className="input !py-2 file:mr-3 file:rounded-full file:border-0 file:bg-teal-soft file:text-teal file:px-3 file:py-1 file:font-semibold" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {c.file_name && !file && <span className="block text-xs muted mt-1">Current: {c.file_name}</span>}
        </Field>
      )}
    </Modal>
  );
}
