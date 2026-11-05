import { useState } from 'react';
import { Check, Flag, Map as MapIcon, Plus, Quote, Star, X } from 'lucide-react';
import { Disclaimer, PageHeader, Progress, Ring, StatusCircle } from '../components/ui';
import { planDone, planTotal, weekDone, weekTotal } from '../lib/logic';
import { useHub } from '../lib/store';
import type { Week } from '../lib/types';

export default function Plan() {
  const { state, set } = useHub();
  const plan = state.plan;
  const [sel, setSel] = useState(plan.currentWeek - 1);
  const [extra, setExtra] = useState('');
  const w = plan.weeks[sel];
  const upWeek = (fn: (w: Week) => void) => set((d) => fn(d.plan.weeks[sel]));
  const pct = (wk: Week) => Math.round((weekDone(wk) / weekTotal(wk)) * 100);

  return (
    <div>
      <PageHeader eyebrow="My Four-Week Game Plan" title={<>Your next <em>stepping stone</em>.</>} icon={<MapIcon size={28} />}>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {plan.personalised && <span className="chip !bg-gold-soft !text-ink !text-xs !px-3 !py-1 border border-gold/25"><Star size={12} className="text-gold fill-gold" /> Personalised by your coach</span>}
          <span className="text-sm muted">You’re in week {plan.currentWeek} · {planDone(plan)} of {planTotal(plan)} steps done overall</span>
        </div>
      </PageHeader>

      {plan.coachNote && (
        <div className="relative rounded-[24px] bg-navy text-white p-7 md:p-8 mb-8 overflow-hidden shadow-[0_20px_40px_-24px_rgba(30,42,71,0.7)]">
          <Quote size={90} className="absolute -right-2 -top-3 text-white/5" />
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-full bg-gold grid place-items-center font-serif">C</span>
            <div className="text-[11px] tracking-[0.2em] font-bold text-gold">A NOTE FROM YOUR COACH</div>
          </div>
          <p className="font-serif text-lg md:text-xl leading-relaxed whitespace-pre-line text-white/90 relative">{plan.coachNote}</p>
        </div>
      )}

      {/* Stepping stones: the four weeks as a path */}
      <div className="relative mb-8">
        <svg className="absolute left-0 right-0 top-[38px] w-full h-6 hidden md:block" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
          <path d="M40 12 C 100 -4, 140 28, 200 12 S 300 -4, 360 12" fill="none" stroke="#B8913A" strokeOpacity=".5" strokeWidth="1.6" strokeDasharray="4 6" />
        </svg>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
          {plan.weeks.map((wk, i) => {
            const isNow = i + 1 === plan.currentWeek;
            const done = pct(wk) === 100;
            return (
              <button key={i} onClick={() => setSel(i)}
                className={`group flex flex-col items-center text-center rounded-[22px] p-4 pt-3 transition cursor-pointer ${i === sel ? 'bg-teal-soft/80 ring-1 ring-teal/40' : 'hover:bg-paper'}`}>
                <div className="relative mb-2">
                  <Ring pct={pct(wk)} size={58} stroke={5} tone={done ? 'sage' : 'teal'}>
                    <span className={`w-10 h-10 rounded-full grid place-items-center font-serif text-lg ${done ? 'bg-sage text-white' : i === sel ? 'bg-teal text-white' : 'bg-paper border border-line'}`}>
                      {done ? <Check size={18} strokeWidth={3} /> : i + 1}
                    </span>
                  </Ring>
                  {isNow && <span className="absolute -top-1 -right-4 text-[9px] font-bold tracking-wider rounded-full bg-gold text-white px-2 py-0.5 shadow">NOW</span>}
                </div>
                <div className="text-[10px] tracking-[0.18em] font-bold text-muted/80">WEEK {i + 1}</div>
                <div className="font-serif text-[16px] leading-snug">{wk.theme}</div>
                <div className="text-[11px] muted mt-0.5">{weekDone(wk)} of {weekTotal(wk)} done</div>
              </button>
            );
          })}
        </div>
      </div>

      <section className="card md:!p-10 overflow-hidden" key={sel}>
        <span className="absolute right-6 md:right-10 -top-4 font-serif text-[150px] md:text-[220px] leading-none text-teal/[0.06] select-none pointer-events-none">0{sel + 1}</span>
        <div className="eyebrow mb-1 relative">Week {sel + 1} · {w.subLabel}</div>
        <div className="font-serif text-5xl md:text-[84px] text-teal uppercase leading-[0.95] my-3 break-words relative fade-in">{w.theme}</div>
        <p className="text-lg muted max-w-2xl mb-7 relative">{w.focus}</p>

        <div className="flex items-center gap-4 mb-9 rounded-2xl bg-cream/70 px-5 py-3.5">
          <Flag size={16} className="text-gold shrink-0" />
          <span className="text-sm font-semibold whitespace-nowrap">This week · {weekDone(w)} of {weekTotal(w)} done</span>
          <Progress pct={pct(w)} className="flex-1" />
        </div>

        <h3 className="text-lg mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-teal text-white text-xs grid place-items-center font-sans font-bold">3</span>Three priority actions</h3>
        <div className="space-y-2 mb-8">
          {w.actions.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${a.done ? 'bg-sage-soft border-sage/40' : 'border-line bg-field/60'}`}>
              <StatusCircle status={a.done ? 'done' : 'open'} onClick={() => upWeek((x) => { x.actions[i].done = !x.actions[i].done; })} />
              <span className={`text-sm font-medium ${a.done ? 'line-through text-muted' : ''}`}>{a.text}</span>
            </div>
          ))}
        </div>

        <h3 className="text-lg mb-3">Your extra tasks</h3>
        <div className="space-y-2 mb-3">
          {w.extras.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${a.done ? 'bg-sage-soft border-sage/40' : 'border-line bg-field/60'}`}>
              <StatusCircle status={a.done ? 'done' : 'open'} onClick={() => upWeek((x) => { x.extras[i].done = !x.extras[i].done; })} />
              <span className={`text-sm flex-1 ${a.done ? 'line-through text-muted' : ''}`}>{a.text}</span>
              <button className="p-1 muted hover:text-danger cursor-pointer" aria-label="Remove" onClick={() => upWeek((x) => { x.extras.splice(i, 1); })}><X size={15} /></button>
            </div>
          ))}
        </div>
        <form className="flex gap-2 mb-8" onSubmit={(e) => { e.preventDefault(); if (!extra.trim()) return; upWeek((x) => { x.extras.push({ text: extra.trim(), done: false }); }); setExtra(''); }}>
          <input className="input" placeholder="Add your own task for this week" value={extra} onChange={(e) => setExtra(e.target.value)} />
          <button className="btn shrink-0"><Plus size={16} /> Add</button>
        </form>

        <div className="rounded-[20px] border-2 border-dashed border-gold/60 bg-warn/50 p-5 mb-8">
          <div className="eyebrow !text-gold mb-2">Weekly milestone</div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="sr-only" checked={w.milestoneDone} onChange={() => upWeek((x) => { x.milestoneDone = !x.milestoneDone; })} />
            <span className={`w-6 h-6 rounded-md grid place-items-center border-2 shrink-0 ${w.milestoneDone ? 'bg-sage border-sage text-white' : 'border-gold bg-field'}`}>{w.milestoneDone && <Check size={14} strokeWidth={3} />}</span>
            <span className={`font-serif text-lg ${w.milestoneDone ? 'line-through text-muted' : ''}`}>{w.milestone}</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg mb-1">Reflection</h3>
            <p className="font-serif italic text-teal mb-3">{w.reflectionQ}</p>
            <textarea className="input !min-h-36" placeholder="Take a quiet moment and write what comes up." value={w.reflectionA} onChange={(e) => upWeek((x) => { x.reflectionA = e.target.value; })} />
          </div>
          <div>
            <h3 className="text-lg mb-1">My notes for this week</h3>
            <p className="text-sm muted mb-3">Part of your plan, so your coach can see these too.</p>
            <textarea className="input !min-h-36" placeholder="Ideas, questions for your coach, things to remember." value={w.notes} onChange={(e) => upWeek((x) => { x.notes = e.target.value; })} />
          </div>
        </div>
      </section>
      <Disclaimer />
    </div>
  );
}
