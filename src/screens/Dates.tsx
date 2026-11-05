import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Info, Pencil, Plus, UserRound } from 'lucide-react';
import { Banner, DateBadge, Disclaimer, Empty, Field, Modal, PageHeader, confirmDelete } from '../components/ui';
import { Checkbox, DateInput, Select } from '../components/controls';
import { DATE_CATEGORIES, REMINDERS, label, uid } from '../lib/defaults';
import { fmtDate, fromISO, inDays, memberName, toISO, todayISO } from '../lib/logic';
import { useHub } from '../lib/store';
import { DATE_STYLE } from '../lib/theme';
import type { HubDate } from '../lib/types';

const blank = (date = todayISO()): HubDate => ({ id: '', title: '', date, category: 'Other', reminder: '1w', memberId: '', notes: '', done: false });

export default function Dates() {
  const { state, set, toast, mode } = useHub();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'timeline' | 'month'>('timeline');
  const [editing, setEditing] = useState<HubDate | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    if (params.get('add')) { setEditing(blank()); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const t = todayISO();
  const sorted = [...state.dates].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((d) => !d.done && d.date >= t);
  const past = sorted.filter((d) => d.done || d.date < t).reverse();
  const groups = upcoming.reduce<Record<string, HubDate[]>>((g, d) => {
    const k = d.date.slice(0, 7); (g[k] ??= []).push(d); return g;
  }, {});

  function save(d: HubDate) {
    if (!d.title.trim() || !d.date) { toast('Please add what’s happening and a date.'); return; }
    set((s) => { if (d.id) Object.assign(s.dates.find((x) => x.id === d.id)!, d); else s.dates.push({ ...d, id: uid() }); });
    setEditing(null);
    toast(d.id ? 'Date saved.' : 'Date added.');
  }

  const toggle = (id: string) => set((s) => { const d = s.dates.find((x) => x.id === id)!; d.done = !d.done; });

  const row = (d: HubDate) => (
    <div key={d.id} className="flex items-center gap-4 py-3.5 border-b border-line last:border-0">
      <DateBadge iso={d.date} tone={DATE_STYLE[d.category] ?? 'teal'} />
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${d.done ? 'line-through text-muted' : ''}`}>{d.title}</div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className="chip">{d.category}</span>
          {d.memberId && <span className="chip"><UserRound size={11} />{memberName(state, d.memberId)}</span>}
          <span className="chip">{inDays(d.date)}</span>
          {d.reminder !== 'none' && <span className="chip"><Bell size={11} />{label(REMINDERS, d.reminder)}</span>}
        </div>
      </div>
      <Checkbox aria-label="Done" size={22} checked={d.done} onChange={() => toggle(d.id)} />
      <button className="p-2 rounded-full hover:bg-beige cursor-pointer shrink-0" aria-label="Edit" onClick={() => setEditing(d)}><Pencil size={16} /></button>
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="My Important Dates" title={<>Nothing important <em>slips through</em>.</>} icon={<CalendarDays size={28} />} sub="Record appointments, renewals and deadlines so you can see what’s coming." />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex rounded-full bg-beige p-1">
          {(['timeline', 'month'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize cursor-pointer ${view === v ? 'bg-paper shadow-sm' : 'text-ink/60'}`}>{v}</button>
          ))}
        </div>
        <button className="btn ml-auto" onClick={() => setEditing(blank())}><Plus size={16} /> Add a date</button>
      </div>

      <div className="mb-6">
        <Banner icon={<Info size={18} />}>
          {mode === 'remote'
            ? 'Reminder preferences are saved. Email reminders are sent to your sign-in address once email delivery is switched on for the Hub.'
            : 'Reminder preferences are saved, but email and phone reminders aren’t switched on yet. They’ll be added once a delivery service is set up and tested.'}
        </Banner>
      </div>

      {view === 'timeline' ? (
        <>
          {Object.keys(groups).length === 0 && <div className="card"><Empty>No upcoming dates. Add appointments, renewals and deadlines as you learn about them.</Empty></div>}
          <div className="space-y-5">
            {Object.entries(groups).map(([k, list]) => (
              <div key={k} className="card md:!pl-10"><span className="hidden md:block absolute left-[22px] top-14 bottom-8 w-px bg-gradient-to-b from-teal/50 to-transparent" />
                <div className="eyebrow mb-1">{fmtDate(`${k}-01`, { month: 'long', year: 'numeric' })}</div>
                {list.map(row)}
              </div>
            ))}
          </div>
          {past.length > 0 && (
            <div className="card mt-5">
              <button className="w-full flex items-center justify-between cursor-pointer" onClick={() => setShowPast(!showPast)}>
                <span className="font-serif text-lg">Done and past dates <span className="text-sm muted font-sans">({past.length} item{past.length === 1 ? '' : 's'})</span></span>
                <ChevronDown size={18} className={`transition ${showPast ? 'rotate-180' : ''}`} />
              </button>
              {showPast && <div className="mt-3">{past.map(row)}</div>}
            </div>
          )}
        </>
      ) : (
        <MonthView dates={state.dates} row={row} onAdd={(d) => setEditing(blank(d))} />
      )}

      {editing && <DateModal date={editing} onClose={() => setEditing(null)} onSave={save}
        onDelete={() => { if (!confirmDelete('this date')) return; set((s) => { s.dates = s.dates.filter((x) => x.id !== editing.id); }); setEditing(null); toast('Date deleted.'); }} />}
      <Disclaimer />
    </div>
  );
}

