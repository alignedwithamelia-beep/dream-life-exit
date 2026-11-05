import { useState } from 'react';
import { Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Disclaimer, Empty, PageHeader, StatusCircle } from '../components/ui';
import { uid } from '../lib/defaults';
import { fmtDate, todayISO } from '../lib/logic';
import { useHub } from '../lib/store';
import type { Planner as P } from '../lib/types';

const PROMPTS = [
  'Why do I want to leave the UK?', 'What does my dream life look like?', 'How do I want my days to feel?',
  'What would my ideal daily routine look like?', 'What matters most to me and my family?', 'What am I excited about?',
  'What fears are holding me back?', 'What does my future self believe is possible?',
];

export default function Planner() {
  const { state, set, toast } = useHub();
  const p = state.planner;
  const up = (fn: (p: P) => void) => set((d) => fn(d.planner));
  const [milestone, setMilestone] = useState('');
  const [entry, setEntry] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Dream Life Planner" title={<>Your dream life starts <em>before you leave</em>.</>} icon={<Sparkles size={28} />}
        sub="There are no right answers here. Write what feels true today, and come back to it as your picture becomes clearer." />

      <section className="card">
        <div className="flex items-baseline justify-between mb-3"><h2 className="text-xl">My Dream Life Vision Statement</h2><span className="text-xs muted">Saves as you type</span></div>
        <textarea className="lined w-full rounded-2xl border border-line px-6 pt-[2px] pb-4 font-serif italic text-lg md:text-xl min-h-44 outline-none focus:ring-4 focus:ring-teal/10 resize-y"
          placeholder="In my dream life, I…" value={p.vision} onChange={(e) => up((x) => { x.vision = e.target.value; })} />
      </section>

      <section className="card">
        <h2 className="text-xl mb-1">My top five values</h2>
        <p className="text-sm muted mb-4">The things you want every decision about this move to protect.</p>
        <div className="grid sm:grid-cols-5 gap-3">
          {p.values.map((v, i) => (
            <label key={i} className="flex items-center gap-2 rounded-2xl border border-line bg-field/60 px-3 py-2 focus-within:border-teal">
              <span className="w-7 h-7 rounded-full bg-gold text-white font-serif text-sm grid place-items-center shrink-0">{i + 1}</span>
              <input className="w-full bg-transparent outline-none text-sm font-medium" placeholder="A value" value={v} onChange={(e) => up((x) => { x.values[i] = e.target.value; })} />
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-4">Reflection prompts</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {PROMPTS.map((q) => (
            <div key={q} className="card !p-5">
              <div className="font-serif text-[17px] mb-3">{q}</div>
              <textarea className="input" placeholder="Write freely…" value={p.prompts[q] ?? ''} onChange={(e) => up((x) => { x.prompts[q] = e.target.value; })} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-4">Looking ahead</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(['m12', 'm18', 'm24'] as const).map((k) => (
            <div key={k} className="card !p-5">
              <div className="eyebrow mb-3">{k.slice(1)} months from now</div>
              <textarea className="input !min-h-32" placeholder="Where are you? What has changed?" value={p.ahead[k]} onChange={(e) => up((x) => { x.ahead[k] = e.target.value; })} />
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl mb-4">Personal milestones</h2>
        <div className="space-y-2 mb-3">
          {p.milestones.map((m, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${m.done ? 'bg-sage-soft border-sage/40' : 'border-line bg-field/60'}`}>
              <StatusCircle status={m.done ? 'done' : 'open'} onClick={() => up((x) => { x.milestones[i].done = !x.milestones[i].done; })} />
              <span className={`flex-1 text-sm ${m.done ? 'line-through text-muted' : ''}`}>{m.text}</span>
              <button className="p-1 muted hover:text-danger cursor-pointer" aria-label="Delete" onClick={() => up((x) => { x.milestones.splice(i, 1); })}><X size={15} /></button>
            </div>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!milestone.trim()) return; up((x) => { x.milestones.push({ text: milestone.trim(), done: false }); }); setMilestone(''); }}>
          <input className="input" placeholder="Add a milestone" value={milestone} onChange={(e) => setMilestone(e.target.value)} />
          <button className="btn shrink-0"><Plus size={16} /> Add</button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-xl mb-4">Journal</h2>
        <textarea className="input !min-h-28 mb-3" placeholder="How are you feeling about the move today?" value={entry} onChange={(e) => setEntry(e.target.value)} />
        <button className="btn mb-6" disabled={!entry.trim()} onClick={() => {
          up((x) => { x.journal.unshift({ id: uid(), date: todayISO(), text: entry.trim() }); });
          setEntry(''); toast('Journal entry saved.');
        }}>Save entry</button>
        {p.journal.length === 0 ? <Empty>Your entries will appear here, newest first.</Empty> : (
          <div className="space-y-3">
            {p.journal.map((j) => (
              <div key={j.id} className="rounded-2xl bg-cream/80 border border-line p-4 flex gap-3">
                <div className="flex-1">
                  <div className="eyebrow !text-[10px] mb-1">{fmtDate(j.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{j.text}</p>
                </div>
                <button className="p-1.5 muted hover:text-danger cursor-pointer self-start" aria-label="Delete entry"
                  onClick={() => window.confirm('Delete this journal entry?') && up((x) => { x.journal = x.journal.filter((e) => e.id !== j.id); })}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </section>
      <Disclaimer />
    </div>
  );
}
