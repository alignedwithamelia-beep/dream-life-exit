import type { ClientSummary, HubDate, HubState, Plan, Task, Week } from './types';

// Dates are stored as YYYY-MM-DD strings and handled in local time.
const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDays = (iso: string, n: number) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
export const daysUntil = (iso: string) => Math.round((fromISO(iso).getTime() - fromISO(todayISO()).getTime()) / 86_400_000);

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  iso ? fromISO(iso).toLocaleDateString('en-GB', opts) : '';
export const fmtShort = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'short' });
export const fmtMonthYear = (iso: string) => fmtDate(iso, { month: 'long', year: 'numeric' });

export function inDays(iso: string) {
  const n = daysUntil(iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function checklistStats(tasks: Task[]) {
  const applicable = tasks.filter((t) => t.status !== 'not_applicable');
  const done = applicable.filter((t) => t.status === 'completed').length;
  return { done, total: applicable.length, pct: applicable.length ? Math.round((done / applicable.length) * 100) : 0 };
}

export const weekDone = (w: Week) => w.actions.filter((a) => a.done).length + (w.milestoneDone ? 1 : 0);
export const weekTotal = (w: Week) => w.actions.length + 1;
export const planDone = (p: Plan) => p.weeks.reduce((n, w) => n + weekDone(w), 0);
export const planTotal = (p: Plan) => p.weeks.reduce((n, w) => n + weekTotal(w), 0);

const PRIO = { high: 0, medium: 1, low: 2 };
export function nextSteps(tasks: Task[], n = 3) {
  return tasks
    .filter((t) => t.status === 'not_started' || t.status === 'in_progress')
    .sort((a, b) => PRIO[a.priority] - PRIO[b.priority] || (a.due || '9999').localeCompare(b.due || '9999'))
    .slice(0, n);
}

export function comingUp(dates: HubDate[], n = 3) {
  const t = todayISO();
  return dates.filter((d) => !d.done && d.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, n);
}

export function vaultAlerts(s: HubState) {
  return s.docs.filter((d) => d.reviewDate && daysUntil(d.reviewDate) >= 0 && daysUntil(d.reviewDate) <= 90);
}

export function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const memberName = (s: HubState, id: string) => s.members.find((m) => m.id === id)?.name ?? '';

export function buildSummary(s: HubState): ClientSummary {
  const stats = checklistStats(s.tasks);
  const byStatus = { not_started: 0, in_progress: 0, completed: 0, not_applicable: 0 } as ClientSummary['checklist']['byStatus'];
  s.tasks.forEach((t) => { byStatus[t.status]++; });
  const cats = [...new Set(s.tasks.map((t) => t.category))];
  return {
    profile: s.profile,
    household: { adults: s.members.filter((m) => !m.isChild).length, children: s.members.filter((m) => m.isChild).length },
    checklist: {
      ...stats, byStatus,
      overdue: s.tasks.filter((t) => t.due && t.status !== 'completed' && t.status !== 'not_applicable' && daysUntil(t.due) < 0).length,
      byCategory: cats.map((category) => ({ category, ...checklistStats(s.tasks.filter((t) => t.category === category)) })),
    },
    updatedAt: new Date().toISOString(),
  };
}
