import { useRef, useState } from 'react';
import { Bell, Eye, FileImage, FileText, FolderLock, FolderPlus, Lock, Pencil, Search, Upload, UserRound } from 'lucide-react';
import { folderStyle, TONE } from '../lib/theme';
import { Banner, Disclaimer, Empty, Field, Modal, PageHeader, confirmDelete } from '../components/ui';
import { DateInput, Select } from '../components/controls';
import { uid } from '../lib/defaults';
import { checkFile, fileType, fileUrl, forgetSessionFile, removeStoredFile, storeFile } from '../lib/files';
import { fmtDate, fmtSize, memberName, todayISO, vaultAlerts } from '../lib/logic';
import { useHub } from '../lib/store';
import type { Doc, Folder as FolderT } from '../lib/types';

export default function Vault() {
  const { state, set, toast, mode, account } = useHub();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Doc | null>(null);
  const [folderEdit, setFolderEdit] = useState<FolderT | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const alerts = vaultAlerts(state).length;
  const folder = state.folders.find((f) => f.id === folderId);
  const remote = mode === 'remote';

  const query = q.trim().toLowerCase();
  const results = query
    ? state.docs.filter((d) => d.name.toLowerCase().includes(query) || d.tags.some((t) => t.toLowerCase().includes(query.replace(/^#/, ''))) || memberName(state, d.memberId).toLowerCase().includes(query))
    : [];

  async function onFile(file: File | undefined) {
    if (!file || !folder) return;
    const err = checkFile(file);
    if (err) { toast(err); return; }
    setBusy(true);
    const id = uid();
    try {
      const path = await storeFile(id, file, remote ? account?.id : undefined);
      const doc: Doc = {
        id, folderId: folder.id, name: file.name.replace(/\.[^.]+$/, ''), memberId: '', reviewDate: '', tags: [], description: '',
        type: fileType(file), size: file.size, added: todayISO(), demo: !remote, path,
      };
      set((d) => { d.docs.unshift(doc); });
      setEditing(doc);
      toast('File added.');
    } catch {
      toast('That upload didn’t work. Please try again.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function open(d: Doc, download = false) {
    const url = await fileUrl(d.id, d.path, download ? `${d.name}.${d.type.toLowerCase()}` : undefined);
    if (!url) { toast(d.demo && !d.path ? 'This is a demo record, so there’s no file to open. Files you add yourself last for this visit only.' : 'That file isn’t available.'); return; }
    if (download && !d.path) { const a = document.createElement('a'); a.href = url; a.download = d.name; a.click(); return; }
    window.open(url, '_blank', 'noopener');
  }

  async function remove(d: Doc) {
    if (!confirmDelete(`“${d.name}”`)) return;
    if (d.path) await removeStoredFile(d.path);
    forgetSessionFile(d.id);
    set((s) => {
      s.docs = s.docs.filter((x) => x.id !== d.id);
      s.tasks.forEach((t) => { if (t.docId === d.id) t.docId = ''; });
    });
    setEditing(null);
    toast('Document deleted.');
  }

  const row = (d: Doc) => (
    <div key={d.id} className="flex items-start gap-4 py-4 border-b border-line last:border-0">
      <span className="w-11 h-11 rounded-xl bg-teal-soft text-teal grid place-items-center shrink-0">{d.type === 'PDF' ? <FileText size={19} /> : <FileImage size={19} />}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{d.name}</div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {d.demo && !d.path && <span className="chip !bg-warn">DEMO</span>}
          {d.reviewDate && <span className="chip">Review by {fmtDate(d.reviewDate, { month: 'short', year: 'numeric' })}</span>}
          {d.memberId && <span className="chip"><UserRound size={11} />{memberName(state, d.memberId)}</span>}
          {d.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
          <span className="chip">{d.type} · {fmtSize(d.size)}</span>
        </div>
        {d.description && <div className="text-sm muted mt-1.5">{d.description}</div>}
        {query && <div className="text-xs muted mt-1">{state.folders.find((f) => f.id === d.folderId)?.name}</div>}
      </div>
      <div className="flex gap-1 shrink-0">
        <button className="p-2 rounded-full hover:bg-beige cursor-pointer" aria-label="View" onClick={() => open(d)}><Eye size={17} /></button>
        <button className="p-2 rounded-full hover:bg-beige cursor-pointer" aria-label="Edit" onClick={() => setEditing(d)}><Pencil size={16} /></button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="My Document Vault" title={<>Every important paper, <em>in one place</em>.</>} icon={<FolderLock size={28} />}
        sub="Organise your relocation paperwork by folder, tag it, link it to family members and set review dates." />

      <div className="space-y-3 mb-6">
        {remote ? (
          <Banner icon={<Lock size={18} />}><b>Private, encrypted storage.</b> Only you can open these files. Your coach can’t see your vault.</Banner>
        ) : (
          <Banner tone="yellow" icon={<Lock size={18} />}><b>Use demonstration files only for now.</b> Real passports, visas, medical records and insurance policies should only be stored once secure sign-in and private, encrypted storage are switched on.</Banner>
        )}
        {alerts > 0 && <Banner icon={<Bell size={18} />}><b>{alerts} document{alerts === 1 ? ' has' : 's have'} review or expiry dates in the next 90 days.</b></Banner>}
      </div>

      <div className="relative mb-6">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 muted" />
        <input className="input !pl-11 !rounded-full" placeholder="Search by name, tag or family member" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {query ? (
        <div className="card">{results.length ? results.map(row) : <Empty>No documents match “{q}”.</Empty>}</div>
      ) : !folder ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-7 pt-3">
          {state.folders.map((f) => {
            const n = state.docs.filter((d) => d.folderId === f.id).length;
            const fs = folderStyle(f.name);
            return (
              <button key={f.id} onClick={() => setFolderId(f.id)}
                className={`folder lift text-left rounded-[20px] border border-line ${TONE[fs.tone].soft} p-5 pt-6 cursor-pointer group`}>
                <div className="flex items-start justify-between mb-6">
                  <span className={`w-10 h-10 rounded-xl bg-paper ${TONE[fs.tone].text} grid place-items-center shadow-sm`}><fs.icon size={18} /></span>
                  <span className="font-serif text-2xl text-ink/80">{n}</span>
                </div>
                <div className="font-serif text-[16px] leading-snug mb-0.5">{f.name}</div>
                <div className="text-xs muted line-clamp-1">{f.description || `${n} document${n === 1 ? '' : 's'}`}</div>
              </button>
            );
          })}
          <button onClick={() => setFolderEdit({ id: '', name: '', description: '' })}
            className="rounded-[20px] border-2 border-dashed border-ink/15 p-5 text-left hover:border-teal/60 hover:bg-paper transition cursor-pointer grid content-center justify-items-start">
            <span className="w-10 h-10 rounded-xl bg-paper text-teal grid place-items-center mb-6 border border-line"><FolderPlus size={18} /></span>
            <div className="font-serif text-[16px] mb-0.5">New folder</div>
            <div className="text-xs muted">Create your own</div>
          </button>
        </div>
      ) : (
        <div className="card">
          <button className="link mb-4" onClick={() => setFolderId(null)}>‹ All folders</button>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="text-2xl">{folder.name}</h2>
              <p className="text-sm muted">{folder.description}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={() => setFolderEdit(folder)}>Rename</button>
              <button className="btn" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={15} /> {busy ? 'Uploading…' : remote ? 'Add a file' : 'Add a test file'}</button>
              <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
          </div>
          <p className="text-xs muted mb-3">
            PDF, JPG or PNG, up to 10 MB each. {remote ? 'Files are stored privately in your account.' : 'In this prototype files stay in your browser for this visit only.'}
          </p>
          {state.docs.filter((d) => d.folderId === folder.id).map(row)}
          {!state.docs.some((d) => d.folderId === folder.id) && <Empty>No documents in this folder yet.</Empty>}
        </div>
      )}

      {editing && <DocModal doc={editing} onClose={() => setEditing(null)} onDownload={() => open(editing, true)} onDelete={() => remove(editing)}
        onSave={(d) => { set((s) => { Object.assign(s.docs.find((x) => x.id === d.id)!, d); }); setEditing(null); toast('Document saved.'); }} />}

      {folderEdit && (
        <FolderModal folder={folderEdit} onClose={() => setFolderEdit(null)} onSave={(f) => {
          if (!f.name.trim()) return;
          set((s) => {
            if (f.id) Object.assign(s.folders.find((x) => x.id === f.id)!, f);
            else s.folders.push({ ...f, id: uid() });
          });
          setFolderEdit(null);
          toast(f.id ? 'Folder renamed.' : 'Folder created.');
        }} />
      )}
      <Disclaimer />
    </div>
  );
}

function DocModal({ doc, onClose, onSave, onDelete, onDownload }: { doc: Doc; onClose: () => void; onSave: (d: Doc) => void; onDelete: () => void; onDownload: () => void }) {
  const { state } = useHub();
  const [d, setD] = useState(doc);
  const [tags, setTags] = useState(doc.tags.join(', '));
  const up = (p: Partial<Doc>) => setD({ ...d, ...p });
  return (
    <Modal title="Document details" onClose={onClose} footer={<>
      <button className="btn-outline" onClick={onDownload}>Download</button>
      <button className="btn-danger" onClick={onDelete}>Delete</button>
      <div className="flex-1" />
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn" onClick={() => onSave({ ...d, tags: tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean) })}>Save</button>
    </>}>
      <Field label="Name"><input className="input" value={d.name} onChange={(e) => up({ name: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Folder"><Select className="input" value={d.folderId} onChange={(e) => up({ folderId: e.target.value })}>{state.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
        <Field label="Belongs to"><Select className="input" value={d.memberId} onChange={(e) => up({ memberId: e.target.value })}>
          <option value="">Whole household</option>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
        <Field label="Expiry or review date"><DateInput className="input" value={d.reviewDate} onChange={(e) => up({ reviewDate: e.target.value })} /></Field>
        <Field label="Tags" hint="Separate with commas"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
      </div>
      <Field label="Description"><textarea className="input" value={d.description} onChange={(e) => up({ description: e.target.value })} /></Field>
      <p className="text-xs muted">{d.type} · {fmtSize(d.size)} · Added {fmtDate(d.added)}</p>
    </Modal>
  );
}

function FolderModal({ folder, onClose, onSave }: { folder: FolderT; onClose: () => void; onSave: (f: FolderT) => void }) {
  const [f, setF] = useState(folder);
  return (
    <Modal title={folder.id ? 'Rename folder' : 'New folder'} onClose={onClose} footer={<>
      <div className="flex-1" /><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn" onClick={() => onSave(f)}>Save</button>
    </>}>
      <Field label="Folder name"><input autoFocus className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Description"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
    </Modal>
  );
}
