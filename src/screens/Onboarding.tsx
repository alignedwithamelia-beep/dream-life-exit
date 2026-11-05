import { useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { OptionCard, Field } from '../components/ui';
import { DateInput, Select } from '../components/controls';
import { CATEGORIES, DEST_STATUS, MOVING, STAGES, TIMEFRAMES } from '../lib/defaults';
import { useHub } from '../lib/store';
import type { Profile } from '../lib/types';

type Q = { q: string; help?: string; render: (p: Profile, up: (patch: Partial<Profile>) => void, toast: (m: string) => void) => ReactNode };

const radios = <K extends keyof Profile>(key: K, list: readonly (readonly [string, string])[]) =>
  (p: Profile, up: (patch: Partial<Profile>) => void) => (
    <div className="space-y-2.5">
      {list.map(([v, l]) => <OptionCard key={v} selected={p[key] === v} onClick={() => up({ [key]: v } as Partial<Profile>)}>{l}</OptionCard>)}
    </div>
  );

export function togglePriority(p: Profile, cat: string, toast: (m: string) => void): string[] | null {
  if (p.priorities.includes(cat)) return p.priorities.filter((c) => c !== cat);
  if (p.priorities.length >= 3) { toast('Choose up to three. Untick one to swap.'); return null; }
  return [...p.priorities, cat];
}

export function PriorityPicker({ p, up, toast }: { p: Profile; up: (patch: Partial<Profile>) => void; toast: (m: string) => void }) {
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
      {CATEGORIES.map((c) => (
        <OptionCard key={c} multi selected={p.priorities.includes(c)} onClick={() => { const next = togglePriority(p, c, toast); if (next) up({ priorities: next }); }}>{c}</OptionCard>
      ))}
    </div>
  );
}

const QUESTIONS: Q[] = [
  { q: 'What is your name?', help: 'So we know what to call you.',
    render: (p, up) => <input autoFocus className="input !py-3.5 !text-base" placeholder="Your first name" value={p.name} onChange={(e) => up({ name: e.target.value })} /> },
  { q: 'Are you moving alone, as a couple or with family?', render: radios('moving', MOVING) },
  { q: 'Which country are you considering?', help: 'Not sure yet? Skip this and add it later.',
    render: (p, up) => <input autoFocus className="input !py-3.5 !text-base" placeholder="For example Portugal, Spain or Thailand" value={p.country} onChange={(e) => up({ country: e.target.value })} /> },
  { q: 'Have you chosen a destination or are you still exploring?', render: radios('destinationStatus', DEST_STATUS) },
  { q: 'What is your estimated relocation timeframe?', render: radios('timeframe', TIMEFRAMES) },
  { q: 'What stage are you currently at?', render: radios('stage', STAGES) },
  { q: 'What are your three biggest priorities?', help: 'Choose up to three. We’ll highlight these on your checklist.',
    render: (p, up, toast) => <PriorityPicker p={p} up={up} toast={toast} /> },
  { q: 'What is your biggest concern about moving abroad?', help: 'This helps your coach understand where to start.',
    render: (p, up) => <textarea autoFocus className="input !min-h-32 !text-base" placeholder="Whatever comes to mind is fine." value={p.concern} onChange={(e) => up({ concern: e.target.value })} /> },
];

export default function Onboarding() {
  const { state, set, toast, completeOnboarding } = useHub();
  const [i, setI] = useState(0);
  const p = state.profile;
  const up = (patch: Partial<Profile>) => set((d) => { Object.assign(d.profile, patch); });
  const last = i === QUESTIONS.length - 1;
  const next = () => (last ? completeOnboarding() : setI(i + 1));
  const Q = QUESTIONS[i];

  return (
    <div className="h-[100dvh] overflow-y-auto grid place-items-center p-4">
      <div className="w-full max-w-2xl">
        <div className="card md:!px-10 md:!py-8 fade-in overflow-hidden" key={i}>
          <div className="flex items-center justify-between mb-4">
            <span className="eyebrow">Question {i + 1} of {QUESTIONS.length}</span>
            <button className="text-sm muted hover:text-ink cursor-pointer" onClick={next}>Skip this question</button>
          </div>
          <div className="grid gap-1.5 mb-7" style={{ gridTemplateColumns: `repeat(${QUESTIONS.length}, 1fr)` }}>
            {QUESTIONS.map((_, n) => <div key={n} className={`h-1.5 rounded-full ${n <= i ? 'bg-teal' : 'bg-beige'}`} />)}
          </div>
          <h1 className="text-2xl md:text-[32px] leading-tight mb-2">{Q.q}</h1>
          {Q.help ? <p className="text-sm muted mb-5">{Q.help}</p> : <div className="mb-5" />}
          <form onSubmit={(e) => { e.preventDefault(); next(); }}>
            {Q.render(p, up, toast)}
            <div className="flex items-center justify-between mt-7">
              <button type="button" className={`link !text-ink/70 ${i === 0 ? 'invisible' : ''}`} onClick={() => setI(i - 1)}>‹ Back</button>
              <button className="btn !px-6 !py-3">{last ? 'Create my Hub' : 'Continue'} <ArrowRight size={16} /></button>
            </div>
          </form>
        </div>
        <p className="text-xs muted text-center mt-3">Every question is optional. You can change your answers later in Household &amp; Profile.</p>
      </div>
    </div>
  );
}

/** The same answers as dropdowns, used in Household & Profile. */
export function ProfileForm({ p, up }: { p: Profile; up: (patch: Partial<Profile>) => void }) {
  const { toast } = useHub();
  const sel = <K extends keyof Profile>(key: K, list: readonly (readonly [string, string])[], none = 'Not set') => (
    <Select className="input" value={p[key] as string} onChange={(e) => up({ [key]: e.target.value } as Partial<Profile>)}>
      <option value="">{none}</option>
      {list.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </Select>
  );
  return (
    <>
      <Field label="Name"><input className="input" value={p.name} onChange={(e) => up({ name: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Moving">{sel('moving', MOVING)}</Field>
        <Field label="Country you’re considering"><input className="input" value={p.country} onChange={(e) => up({ country: e.target.value })} /></Field>
        <Field label="Destination status">{sel('destinationStatus', DEST_STATUS)}</Field>
        <Field label="Timeframe">{sel('timeframe', TIMEFRAMES)}</Field>
        <Field label="Target moving date" hint="Optional"><DateInput className="input" value={p.targetDate} onChange={(e) => up({ targetDate: e.target.value })} /></Field>
        <Field label="Current stage">{sel('stage', STAGES, '(Not set)')}</Field>
      </div>
      <div>
        <span className="label">Top priorities <span className="font-normal muted">(up to three)</span></span>
        <PriorityPicker p={p} up={up} toast={toast} />
      </div>
      <Field label="Biggest concern"><textarea className="input" value={p.concern} onChange={(e) => up({ concern: e.target.value })} /></Field>
    </>
  );
}
