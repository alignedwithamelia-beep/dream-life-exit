// Coach > one client: everything the client shares, in one place.
// Never shows the vault, journal, dates or contacts: those stay private to the client.
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Compass, Flag, Lock, MessageCircleHeart, NotebookPen, Pencil, Plane, Star } from 'lucide-react';
import { Avatar, CardTitle, Empty, IconTile, PageHeader, Progress, Ring } from '../components/ui';
import { AccessPill, timeAgo } from './Coach';
import { useCoach } from '../lib/coach';
import { DEST_STATUS, label, MOVING, STAGES, STATUSES, TIMEFRAMES } from '../lib/defaults';
import { daysUntil, fmtDate, planDone, planTotal, weekDone, weekTotal } from '../lib/logic';
import { catStyle } from '../lib/theme';

export default function CoachClient() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { clients, loading, setAccess } = useCoach();
  const c = clients.find((x) => x.id === id);

  if (loading) return <div className="muted text-sm">Loading…</div>;
  if (!c) return <div className="card"><Empty>We couldn’t find that client.</Empty><Link to="/coach" className="link">Back to my clients</Link></div>;

  const s = c.summary;
  const p = s?.profile;
  const plan = c.plan;
  const first = c.name.split(' ')[0];
  const days = p?.targetDate ? daysUntil(p.targetDate) : null;

  return (
    <div className="space-y-6">
      <Link to="/coach" className="link"><ArrowLeft size={14} /> My clients</Link>

      {/* Header */}
      <section className="card !p-0 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-teal-soft via-sand to-gold-soft" />
        <div className="px-6 md:px-8 pb-6 -mt-10 flex flex-col md:flex-row md:items-end gap-4">
          <Avatar name={c.name} tone="teal" size={84} />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl leading-tight">{c.name}</h1>
            <div className="text-sm muted">{c.email} · {c.live ? timeAgo(c.lastActive) : 'Sample record'}{c.sessionDate && ` · Game Plan session ${fmtDate(c.sessionDate)}`}</div>
          </div>
          <div className="flex items-center gap-2">
            <AccessPill id={c.id} access={c.access} onChange={setAccess} />
            <button className="btn" onClick={() => navigate(`/coach/plan/${c.id}`)}><Pencil size={14} /> Edit plan</button>
          </div>
        </div>
      </section>

      {!s && (
        <div className="card text-sm muted">
          {c.live ? `${first} hasn’t shared progress yet. It appears here after they next use their Hub.` : 'Sample record: detailed progress is only available for real and live-demo clients.'}
        </div>
      )}

      {/* Journey + headline numbers */}
      <section className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="card">
          <CardTitle icon={Plane} tone="gold">Their move</CardTitle>
          <div className="grid grid-cols-2 gap-5">
            <Fact label="Destination" value={p?.country || 'Not decided'} sub={label(DEST_STATUS, p?.destinationStatus ?? '')} />
            <Fact label="Moving" value={p?.targetDate ? fmtDate(p.targetDate) : label(TIMEFRAMES, p?.timeframe ?? '') || 'Not set'}
              sub={days !== null ? (days >= 0 ? `${days} days to go` : 'Date has passed') : ''} />
            <Fact label="Household" value={label(MOVING, p?.moving ?? '') || '—'}
              sub={s ? `${s.household.adults} adult${s.household.adults === 1 ? '' : 's'}${s.household.children ? `, ${s.household.children} child${s.household.children === 1 ? '' : 'ren'}` : ''}` : ''} />
            <Fact label="Stage" value={label(STAGES, p?.stage ?? '') || 'Not set'} />
          </div>
          {p?.priorities.length ? (
            <div className="mt-5">
              <div className="text-[10px] tracking-[0.2em] font-bold muted mb-2">TOP PRIORITIES</div>
              <div className="flex flex-wrap gap-2">
                {p.priorities.map((x) => { const cs = catStyle(x); return <span key={x} className="chip !text-xs !py-1 !pl-1"><IconTile icon={cs.icon} tone={cs.tone} size="sm" />{x}</span>; })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <CardTitle icon={MessageCircleHeart} tone="terracotta">Biggest concern</CardTitle>
          {p?.concern ? <p className="font-serif italic text-lg leading-relaxed">“{p.concern}”</p> : <Empty>Not shared yet.</Empty>}
          <p className="text-xs muted mt-4">A good place to start your next session.</p>
        </div>
      </section>

      {/* Progress */}
      <section className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="card">
          <CardTitle icon={Check} tone="teal">Checklist</CardTitle>
          <div className="flex items-center gap-5 mb-5">
            <Ring pct={c.pct} size={112} stroke={10}>
              <div><div className="font-serif text-3xl text-teal leading-none">{c.pct}%</div><div className="text-[10px] font-bold tracking-widest muted mt-1">DONE</div></div>
            </Ring>
            {s && (
              <div className="space-y-1.5 text-sm">
                <div><b className="font-semibold">{s.checklist.done}</b> of {s.checklist.total} applicable tasks</div>
                {STATUSES.map(([k, l]) => <div key={k} className="text-xs muted">{l}: <b className="text-ink font-semibold">{s.checklist.byStatus[k]}</b></div>)}
              </div>
            )}
          </div>
          {s && s.checklist.overdue > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-terracotta-soft text-terracotta px-3 py-2 text-sm font-medium">
              <AlertTriangle size={15} /> {s.checklist.overdue} task{s.checklist.overdue === 1 ? ' is' : 's are'} overdue
            </div>
          )}
        </div>

        <div className="card">
          <CardTitle icon={Compass} tone="sky">Progress by area</CardTitle>
          {s ? (
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {s.checklist.byCategory.map((x) => {
                const cs = catStyle(x.category);
                const prio = p?.priorities.includes(x.category);
                return (
                  <div key={x.category} className="flex items-center gap-3">
                    <IconTile icon={cs.icon} tone={cs.tone} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className="truncate">{x.category}{prio && <Star size={11} className="inline ml-1 fill-gold text-gold" />}</span>
                        <span className="text-xs muted tabular-nums">{x.done}/{x.total}</span>
                      </div>
                      <Progress pct={x.pct} tone={cs.tone} className="mt-1 !h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty>No checklist progress shared yet.</Empty>}
        </div>
      </section>

      {/* Four-week plan, read-only with the client's answers */}
      <section className="card">
        <CardTitle icon={Flag} tone="gold" action={plan && <span className="text-sm muted">{planDone(plan)} of {planTotal(plan)} steps · now in week {plan.currentWeek}</span>}>
          Four-Week Game Plan
        </CardTitle>
        {!plan ? <Empty>No plan assigned yet.</Empty> : (
          <div className="grid md:grid-cols-2 gap-4">
            {plan.weeks.map((w, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${i + 1 === plan.currentWeek ? 'border-teal bg-teal-soft/40' : 'border-line bg-field/40'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="eyebrow !text-[10px]">Week {i + 1}{i + 1 === plan.currentWeek && ' · now'}</span>
                  <span className="text-xs muted">{weekDone(w)}/{weekTotal(w)}</span>
                </div>
                <div className="font-serif text-xl mb-3">{w.theme}</div>
                <ul className="space-y-1.5 mb-3">
                  {[...w.actions, ...w.extras.map((x) => ({ ...x, extra: true }))].map((a, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 w-4 h-4 rounded-full grid place-items-center shrink-0 ${a.done ? 'bg-sage text-white' : 'border-2 border-ink/20'}`}>{a.done && <Check size={10} strokeWidth={3} />}</span>
                      <span className={a.done ? 'line-through muted' : ''}>{a.text}{'extra' in a && <span className="chip ml-1.5 !text-[10px]">their own</span>}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-sm pt-1 border-t border-dashed border-line mt-2">
                    <Flag size={14} className={`mt-0.5 shrink-0 ${w.milestoneDone ? 'text-sage' : 'text-gold'}`} />
                    <span className={w.milestoneDone ? 'line-through muted' : 'font-medium'}>{w.milestone}</span>
                  </li>
                </ul>
                {(w.reflectionA || w.notes) && (
                  <div className="space-y-2 rounded-xl bg-paper border border-line p-3">
                    {w.reflectionA && <div><div className="text-[10px] font-bold tracking-wider muted mb-0.5">THEIR REFLECTION · {w.reflectionQ}</div><p className="text-sm font-serif italic">{w.reflectionA}</p></div>}
                    {w.notes && <div><div className="text-[10px] font-bold tracking-wider muted mb-0.5 flex items-center gap-1"><NotebookPen size={10} /> THEIR NOTES</div><p className="text-sm whitespace-pre-line">{w.notes}</p></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-sm muted flex items-center gap-2"><Lock size={14} /> {first}’s Document Vault, journal, dates and contacts are private. They aren’t shown here.</p>
    </div>
  );
}

function Fact({ label: l, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] tracking-[0.2em] font-bold muted uppercase mb-1">{l}</div>
      <div className="font-serif text-lg leading-tight truncate">{value}</div>
      {sub && <div className="text-xs muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
