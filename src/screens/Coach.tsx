import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Copy, LayoutTemplate, Lock, MailOpen, RotateCw, Send, Users } from 'lucide-react';
import { Avatar, CardTitle, Empty, Field, PageHeader, Ring } from '../components/ui';
import { DateInput, Select } from '../components/controls';
import { MEMBER_TONES } from '../lib/theme';
import { useCoach } from '../lib/coach';
import { fmtDate, weekDone, weekTotal } from '../lib/logic';
import { useHub } from '../lib/store';
import type { Access, Plan } from '../lib/types';

const ACCESS: Record<Access, [string, string]> = {
  active: ['Active', 'bg-sage-soft text-ok-ink'],
  invited: ['Invited', 'bg-warn text-warn-ink'],
  paused: ['Access paused', 'bg-orange-soft text-orange-ink'],
};

export function timeAgo(iso?: string) {
  if (!iso) return 'Not yet active';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return 'Active just now';
  if (mins < 60) return `Active ${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `Active ${h} h ago`;
  const d = Math.round(h / 24);
  return `Active ${d} day${d === 1 ? '' : 's'} ago`;
}

export function AccessPill({ id, access, onChange }: { id: string; access: Access; onChange: (id: string, a: Access) => void }) {
  return (
    <Select value={access} onChange={(e) => onChange(id, e.target.value as Access)} aria-label="Access"
      className={`rounded-full px-3 py-1 text-xs font-semibold outline-none ${ACCESS[access][1]}`}>
      {Object.entries(ACCESS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
    </Select>
  );
}

export function CoachClients() {
  const { toast } = useHub();
  const { clients, loading, remote, invite, setAccess, applyTemplate } = useCoach();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'clients' | 'invites'>('clients');
  const [form, setForm] = useState({ name: '', email: '', sessionDate: '' });
  const [sending, setSending] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [templateFor, setTemplateFor] = useState('');

  const members = clients.filter((c) => c.access !== 'invited');
  const invited = clients.filter((c) => c.access === 'invited');
  const active = clients.filter((c) => c.access === 'active');
  const avg = members.length ? Math.round(members.reduce((n, c) => n + c.pct, 0) / members.length) : 0;
  const target = clients.find((c) => c.id === (templateFor || clients[0]?.id));

  async function send(name: string, email: string, sessionDate: string, key: string) {
    setSending(key);
    try {
      const r = await invite(name, email, sessionDate);
      if (r.emailed) toast(`Invitation emailed to ${email}.`);
      else if (r.link) { setLinks((l) => ({ ...l, [email]: r.link! })); toast('Invitation ready. Copy the link to send it.'); }
      else toast('Invitation added.');
      return true;
    } catch (err) { toast((err as Error).message); return false; }
    finally { setSending(null); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { toast('Please add a name and email.'); return; }
    if (await send(form.name.trim(), form.email.trim(), form.sessionDate, 'new')) setForm({ name: '', email: '', sessionDate: '' });
  }

  const stat = (label: string, value: string | number, tone: string) => (
    <div className="card !p-5 flex items-center gap-4">
      <span className={`w-2 self-stretch rounded-full ${tone}`} />
      <div><div className="font-serif text-3xl leading-none">{value}</div><div className="text-xs muted mt-1">{label}</div></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={remote ? 'Coach view' : 'Coach view · Demo'} title={<>Your <em>clients</em></>} icon={<Users size={28} />}
        sub="Invite clients after their Before You Go Game Plan™ session, assign their four-week plan and follow their progress." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stat('Active clients', active.length, 'bg-sage')}
        {stat('Invitations waiting', invited.length, 'bg-gold')}
        {stat('Access paused', clients.filter((c) => c.access === 'paused').length, 'bg-terracotta')}
        {stat('Average checklist', `${avg}%`, 'bg-teal')}
      </div>

      <div className="inline-flex rounded-full bg-beige p-1">
        {([['clients', `Clients · ${members.length}`], ['invites', `Invitations · ${invited.length}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-5 py-2 rounded-full text-sm font-semibold cursor-pointer transition ${tab === k ? 'bg-paper shadow-sm' : 'text-ink/60 hover:text-ink'}`}>{l}</button>
        ))}
      </div>

      {tab === 'clients' ? (
        <section>
          {loading ? <div className="card muted text-sm">Loading…</div> : members.length === 0 ? (
            <div className="card text-center py-10">
              <h2 className="text-xl mb-1">No clients yet</h2>
              <p className="text-sm muted mb-4">Clients appear here once they’ve opened their invitation.</p>
              <button className="btn" onClick={() => setTab('invites')}>Invite a client</button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {members.map((c, i) => {
                const s = c.summary;
                const plan = c.plan;
                return (
                  <div key={c.id} role="link" tabIndex={0} onClick={() => navigate(`/coach/client/${c.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/coach/client/${c.id}`)}
                    className={`card lift !p-5 cursor-pointer group ${c.access === 'paused' ? 'opacity-70' : ''}`}>
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar name={c.name} tone={MEMBER_TONES[i % MEMBER_TONES.length]} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="font-serif text-lg leading-tight truncate group-hover:text-teal transition">{c.name}</div>
                        <div className="text-xs muted truncate">{c.email}</div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}><AccessPill id={c.id} access={c.access} onChange={setAccess} /></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Ring pct={c.pct} size={74} stroke={7}><span className="font-serif text-lg text-teal">{c.pct}%</span></Ring>
                      <div className="flex-1 min-w-0 space-y-1.5 text-sm">
                        <div className="truncate"><span className="muted">Moving to </span><b className="font-semibold">{s?.profile.country || '—'}</b></div>
                        <div className="flex items-center gap-1.5">
                          <span className="muted">Plan</span>
                          {[1, 2, 3, 4].map((w) => {
                            const wk = plan?.weeks[w - 1];
                            const full = wk && weekDone(wk) === weekTotal(wk);
                            return <span key={w} className={`w-5 h-5 rounded-full text-[10px] font-bold grid place-items-center ${full ? 'bg-sage text-white' : w === c.week ? 'bg-teal text-white' : 'bg-beige muted'}`}>{full ? '✓' : w}</span>;
                          })}
                        </div>
                        <div className="text-xs muted">{c.live ? timeAgo(c.lastActive) : 'Sample record'}</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-sm">
                      <span className="text-xs muted">Session {c.sessionDate ? fmtDate(c.sessionDate) : '—'}</span>
                      <span className="link">View progress <ArrowRight size={14} /></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!remote && <p className="text-xs muted mt-3">Only Sarah is connected to the live demo. The others are sample records.</p>}
        </section>
      ) : (
        <section className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
          <div className="card">
            <CardTitle icon={Send} tone="gold">Invite a client</CardTitle>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Client name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Game Plan session date"><DateInput className="input" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} /></Field>
              <button className="btn" disabled={sending === 'new'}><Send size={14} /> {sending === 'new' ? 'Sending…' : 'Send invitation'}</button>
            </form>
            <p className="text-xs muted mt-4">
              {remote ? 'Your client gets a secure link by email. They sign in with that address, no password needed. If email isn’t set up, you’ll get a link to send yourself.'
                : 'Invitation emails aren’t sent from the prototype. Once sign-in is connected, this will email a secure link.'}
            </p>
          </div>

          <div className="card">
            <CardTitle icon={MailOpen} tone="teal">Waiting to join</CardTitle>
            {invited.length === 0 ? <Empty>No open invitations. Everyone you’ve invited has joined.</Empty> : (
              <ul className="divide-y divide-line">
                {invited.map((c, i) => (
                  <li key={c.id} className="py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} tone={MEMBER_TONES[(i + 2) % MEMBER_TONES.length]} size={38} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{c.name}</div>
                        <div className="text-xs muted truncate">{c.email}{c.sessionDate && ` · session ${fmtDate(c.sessionDate)}`}</div>
                      </div>
                      <span className={`chip ${ACCESS.invited[1]}`}>Invited</span>
                      <button className="btn-outline !py-1.5 !px-3.5 !text-xs" disabled={sending === c.id} onClick={() => send(c.name, c.email, c.sessionDate, c.id)}>
                        <RotateCw size={12} /> {sending === c.id ? 'Sending…' : 'Resend'}
                      </button>
                    </div>
                    {links[c.email] && <CopyLink link={links[c.email]} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card">
          <CardTitle icon={Lock} tone="navy">Privacy by design</CardTitle>
          <p className="text-sm leading-relaxed mb-3"><b>You can see:</b> each client’s answers about their move, their checklist progress by area, and their four-week plan with their ticks, reflections and notes.</p>
          <p className="text-sm muted leading-relaxed">You can’t open a client’s Document Vault, journal, dates or contacts. Clients are told exactly what is shared with you.</p>
        </section>
        <section className="card">
          <CardTitle icon={LayoutTemplate} tone="gold">Plan templates</CardTitle>
          {clients.length > 0 ? (
            <div className="space-y-3">
              <Select className="input" value={target?.id ?? ''} onChange={(e) => setTemplateFor(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <button className="btn-outline" onClick={async () => {
                if (!target || !window.confirm(`Replace ${target.name}’s current plan with the starter template?`)) return;
                await applyTemplate(target.id); toast(`Starter template applied to ${target.name}.`);
              }}>Apply starter template to {target?.name.split(' ')[0]}</button>
              <p className="text-xs muted">Replaces the client’s current plan. Their notes on the old plan are removed.</p>
            </div>
          ) : <Empty>Invite a client first.</Empty>}
        </section>
      </div>
    </div>
  );
}

function CopyLink({ link }: { link: string }) {
  const { toast } = useHub();
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly className="input !text-xs !py-2" value={link} onFocus={(e) => e.target.select()} />
      <button className="btn-outline !py-2 shrink-0" onClick={() => { navigator.clipboard.writeText(link); toast('Link copied. It works once.'); }}><Copy size={14} /> Copy</button>
    </div>
  );
}

export function CoachPlan() {
  const { id = '' } = useParams();
  const { toast } = useHub();
  const { clients, loadPlan, savePlan } = useCoach();
  const client = clients.find((c) => c.id === id);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const first = client?.name.split(' ')[0] ?? 'Client';

  useEffect(() => { loadPlan(id).then((p) => setPlan(structuredClone(p))); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan) return <div className="muted text-sm">Loading…</div>;
  const upWeek = (i: number, patch: Partial<Plan['weeks'][number]>) => setPlan({ ...plan, weeks: plan.weeks.map((w, n) => (n === i ? { ...w, ...patch } : w)) });

  async function assign() {
    setSaving(true);
    try { setPlan(structuredClone(await savePlan(id, plan!))); toast(`Plan assigned to ${first}.`); }
    catch { toast('Couldn’t save the plan. Please try again.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <Link to="/coach" className="link">‹ My clients</Link>
      <PageHeader eyebrow="Coach view · Personalise plan" title={`${client?.name ?? 'Client'}’s Four-Week Game Plan`}
        sub="Edit anything below. Changes appear in the client’s Hub straight away. This plan is assigned by you." />

      <section className="card">
        <div className="grid md:grid-cols-[1fr_200px] gap-4">
          <Field label="Note to your client"><textarea className="input" value={plan.coachNote} onChange={(e) => setPlan({ ...plan, coachNote: e.target.value })} /></Field>
          <Field label="Current week"><Select className="input" value={plan.currentWeek} onChange={(e) => setPlan({ ...plan, currentWeek: Number(e.target.value) })}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Week {n}</option>)}</Select></Field>
        </div>
      </section>

      {plan.weeks.map((w, i) => (
        <section key={i} className="card">
          <div className="eyebrow mb-4">Week {i + 1}</div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Field label="Theme"><input className="input" value={w.theme} onChange={(e) => upWeek(i, { theme: e.target.value })} /></Field>
            <Field label="Weekly milestone">
              <div className="relative">
                <input className="input !pr-36" value={w.milestone} onChange={(e) => upWeek(i, { milestone: e.target.value })} />
                {w.milestoneDone && <DoneBadge />}
              </div>
            </Field>
            <Field label="Sub-label"><input className="input" value={w.subLabel} onChange={(e) => upWeek(i, { subLabel: e.target.value })} /></Field>
            <Field label="Weekly focus"><input className="input" value={w.focus} onChange={(e) => upWeek(i, { focus: e.target.value })} /></Field>
          </div>
          <div className="space-y-3 mb-4">
            {w.actions.map((a, j) => (
              <Field key={j} label={`Priority action ${j + 1}`}>
                <div className="relative">
                  <input className="input !pr-36" value={a.text} onChange={(e) => upWeek(i, { actions: w.actions.map((x, n) => (n === j ? { ...x, text: e.target.value } : x)) })} />
                  {a.done && <DoneBadge />}
                </div>
              </Field>
            ))}
          </div>
          <Field label="Reflection question"><input className="input" value={w.reflectionQ} onChange={(e) => upWeek(i, { reflectionQ: e.target.value })} /></Field>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn-gold" disabled={saving} onClick={assign}>{saving ? 'Saving…' : `Assign plan to ${first}`}</button>
      </div>
      <p className="text-sm muted flex items-center gap-2"><Lock size={14} /> {first}’s Document Vault and journal are private. They aren’t shown here.</p>
    </div>
  );
}

function DoneBadge() {
  return <span className="absolute right-2 top-1/2 -translate-y-1/2 chip !bg-sage-soft !text-ok-ink"><Check size={11} /> Done by client</span>;
}
