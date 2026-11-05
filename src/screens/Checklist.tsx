import { useMemo, useState } from 'react';
import { ChevronDown, FileText, ListChecks, Plus, Star, StickyNote, UserRound } from 'lucide-react';
import { Disclaimer, Field, IconTile, Modal, PageHeader, Progress, Ring, StatusCircle } from '../components/ui';
import { DateInput, Select } from '../components/controls';
import { catStyle } from '../lib/theme';
import { CATEGORIES, PRIORITIES, STATUSES, uid } from '../lib/defaults';
import { checklistStats, daysUntil, fmtShort, memberName } from '../lib/logic';
import { useHub } from '../lib/store';
import type { Task } from '../lib/types';

const DATE_FILTERS = [['', 'Any date'], ['overdue', 'Overdue'], ['30', 'Due in the next 30 days'], ['has', 'Has a due date'], ['none', 'No due date']] as const;

const blankTask = (category: string): Task => ({
  id: '', title: '', category, status: 'not_started', priority: 'medium', due: '', memberId: '', docId: '', link: '', notes: '', custom: true,
});

export default function Checklist() {
  const { state, set, toast } = useHub();
  const stats = checklistStats(state.tasks);
  const prio = state.profile.priorities;
  const [f, setF] = useState({ category: '', status: '', priority: '', member: '', date: '' });
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(CATEGORIES.map((c) => [c, prio.includes(c)])));
  const [editing, setEditing] = useState<Task | null>(null);
  const filtering = Object.values(f).some(Boolean);

  const categories = useMemo(() => {
    const extra = [...new Set(state.tasks.map((t) => t.category))].filter((c) => !CATEGORIES.includes(c));
    const all = [...CATEGORIES, ...extra];
    return [...all.filter((c) => prio.includes(c)), ...all.filter((c) => !prio.includes(c))];
  }, [state.tasks, prio]);

  const match = (t: Task) =>
    (!f.category || t.category === f.category) && (!f.status || t.status === f.status) && (!f.priority || t.priority === f.priority) &&
    (!f.member || (f.member === 'all' ? !t.memberId : t.memberId === f.member)) &&
    (!f.date || (f.date === 'none' ? !t.due : f.date === 'has' ? !!t.due
      : f.date === 'overdue' ? !!t.due && daysUntil(t.due) < 0 && t.status !== 'completed' : !!t.due && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 30));

  const setStatus = (id: string, status: Task['status']) => set((d) => { d.tasks.find((t) => t.id === id)!.status = status; });

  function save(t: Task) {
    if (!t.title.trim()) { toast('Please give the task a name.'); return; }
    set((d) => {
      if (t.id) Object.assign(d.tasks.find((x) => x.id === t.id)!, t);
      else d.tasks.push({ ...t, id: uid(), title: t.title.trim() });
    });
    toast(t.id ? 'Task saved.' : 'Task added.');
    setEditing(null);
  }

  const sel = (key: keyof typeof f, children: React.ReactNode) => (
    <Select className="input !w-auto !py-2 !rounded-full" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })}>{children}</Select>
  );

  return (
    <div>
      <PageHeader eyebrow="My Exit Checklist" title={<>Let’s get <em>organised</em>.</>} icon={<ListChecks size={28} />}
        sub="Tick things off as you go, mark anything that doesn’t apply to you, and add your own tasks. Your areas of focus are shown first." />

      <div className="card mb-7 flex flex-col md:flex-row md:items-center gap-6">
        <Ring pct={stats.pct} size={116} stroke={10}>
          <div><div className="font-serif text-3xl leading-none text-teal">{stats.pct}%</div><div className="text-[10px] tracking-widest font-bold muted mt-1">COMPLETE</div></div>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-xl mb-1">{stats.done} of {stats.total} applicable tasks</div>
          <div className="flex flex-wrap gap-2 my-3">
            {([['completed', 'Completed', 'bg-sage'], ['in_progress', 'In progress', 'bg-teal'], ['not_started', 'Not started', 'bg-navy/25'], ['not_applicable', 'Not applicable', 'bg-line']] as const).map(([k, l, dot]) => (
              <span key={k} className="inline-flex items-center gap-2 rounded-full border border-line bg-field/70 px-3 py-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${dot}`} />{l}<b className="font-semibold">{state.tasks.filter((t) => t.status === k).length}</b>
              </span>
            ))}
          </div>
          <p className="text-xs muted leading-relaxed">Tasks marked Not Applicable aren’t counted. Finishing this list doesn’t mean you have permission to enter or live in a country, so always check official sources.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {sel('category', <><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</>)}
        {sel('status', <><option value="">Any status</option>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</>)}
        {sel('priority', <><option value="">Any priority</option>{PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</>)}
        {sel('member', <><option value="">Everyone</option><option value="all">Whole household</option>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</>)}
        {sel('date', DATE_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>))}
        {filtering && <button className="link" onClick={() => setF({ category: '', status: '', priority: '', member: '', date: '' })}>Clear</button>}
        <button className="btn sm:ml-auto" onClick={() => setEditing(blankTask(categories[0]))}><Plus size={16} /> Add a task</button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const all = state.tasks.filter((t) => t.category === cat);
          const shown = all.filter(match);
          if (filtering && shown.length === 0) return null;
          const s = checklistStats(all);
          const isOpen = filtering || open[cat];
          const cs = catStyle(cat);
          return (
            <div key={cat} className={`card !p-0 overflow-hidden ${prio.includes(cat) ? 'ring-1 ring-gold/30' : ''}`}>
              <button className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer hover:bg-cream/40 transition" onClick={() => setOpen({ ...open, [cat]: !open[cat] })}>
                <IconTile icon={cs.icon} tone={cs.tone} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-lg">{cat}</span>
                    {prio.includes(cat) && <span className="chip !bg-gold-soft !text-warn-ink"><Star size={10} className="fill-gold text-gold" /> Your priority</span>}
                  </div>
                </div>
                <div className="hidden sm:block w-28"><Progress pct={s.pct} tone={cs.tone} /></div>
                <span className="text-sm font-semibold w-10 text-right tabular-nums">{s.done}<span className="muted font-normal">/{s.total}</span></span>
                <ChevronDown size={18} className={`transition text-ink/50 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-line">
                  {shown.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 px-5 py-3.5 border-b border-line/70 last:border-0">
                      <div className="pt-0.5"><StatusCircle status={t.status} onClick={() => setStatus(t.id, t.status === 'completed' ? 'not_started' : 'completed')} /></div>
                      <div className="flex-1 min-w-0">
                        <button className={`text-left text-sm font-medium cursor-pointer hover:text-teal ${t.status === 'completed' ? 'line-through text-muted' : ''} ${t.status === 'not_applicable' ? 'text-muted' : ''}`} onClick={() => setEditing(t)}>{t.title}</button>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {t.priority === 'high' && <span className="chip !bg-warn">High priority</span>}
                          {t.due && <span className={`chip ${daysUntil(t.due) < 0 && t.status !== 'completed' ? '!bg-danger/10 !text-danger' : ''}`}>{fmtShort(t.due)}</span>}
                          {t.memberId && <span className="chip"><UserRound size={11} />{memberName(state, t.memberId)}</span>}
                          {t.docId && <span className="chip"><FileText size={11} />Document</span>}
                          {t.notes && <span className="chip"><StickyNote size={11} />Note</span>}
                        </div>
                      </div>
                      <Select className="input !w-auto !py-1.5 !text-xs !rounded-full shrink-0" value={t.status} onChange={(e) => setStatus(t.id, e.target.value as Task['status'])}>
                        {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                    </div>
                  ))}
                  <div className="px-5 py-3"><button className="link" onClick={() => setEditing(blankTask(cat))}><Plus size={14} /> Add a task to {cat}</button></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && <TaskModal task={editing} categories={categories} onClose={() => setEditing(null)} onSave={save}
        onRemove={() => { set((d) => { d.tasks = d.tasks.filter((x) => x.id !== editing.id); }); toast('Task removed.'); setEditing(null); }} />}
      <Disclaimer />
    </div>
  );
}

function TaskModal({ task, categories, onClose, onSave, onRemove }: { task: Task; categories: string[]; onClose: () => void; onSave: (t: Task) => void; onRemove: () => void }) {
  const { state } = useHub();
  const [t, setT] = useState(task);
  const up = (patch: Partial<Task>) => setT({ ...t, ...patch });
  return (
    <Modal title={task.id ? 'Edit task' : 'Add a task'} onClose={onClose} footer={<>
      {task.id && <button className="btn-danger" onClick={onRemove}>Remove task</button>}
      <div className="flex-1" />
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn" onClick={() => onSave(t)}>Save</button>
    </>}>
      <Field label="Task"><input autoFocus className="input" value={t.title} onChange={(e) => up({ title: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Category"><Select className="input" value={t.category} onChange={(e) => up({ category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Status"><Select className="input" value={t.status} onChange={(e) => up({ status: e.target.value as Task['status'] })}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Priority"><Select className="input" value={t.priority} onChange={(e) => up({ priority: e.target.value as Task['priority'] })}>{PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Due date" hint="Optional"><DateInput className="input" value={t.due} onChange={(e) => up({ due: e.target.value })} /></Field>
        <Field label="For"><Select className="input" value={t.memberId} onChange={(e) => up({ memberId: e.target.value })}>
          <option value="">Whole household</option>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
        <Field label="Linked document"><Select className="input" value={t.docId} onChange={(e) => up({ docId: e.target.value })}>
          <option value="">None</option>{state.docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
      </div>
      <Field label="Useful link"><input className="input" type="url" placeholder="https://" value={t.link} onChange={(e) => up({ link: e.target.value })} /></Field>
      {t.link && /^https?:\/\//.test(t.link) && <a className="link -mt-2" href={t.link} target="_blank" rel="noreferrer noopener">Open link ↗</a>}
      <Field label="Notes"><textarea className="input" value={t.notes} onChange={(e) => up({ notes: e.target.value })} /></Field>
    </Modal>
  );
}