function MonthView({ dates, row, onAdd }: { dates: HubDate[]; row: (d: HubDate) => JSX.Element; onAdd: (iso: string) => void }) {
  const t = todayISO();
  const [month, setMonth] = useState(() => { const d = fromISO(t); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [picked, setPicked] = useState(t);
  const offset = (month.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => toISO(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  const on = (iso: string) => dates.filter((d) => d.date === iso);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const list = on(picked);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <button className="p-2 rounded-full hover:bg-beige cursor-pointer" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
        <h2 className="text-xl">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
        <button className="p-2 rounded-full hover:bg-beige cursor-pointer" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="text-[11px] font-semibold muted py-1">{d}</div>)}
        {cells.map((iso, i) => iso ? (
          <button key={iso} onClick={() => setPicked(iso)}
            className={`aspect-square md:aspect-auto md:h-16 rounded-xl flex flex-col items-center justify-center text-sm cursor-pointer transition
              ${iso === t ? 'bg-teal text-white font-semibold' : iso === picked ? 'bg-teal-soft text-teal font-semibold' : 'hover:bg-beige'}`}>
            {Number(iso.slice(8))}
            {on(iso).length > 0 && <span className={`w-1.5 h-1.5 rounded-full mt-1 ${iso === t ? 'bg-field' : 'bg-gold'}`} />}
          </button>
        ) : <div key={`e${i}`} />)}
      </div>
      <div className="border-t border-line mt-5 pt-4">
        <h3 className="text-lg mb-1">{fmtDate(picked, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        {list.length ? list.map(row) : <Empty>Nothing on this day.</Empty>}
        <button className="btn-outline mt-2" onClick={() => onAdd(picked)}><Plus size={15} /> Add a date on this day</button>
      </div>
    </div>
  );
}

function DateModal({ date, onClose, onSave, onDelete }: { date: HubDate; onClose: () => void; onSave: (d: HubDate) => void; onDelete: () => void }) {
  const { state } = useHub();
  const [d, setD] = useState(date);
  const up = (p: Partial<HubDate>) => setD({ ...d, ...p });
  return (
    <Modal title={date.id ? 'Edit date' : 'Add a date'} onClose={onClose} footer={<>
      {date.id && <button className="btn-danger" onClick={onDelete}>Delete</button>}
      <div className="flex-1" />
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn" onClick={() => onSave(d)}>Save</button>
    </>}>
      <Field label="What’s happening?"><input autoFocus className="input" value={d.title} onChange={(e) => up({ title: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date"><DateInput className="input" value={d.date} onChange={(e) => up({ date: e.target.value })} /></Field>
        <Field label="Category"><Select className="input" value={d.category} onChange={(e) => up({ category: e.target.value })}>{DATE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Reminder" hint="Saved as a preference. Not sent yet."><Select className="input" value={d.reminder} onChange={(e) => up({ reminder: e.target.value })}>{REMINDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="For"><Select className="input" value={d.memberId} onChange={(e) => up({ memberId: e.target.value })}>
          <option value="">Whole household</option>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
      </div>
      <Field label="Notes"><textarea className="input" value={d.notes} onChange={(e) => up({ notes: e.target.value })} /></Field>
    </Modal>
  );
}
