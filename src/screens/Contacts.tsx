import { useState } from 'react';
import { Users, Copy, Globe, Mail, Pencil, Phone, Plus, Search, ShieldCheck } from 'lucide-react';
import { Banner, Disclaimer, Empty, Field, IconTile, Modal, PageHeader, confirmDelete } from '../components/ui';
import { CONTACT_STYLE } from '../lib/theme';
import { CONTACT_CATEGORIES, uid } from '../lib/defaults';
import { useHub } from '../lib/store';
import type { Contact } from '../lib/types';

const blank = (): Contact => ({ id: '', name: '', org: '', categories: [], url: '', email: '', phone: '', note: '', official: false });
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function Contacts() {
  const { state, set, toast } = useHub();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [editing, setEditing] = useState<Contact | null>(null);

  const query = q.trim().toLowerCase();
  const list = state.contacts.filter((c) =>
    (cat === 'All' || c.categories.includes(cat)) &&
    (!query || [c.name, c.org, c.note, c.email, ...c.categories].join(' ').toLowerCase().includes(query)));

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); toast(`${what} copied.`); } catch { toast('Couldn’t copy. Select and copy it instead.'); }
  };

  function save(c: Contact) {
    if (!c.name.trim()) { toast('Please add a name.'); return; }
    set((s) => { if (c.id) Object.assign(s.contacts.find((x) => x.id === c.id)!, c); else s.contacts.push({ ...c, id: uid() }); });
    setEditing(null);
    toast(c.id ? 'Contact saved.' : 'Contact added.');
  }

  return (
    <div>
      <PageHeader eyebrow="My Contacts & Useful Links" title={<>The people and places <em>helping you</em>.</>} icon={<Users size={28} />}
        sub="Keep official sources, advisers, schools and everyone else in one list." />
      <div className="mb-6">
        <Banner icon={<ShieldCheck size={18} />}>
          For visas, residency, tax and healthcare, always check the official government website for your destination and speak to a qualified adviser. Contacts you add here are your own and aren’t endorsed by The Dream Life™.
        </Banner>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-56">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 muted" />
          <input className="input !pl-11 !rounded-full" placeholder="Search contacts" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn" onClick={() => setEditing(blank())}><Plus size={16} /> Add a contact</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {['All', ...CONTACT_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full px-4 py-1.5 text-sm font-medium border cursor-pointer transition ${cat === c ? 'bg-navy text-white border-ink' : 'bg-paper border-line hover:border-ink/40'}`}>{c}</button>
        ))}
      </div>

      {list.length === 0 ? <div className="card"><Empty>No contacts match.</Empty></div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((c) => (
            <div key={c.id} className="card lift !p-5">
              <div className="flex items-start gap-3 mb-3"><IconTile icon={(CONTACT_STYLE[c.categories[0]] ?? CONTACT_STYLE.Advisers).icon} tone={(CONTACT_STYLE[c.categories[0]] ?? CONTACT_STYLE.Advisers).tone} />
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-lg leading-snug">{c.name}</div>
                  {c.org && <div className="text-sm muted">{c.org}</div>}
                </div>
                <button className="p-2 rounded-full hover:bg-beige cursor-pointer" aria-label="Edit" onClick={() => setEditing(c)}><Pencil size={15} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">{c.categories.map((x) => <span key={x} className={`chip ${x === 'Official resources' ? '!bg-teal-soft !text-teal' : ''}`}>{x}</span>)}</div>
              <div className="space-y-1.5 text-sm">
                {c.url && <a href={safeUrl(c.url)} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 text-teal hover:underline truncate"><Globe size={14} className="shrink-0" />{c.url.replace(/^https?:\/\/(www\.)?/, '')}</a>}
                {c.email && <div className="flex items-center gap-2"><Mail size={14} className="muted shrink-0" /><a href={`mailto:${c.email}`} className="hover:underline truncate">{c.email}</a>
                  <button className="p-1 muted hover:text-ink cursor-pointer" aria-label="Copy email" onClick={() => copy(c.email, 'Email')}><Copy size={13} /></button></div>}
                {c.phone && <div className="flex items-center gap-2"><Phone size={14} className="muted shrink-0" /><a href={`tel:${c.phone.replace(/\s/g, '')}`} className="hover:underline">{c.phone}</a>
                  <button className="p-1 muted hover:text-ink cursor-pointer" aria-label="Copy phone" onClick={() => copy(c.phone, 'Phone number')}><Copy size={13} /></button></div>}
              </div>
              {c.note && <p className="text-sm muted mt-3">{c.note}</p>}
            </div>
          ))}
        </div>
      )}

      {editing && <ContactModal contact={editing} onClose={() => setEditing(null)} onSave={save}
        onDelete={() => { if (!confirmDelete(editing.name)) return; set((s) => { s.contacts = s.contacts.filter((x) => x.id !== editing.id); }); setEditing(null); toast('Contact deleted.'); }} />}
      <Disclaimer />
    </div>
  );
}

function ContactModal({ contact, onClose, onSave, onDelete }: { contact: Contact; onClose: () => void; onSave: (c: Contact) => void; onDelete: () => void }) {
  const [c, setC] = useState(contact);
  const up = (p: Partial<Contact>) => setC({ ...c, ...p });
  return (
    <Modal title={contact.id ? 'Edit contact' : 'Add a contact'} onClose={onClose} footer={<>
      {contact.id && <button className="btn-danger" onClick={onDelete}>Delete</button>}
      <div className="flex-1" />
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn" onClick={() => onSave(c)}>Save</button>
    </>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name"><input autoFocus className="input" value={c.name} onChange={(e) => up({ name: e.target.value })} /></Field>
        <Field label="Organisation"><input className="input" value={c.org} onChange={(e) => up({ org: e.target.value })} /></Field>
      </div>
      <div>
        <span className="label">Categories</span>
        <div className="flex flex-wrap gap-2">
          {CONTACT_CATEGORIES.map((x) => {
            const on = c.categories.includes(x);
            return <button type="button" key={x} onClick={() => up({ categories: on ? c.categories.filter((y) => y !== x) : [...c.categories, x] })}
              className={`rounded-full px-3 py-1 text-xs font-medium border cursor-pointer ${on ? 'bg-teal text-white border-teal' : 'border-line'}`}>{x}</button>;
          })}
        </div>
      </div>
      <Field label="Website"><input className="input" type="url" placeholder="https://" value={c.url} onChange={(e) => up({ url: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email"><input className="input" type="email" value={c.email} onChange={(e) => up({ email: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" type="tel" value={c.phone} onChange={(e) => up({ phone: e.target.value })} /></Field>
      </div>
      <Field label="Note"><textarea className="input" value={c.note} onChange={(e) => up({ note: e.target.value })} /></Field>
    </Modal>
  );
}
