import { useCallback, useEffect, useState } from 'react';
import { starterPlan } from './defaults';
import { buildSummary, checklistStats } from './logic';
import { useHub } from './store';
import { supabase, type ProfileRow } from './supabase';
import type { Access, ClientSummary, CoachClient, Plan } from './types';

/** Applies the coach's wording to the latest plan, keeping the client's ticks, notes and reflections. */
export function mergeCoachEdits(current: Plan, edited: Plan): Plan {
  const out = structuredClone(current);
  out.coachNote = edited.coachNote;
  out.currentWeek = edited.currentWeek;
  out.personalised = true;
  edited.weeks.forEach((w, i) => {
    const cur = out.weeks[i];
    Object.assign(cur, { theme: w.theme, subLabel: w.subLabel, focus: w.focus, milestone: w.milestone, reflectionQ: w.reflectionQ });
    cur.actions = w.actions.map((a, j) => ({ text: a.text, done: current.weeks[i]?.actions[j]?.done ?? false }));
  });
  return out;
}

export type InviteResult = { emailed: boolean; link?: string };

export function useCoach() {
  const { mode, state, set } = useHub();
  const remote = mode === 'remote';
  const [remoteClients, setRemoteClients] = useState<CoachClient[]>([]);
  const [loading, setLoading] = useState(remote);

  const reload = useCallback(async () => {
    if (!remote || !supabase) return;
    const [{ data: profiles }, { data: shared }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false }),
      supabase.from('client_shared').select('*'),
    ]);
    const byId = new Map((shared ?? []).map((s) => [s.client_id, s]));
    setRemoteClients(((profiles ?? []) as ProfileRow[]).map((p) => {
      const s = byId.get(p.id);
      return {
        id: p.id, name: p.full_name || p.email || 'Client', email: p.email ?? '', access: p.access, sessionDate: p.session_date ?? '',
        week: s?.plan ? (s.plan as Plan).currentWeek : null,
        pct: s && s.checklist_total ? Math.round((s.checklist_done / s.checklist_total) * 100) : 0, live: true,
        plan: (s?.plan as Plan) ?? undefined, summary: (s?.summary as ClientSummary) ?? null, lastActive: s?.updated_at ?? '',
      };
    }));
    setLoading(false);
  }, [remote]);

  useEffect(() => { reload(); }, [reload]);

  const localClients: CoachClient[] = state.coach.clients.map((c) =>
    c.live
      ? { ...c, week: state.plan.currentWeek, pct: checklistStats(state.tasks).pct, plan: state.plan, summary: buildSummary(state), lastActive: new Date().toISOString() }
      : c);

  const clients = remote ? remoteClients : localClients;

  async function invite(name: string, email: string, sessionDate: string): Promise<InviteResult> {
    if (remote && supabase) {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ name, email, sessionDate }),
      });
      const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
      if (!isJson) throw new Error('The invite service isn’t running. Restart the app with npm run dev (or netlify dev) and try again.');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'The invitation couldn’t be created.');
      await reload();
      return body as InviteResult;
    }
    set((s) => { s.coach.clients.push({ id: `local-${Date.now()}`, name, email, access: 'invited', sessionDate, week: null, pct: 0, live: false, plan: starterPlan() }); });
    return { emailed: false };
  }

  async function setAccess(id: string, access: Access) {
    if (remote && supabase) { await supabase.from('profiles').update({ access }).eq('id', id); await reload(); return; }
    set((s) => { s.coach.clients.find((c) => c.id === id)!.access = access; });
  }

  async function loadPlan(id: string): Promise<Plan> {
    if (remote && supabase) {
      const { data } = await supabase.from('client_shared').select('plan').eq('client_id', id).maybeSingle();
      return (data?.plan as Plan) ?? starterPlan();
    }
    const c = state.coach.clients.find((x) => x.id === id);
    return c?.live ? state.plan : c?.plan ?? starterPlan();
  }

  async function savePlan(id: string, edited: Plan, replace = false) {
    if (remote && supabase) {
      const current = await loadPlan(id);
      const plan = replace ? edited : mergeCoachEdits(current, edited);
      const { error } = await supabase.from('client_shared').upsert({ client_id: id, plan, updated_at: new Date().toISOString() });
      if (error) throw error;
      await reload();
      return plan;
    }
    const c = state.coach.clients.find((x) => x.id === id);
    const current = c?.live ? state.plan : c?.plan ?? starterPlan();
    const plan = replace ? edited : mergeCoachEdits(current, edited);
    set((s) => {
      const cc = s.coach.clients.find((x) => x.id === id);
      if (cc?.live) s.plan = plan; else if (cc) { cc.plan = plan; cc.week = plan.currentWeek; }
    });
    return plan;
  }

  const applyTemplate = (id: string) => savePlan(id, starterPlan(), true);

  return { clients, loading, remote, invite, setAccess, loadPlan, savePlan, applyTemplate, reload };
}
