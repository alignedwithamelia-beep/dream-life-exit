import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Moon, Sun, BookHeart, CalendarDays, CheckSquare, Contact, FileImage, FileText, Footprints, FolderLock, Map, Plane, Plus,
} from 'lucide-react';
import { Avatar, CardTitle, DateBadge, Disclaimer, Empty, Illustration, Ring, StatusCircle } from '../components/ui';
import { DEST_STATUS, label, MOVING, STAGES, TIMEFRAMES } from '../lib/defaults';
import { checklistStats, comingUp, daysUntil, fmtDate, fmtShort, inDays, memberName, nextSteps, weekDone, weekTotal } from '../lib/logic';
import { useHub } from '../lib/store';
import { greeting, Horizon, VisionPostcard } from './HomeExtras';
import { catStyle, DATE_STYLE, MEMBER_TONES, TONE, type Tone } from '../lib/theme';

const HUB: { to: string; icon: typeof Map; title: string; text: string; tone: Tone }[] = [
  { to: '/vault', icon: FolderLock, title: 'My Document Vault', text: 'Keep every important paper in one organised place.', tone: 'navy' },
  { to: '/checklist', icon: CheckSquare, title: 'My Exit Checklist', text: 'See what is done, what is next and what you can skip.', tone: 'teal' },
  { to: '/plan', icon: Map, title: 'My Four-Week Game Plan', text: 'Your personalised actions from the Game Plan session.', tone: 'gold' },
  { to: '/dates', icon: CalendarDays, title: 'My Important Dates', text: 'Appointments, renewals and deadlines on one timeline.', tone: 'terracotta' },
  { to: '/planner', icon: BookHeart, title: 'My Dream Life Planner', text: 'Your vision, values and reflections.', tone: 'plum' },
  { to: '/contacts', icon: Contact, title: 'My Contacts & Useful Links', text: 'Official sources and the people helping you.', tone: 'sky' },
];

