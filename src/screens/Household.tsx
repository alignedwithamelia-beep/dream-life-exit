import { useState } from 'react';
import { UserRound, Check, Download, Lock, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Avatar, Disclaimer, Field, Modal, PageHeader } from '../components/ui';
import { Checkbox } from '../components/controls';
import { MEMBER_TONES } from '../lib/theme';
import { DEST_STATUS, label, MOVING, STAGES, TIMEFRAMES, uid } from '../lib/defaults';
import { fmtDate } from '../lib/logic';
import { useHub } from '../lib/store';
import type { Member, Profile } from '../lib/types';
import { ProfileForm } from './Onboarding';

export default function Household() {
  const { state, set, toast, mode, resetDemo, deleteEverything } = useHub();
  const p = state.profile;
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const remote = mode === 'remote';

  const info: [string, string][] = [
    ['Name', p.name], ['Moving', label(MOVING, p.moving)],
    ['Destination', [p.country, label(DEST_STATUS, p.destinationStatus)].filter(Boolean).join(' · ')],
    ['Timeframe', [label(TIMEFRAMES, p.timeframe), p.targetDate && `Target ${fmtDate(p.targetDate)}`].filter(Boolean).join(' · ')],
    ['Current stage', label(STAGES, p.stage)], ['Top priorities', p.priorities.join(', ')], ['Biggest concern', p.concern],
  ];

  function exportData() {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dream-life-exit-hub-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function saveMember(m: Member) {
    if (!m.name.trim()) { toast('Please add a name.'); return; }
    set((s) => { if (m.id) Object.assign(s.members.find((x) => x.id === m.id)!, m); else s.members.push({ ...m, id: uid() }); });
    setMember(null);
    toast(m.id ? 'Saved.' : 'Person added.');
  }

  function removeMember(m: Member) {
    if (!window.confirm(`Remove ${m.name}? Tasks, dates and documents linked to them will move to the whole household.`)) return;
    set((s) => {
      s.members = s.members.filter((x) => x.id !== m.id);
      for (const list of [s.tasks, s.dates, s.docs]) list.forEach((x) => { if (x.memberId === m.id) x.memberId = ''; });
    });
    setMember(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Household & Profile" title={<>Your move, <em>your people</em>.</>} icon={<UserRound size={28} />}
        sub="Your answers personalise the Hub. Add each person moving with you so tasks, dates and documents can be linked to them." />

      <section className="card">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h2 className="text-xl">About your move</h2>
          <button className="btn-outline" onClick={() => setEditProfile(structuredClone(p))}><Pencil size={14} /> Edit my answers</button>
        </div>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {info.map(([k, v]) => (
            <div key={k} className={k === 'Biggest concern' ? 'sm:col-span-2 lg:col-span-3' : ''}>
              <dt className="eyebrow !text-[10px] mb-1">{k}</dt>
              <dd className={`text-sm ${v ? '' : 'muted'}`}>{v || 'Not set'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h2 className="text-xl">Household members</h2>
          <button className="btn" onClick={() => setMember({ id: '', name: '', relation: '', isChild: false })}><Plus size={15} /> Add a person</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-field/60 p-4">
              <Avatar name={m.name} tone={MEMBER_TONES[state.members.indexOf(m) % MEMBER_TONES.length]} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.name}</div>
                <div className="text-xs muted">{[m.relation, m.isChild && 'child'].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="p-2 rounded-full hover:bg-beige cursor-pointer" aria-label="Edit" onClick={() => setMember(m)}><Pencil size={15} /></button>
            </div>
          ))}
        </div>
        <p className="text-xs muted mt-4">For children, a first name is enough. Please keep their documents to what you really need.</p>
      </section>

      <section className="card">
        <h2 className="text-xl mb-5">What your coach can see</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-sage-soft p-5">
            <div className="flex items-center gap-2 font-semibold mb-3"><Check size={17} className="text-sage" /> Shared with your coach</div>
            <ul className="text-sm space-y-1.5 list-disc pl-5"><li>Four-Week Game Plan, your ticks, reflections and notes on it</li><li>Your answers in About your move</li><li>Checklist progress: totals and progress by area (not your notes)</li><li>How many adults and children are moving</li></ul>
          </div>
          <div className="rounded-2xl bg-beige/70 p-5">
            <div className="flex items-center gap-2 font-semibold mb-3"><Lock size={16} className="text-ink/70" /> Private to you</div>
            <ul className="text-sm space-y-1.5 list-disc pl-5"><li>Document Vault</li><li>Dream Life Planner and journal</li><li>Contacts and dates</li><li>Task notes, links and household names</li></ul>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl mb-2">Your information</h2>
        <p className="text-sm muted mb-5">
          {remote ? 'Download everything as a file at any time, or delete everything you’ve added. To close your account completely, ask your coach.'
            : 'In the full version you’ll be able to download everything as a file and delete your account. For now, this works on what’s saved in this browser.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={exportData}><Download size={15} /> Export my information</button>
          {!remote && <button className="btn-outline" onClick={resetDemo}><RotateCcw size={15} /> Reset to demo data</button>}
          <button className="btn-danger" onClick={() => setConfirmDel(true)}><Trash2 size={15} /> Delete everything</button>
        </div>
      </section>

      {editProfile && (
        <Modal wide title="Edit my answers" onClose={() => setEditProfile(null)} footer={<>
          <div className="flex-1" />
          <button className="btn-outline" onClick={() => setEditProfile(null)}>Cancel</button>
          <button className="btn" onClick={() => { set((s) => { s.profile = editProfile; }); setEditProfile(null); toast('Your answers are saved.'); }}>Save</button>
        </>}>
          <ProfileForm p={editProfile} up={(patch) => setEditProfile({ ...editProfile, ...patch })} />
        </Modal>
      )}

      {member && <MemberModal member={member} onClose={() => setMember(null)} onSave={saveMember} onRemove={() => removeMember(member)} />}

      {confirmDel && (
        <Modal title="Delete everything?" onClose={() => setConfirmDel(false)} footer={<>
          <div className="flex-1" />
          <button className="btn-outline" onClick={() => setConfirmDel(false)}>Cancel</button>
          <button className="btn !bg-danger" onClick={async () => { setConfirmDel(false); await deleteEverything(); }}>Yes, delete everything</button>
        </>}>
          <p className="text-sm leading-relaxed">This removes your checklist, plan notes, documents, dates, planner, journal and contacts{remote ? ' from your account' : ' from this browser'}. It can’t be undone. You might like to export your information first.</p>
        </Modal>
      )}
      <Disclaimer />
    </div>
  );
}

function MemberModal({ member, onClose, onSave, onRemove }: { member: Member; onClose: () => void; onSave: (m: Member) => void; onRemove: () => void }) {
  const [m, setM] = useState(member);
  return (
    <Modal title={member.id ? 'Edit person' : 'Add a person'} onClose={onClose} footer={<>
      {member.id && <button className="btn-danger" onClick={onRemove}>Remove</button>}
      <div className="flex-1" />
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn" onClick={() => onSave(m)}>Save</button>
    </>}>
      <Field label="Name"><input autoFocus className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field>
      <Field label="Relationship" hint="For example Partner, Daughter, Mum"><input className="input" value={m.relation} onChange={(e) => setM({ ...m, relation: e.target.value })} /></Field>
      <Checkbox checked={m.isChild} onChange={(isChild) => setM({ ...m, isChild })} label="This is a child" />
    </Modal>
  );
}