function PassField({ label: l, value, sub, big }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] tracking-[0.2em] font-bold text-muted/80 uppercase mb-1">{l}</div>
      <div className={`font-serif leading-tight truncate ${big ? 'text-[28px]' : 'text-lg'}`}>{value || '—'}</div>
      {sub && <div className="text-xs muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

export default function Home() {
  const { state, set, fresh, theme } = useHub();
  const navigate = useNavigate();
  const p = state.profile;
  const stats = checklistStats(state.tasks);
  const week = state.plan.weeks[state.plan.currentWeek - 1];
  const steps = nextSteps(state.tasks);
  const upcoming = comingUp(state.dates);
  const docs = [...state.docs].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 3);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const days = p.targetDate ? daysUntil(p.targetDate) : null;

  return (
    <div className="space-y-7">
      {/* Hero */}
      <section className="card !p-0 overflow-hidden grid md:grid-cols-[1.35fr_1fr] fade-in">
        <div className="p-7 md:p-11 relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-soft text-warn-ink px-3 py-1 text-[11px] font-bold tracking-[0.16em] uppercase mb-5">
            {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}{greeting()} · {today}
          </div>
          <h1 className="text-[36px] md:text-[52px] leading-[1.02] mb-3">
            {fresh ? <>Welcome, <em>{p.name || 'friend'}</em>.</> : <>Welcome back{p.name && <>, <em>{p.name}</em></>}.</>}
          </h1>
          <p className="muted text-lg mb-8 max-w-md">{fresh ? 'Let’s get organised. One small step at a time.' : 'You’re one step closer to your dream life.'}</p>
          <div className="flex flex-wrap items-center gap-5">
            <button className="btn-gold !px-7 !py-3.5" onClick={() => navigate('/plan')}>Continue My Game Plan <ArrowRight size={16} /></button>
            <Link to="/checklist" className="link">Open my checklist</Link>
          </div>
        </div>
        <div className="hidden md:block relative min-h-[260px]"><Illustration className="absolute inset-0 w-full h-full" /></div>
      </section>

      {/* Boarding pass */}
      <section className="fade-in">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xl flex items-center gap-2">My Relocation Journey</h2>
          <Link to="/household" className="link">Edit details</Link>
        </div>
        <div className="grid md:grid-cols-[1fr_230px] rounded-[26px] bg-paper border border-line shadow-[0_18px_40px_-24px_rgba(30,42,71,0.35)]">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4 mb-7">
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.2em] font-bold text-muted/80">FROM</div>
                <div className="font-serif text-3xl md:text-4xl">UK</div>
                <div className="text-xs muted">United Kingdom</div>
              </div>
              <div className="flex-1 relative h-12 min-w-16">
                <svg viewBox="0 0 200 48" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
                  <path d="M4 40 Q100 -8 196 40" fill="none" stroke="#3F7F78" strokeWidth="1.6" strokeDasharray="5 5" className="draw" />
                </svg>
                <span className="absolute left-1/2 -translate-x-1/2 -top-1 w-8 h-8 rounded-full bg-gold text-white grid place-items-center shadow-md"><Plane size={15} className="rotate-45" /></span>
              </div>
              <div className="min-w-0 text-right">
                <div className="text-[10px] tracking-[0.2em] font-bold text-muted/80">TO</div>
                <div className="font-serif text-3xl md:text-4xl truncate">{p.country ? p.country.slice(0, 3).toUpperCase() : '???'}</div>
                <div className="text-xs muted truncate">{p.country || 'Not decided yet'}{p.destinationStatus && ` · ${label(DEST_STATUS, p.destinationStatus)}`}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 pt-6 border-t border-dashed border-line">
              <PassField label="Departs" value={p.targetDate ? fmtDate(p.targetDate, { day: 'numeric', month: 'short', year: 'numeric' }) : label(TIMEFRAMES, p.timeframe) || 'Not set yet'}
                sub={p.targetDate ? (days !== null && days >= 0 ? `${days} days to go` : 'Date has passed') : label(STAGES, p.stage)} />
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.2em] font-bold text-muted/80 uppercase mb-1.5">Passengers</div>
                <div className="flex -space-x-2 mb-1">
                  {state.members.slice(0, 5).map((m, i) => <Avatar key={m.id} name={m.name} tone={MEMBER_TONES[i % MEMBER_TONES.length]} size={30} />)}
                </div>
                <div className="text-xs muted truncate">{state.members.map((m) => m.name).join(', ')}{p.moving && ` · ${label(MOVING, p.moving)}`}</div>
              </div>
              <PassField label="Game Plan" value={`Week ${state.plan.currentWeek} · ${week.theme}`} sub={`${weekDone(week)} of ${weekTotal(week)} done this week`} />
            </div>
          </div>
          <div className="perforated border-t md:border-t-0 md:border-l-2 border-dashed border-line p-6 flex md:flex-col items-center justify-center gap-5 text-center">
            <Ring pct={stats.pct} size={132} stroke={11}>
              <div><div className="font-serif text-[34px] leading-none text-teal">{stats.pct}%</div><div className="text-[10px] tracking-widest font-bold muted mt-1">CHECKLIST</div></div>
            </Ring>
            <div className="text-left md:text-center">
              <div className="text-sm font-semibold">{stats.done} of {stats.total} tasks complete</div>
              <p className="text-[11px] muted mt-1 max-w-[190px] leading-snug">Tracks your own preparation, not whether you meet any country’s legal requirements.</p>
            </div>
          </div>
        </div>
      </section>

      <Horizon state={state} />

      {/* Three columns */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="card">
          <CardTitle icon={Footprints} tone="gold">Your next stepping stones</CardTitle>
          {steps.length === 0 ? <Empty>Nothing open. Lovely work.</Empty> : (
            <ul className="space-y-1">
              {steps.map((t) => {
                const cs = catStyle(t.category);
                return (
                  <li key={t.id} className="flex gap-3 items-start rounded-xl p-2 -mx-2 hover:bg-cream/70 transition">
                    <StatusCircle status={t.status} onClick={() => set((d) => { d.tasks.find((x) => x.id === t.id)!.status = 'completed'; })} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-snug">{t.title}</div>
                      <div className="text-xs muted mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`w-1.5 h-1.5 rounded-full ${TONE[cs.tone].bg}`} />{t.category}
                        {t.due && <> · {fmtShort(t.due)}</>}{t.memberId && <> · {memberName(state, t.memberId)}</>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <CardTitle icon={CalendarDays} tone="terracotta" action={upcoming.length > 0 && <Link to="/dates" className="link">All dates</Link>}>Coming up</CardTitle>
          {upcoming.length === 0 ? (
            <div><Empty>No dates yet.</Empty><Link to="/dates?add=1" className="btn-outline !text-xs !py-2"><Plus size={14} /> Add an important date</Link></div>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((d) => (
                <li key={d.id} className="flex gap-3 items-center">
                  <DateBadge iso={d.date} tone={DATE_STYLE[d.category] ?? 'teal'} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="text-xs muted">{inDays(d.date)} · {d.category}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <CardTitle icon={FolderLock} tone="navy" action={<Link to="/vault" className="link">Vault</Link>}>Recent documents</CardTitle>
          {docs.length === 0 ? <Empty>Nothing in your vault yet.</Empty> : (
            <ul className="space-y-3">
              {docs.map((d) => (
                <li key={d.id} className="flex gap-3 items-center">
                  <span className="w-10 h-12 rounded-lg bg-field border border-line text-terracotta grid place-items-center shrink-0 shadow-sm relative">
                    {d.type === 'PDF' ? <FileText size={17} /> : <FileImage size={17} className="text-sky" />}
                    <span className="absolute -bottom-1.5 text-[8px] font-bold bg-paper px-1 rounded text-ink/60">{d.type}</span>
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs muted truncate">{state.folders.find((f) => f.id === d.folderId)?.name}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <VisionPostcard state={state} />

      {/* Hub shortcuts */}
      <section>
        <h2 className="text-xl mb-4 px-1">Your Hub</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HUB.map(({ to, icon: Icon, title, text, tone }) => (
            <Link key={to} to={to} className="card lift !p-5 flex gap-4 items-start group overflow-hidden">
              <span className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${TONE[tone].soft} opacity-60 group-hover:scale-125 transition duration-500`} />
              <span className={`relative w-12 h-12 rounded-2xl ${TONE[tone].bg} text-white grid place-items-center shrink-0 shadow-md -rotate-3 group-hover:rotate-0 transition`}><Icon size={21} /></span>
              <div className="relative flex-1">
                <div className="font-serif text-[17px] mb-1 flex items-center gap-1">{title}<ArrowUpRight size={15} className="opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition" /></div>
                <div className="text-sm muted leading-snug">{text}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <Disclaimer />
    </div>
  );
}
