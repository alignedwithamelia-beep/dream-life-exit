import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { demoState, emptyState, householdFromMoving, starterPlan } from './defaults';
import { buildSummary, checklistStats } from './logic';
import { supabase, type ProfileRow } from './supabase';
import type { HubState } from './types';
import { removeStoredFile } from './files';
import { useThemeMode, type ThemeMode } from './themeMode';

const LS_KEY = 'dream-life-exit-hub';

type Mode = 'welcome' | 'login' | 'local' | 'remote';
type View = 'client' | 'coach';

type Ctx = {
  ready: boolean;
  mode: Mode;
  view: View;
  state: HubState;
  account: ProfileRow | null;
  fresh: boolean;
  /** A sign-in problem to show instead of the Hub. "SETUP" means the database migration is missing. */
  problem: string | null;
  set: (fn: (draft: HubState) => void) => void;
  toast: (msg: string) => void;
  setView: (v: View) => void;
  startFresh: () => void;
  startDemo: () => void;
  previewCoach: () => void;
  showLogin: () => void;
  completeOnboarding: () => void;
  resetDemo: () => void;
  deleteEverything: () => Promise<void>;
  leave: () => Promise<void>;
  theme: ThemeMode;
  toggleTheme: () => void;
};

const HubCtx = createContext<Ctx>(null as unknown as Ctx);
export const useHub = () => useContext(HubCtx);

// Older saves may miss newer fields: fill them from a fresh state.
const hydrate = (data: Partial<HubState>): HubState => ({ ...emptyState(), ...data } as HubState);

export function HubProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>('welcome');
  const [view, setView] = useState<View>('client');
  const [state, setState] = useState<HubState>(emptyState);
  const [account, setAccount] = useState<ProfileRow | null>(null);
  const [fresh, setFresh] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { mode: theme, toggle: toggleTheme } = useThemeMode();
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const loadedRemote = useRef(false);
  const lastPlan = useRef('');
  const accountId = useRef<string | null>(null);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const set = useCallback((fn: (d: HubState) => void) => {
    setState((prev) => { const next = structuredClone(prev); fn(next); return next; });
  }, []);

  // ---- Remote (signed-in) loading ----
  const inflight = useRef<{ id: string; p: Promise<boolean> } | null>(null);

  // The session can arrive twice (getSession and the SIGNED_IN event): load once.
  const loadAccount = useCallback((userId: string | undefined): Promise<boolean> => {
    if (!userId) return Promise.resolve(false);
    if (inflight.current?.id === userId) return inflight.current.p;
    const p = loadAccountNow(userId);
    inflight.current = { id: userId, p };
    p.finally(() => { if (inflight.current?.p === p) inflight.current = null; });
    return p;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAccountNow(userId: string): Promise<boolean> {
    if (!supabase) return false;
    setProblem(null);
    await supabase.rpc('activate_self');
    const { data: p, error: pErr } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!p) {
      setProblem(pErr ? `We couldn’t load your account: ${pErr.message}` : 'You’re signed in, but there’s no Hub account for this email yet. Please ask your coach to invite you.');
      setMode('remote');
      return true;
    }
    const profile = p as ProfileRow;
    accountId.current = profile.id;
    setAccount(profile);

    // The v2 tables come from supabase/migrations/20261106090000_hub_v2.sql.
    const probe = await supabase.from('client_shared').select('client_id').limit(1);
    if (probe.error && (probe.error.code === 'PGRST205' || probe.error.code === '42P01' || /schema cache|does not exist/i.test(probe.error.message))) {
      setProblem('SETUP');
      setMode('remote');
      return true;
    }

    if (profile.role === 'coach') {
      setMode('remote'); setView('coach'); loadedRemote.current = false;
      return true;
    }
    const [{ data: priv, error: e1 }, { data: shared, error: e2 }] = await Promise.all([
      supabase.from('client_private').select('data').eq('client_id', userId).maybeSingle(),
      supabase.from('client_shared').select('plan').eq('client_id', userId).maybeSingle(),
    ]);
    if ((e1 || e2) && profile.access !== 'paused') {
      setProblem(`We couldn’t load your Hub: ${(e1 ?? e2)!.message}`);
      setMode('remote');
      return true;
    }
    const base = priv?.data ? hydrate(priv.data as Partial<HubState>) : emptyState();
    if (shared?.plan) base.plan = shared.plan;
    if (!priv?.data && profile.full_name) base.profile.name = profile.full_name.split(' ')[0];
    lastPlan.current = JSON.stringify(base.plan);
    setState(base);
    setMode('remote'); setView('client');
    loadedRemote.current = true;
    return true;
  }

  useEffect(() => {
    (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session && (await loadAccount(data.session.user.id))) { setReady(true); return; }
      }
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        try {
          const s = JSON.parse(saved);
          setState(hydrate(s.state)); setView(s.view ?? 'client'); setMode('local');
        } catch { localStorage.removeItem(LS_KEY); }
      }
      setReady(true);
    })();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && session.user.id !== accountId.current) loadAccount(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadAccount]);

  // ---- Persistence ----
  useEffect(() => {
    if (mode === 'local') localStorage.setItem(LS_KEY, JSON.stringify({ state, view }));
  }, [mode, state, view]);

  useEffect(() => {
    if (mode !== 'remote' || !supabase || !account || account.role !== 'client' || !loadedRemote.current) return;
    const timer = setTimeout(async () => {
      const { plan, coach: _c, ...rest } = state;
      const stats = checklistStats(state.tasks);
      lastPlan.current = JSON.stringify(plan);
      const [a, b] = await Promise.all([
        supabase!.from('client_private').upsert({ client_id: account.id, data: rest, updated_at: new Date().toISOString() }),
        supabase!.from('client_shared').upsert({
          client_id: account.id, plan, checklist_done: stats.done, checklist_total: stats.total, updated_at: new Date().toISOString(),
        }),
      ]);
      if (a.error || b.error) toast('Couldn’t save just now. We’ll try again with your next change.');
      // Progress summary for the coach's client page. Separate write: harmless if the column isn't there yet.
      else await supabase!.from('client_shared').update({ summary: buildSummary(state) }).eq('client_id', account.id);
    }, 700);
    return () => clearTimeout(timer);
  }, [mode, state, account, toast]);

  // Coach edits to the plan arrive live.
  useEffect(() => {
    if (mode !== 'remote' || !supabase || !account || account.role !== 'client') return;
    const ch = supabase.channel(`plan-${account.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'client_shared', filter: `client_id=eq.${account.id}` }, (payload) => {
        const plan = (payload.new as { plan: HubState['plan'] }).plan;
        const json = JSON.stringify(plan);
        if (plan && json !== lastPlan.current) {
          lastPlan.current = json;
          setState((s) => ({ ...s, plan }));
          toast('Your coach has updated your plan.');
        }
      })
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [mode, account, toast]);

  // ---- Actions ----
  const startFresh = () => { setState(emptyState()); setView('client'); setMode('local'); setFresh(false); };
  const startDemo = () => {
    setState(demoState()); setView('client'); setMode('local'); setFresh(false);
    toast('Welcome to the demo. Everything here is example data.');
  };
  const previewCoach = () => {
    if (mode === 'welcome' || mode === 'login') { setState(demoState()); setMode('local'); }
    setView('coach');
  };
  const completeOnboarding = () => {
    set((d) => {
      d.onboarded = true;
      if (!d.members.length) d.members = householdFromMoving(d.profile.name, d.profile.moving);
    });
    setFresh(true);
    toast('Your Hub is ready. Let’s get organised.');
  };
  const resetDemo = () => { setState(demoState()); setFresh(false); toast('Demo data restored.'); };

  const deleteEverything = async () => {
    if (mode === 'remote' && supabase && account) {
      for (const d of state.docs) if (d.path) await removeStoredFile(d.path);
      await supabase.from('client_private').delete().eq('client_id', account.id);
      const plan = starterPlan();
      lastPlan.current = JSON.stringify(plan);
      await supabase.from('client_shared').upsert({ client_id: account.id, plan, checklist_done: 0, checklist_total: 0 });
      loadedRemote.current = false;
      setState({ ...emptyState(), plan });
      loadedRemote.current = true;
      toast('Everything has been deleted.');
      return;
    }
    localStorage.removeItem(LS_KEY);
    setState(emptyState()); setMode('welcome'); setView('client');
    toast('Everything has been deleted from this browser.');
  };

  const leave = async () => {
    if (mode === 'remote' && supabase) {
      await supabase.auth.signOut();
      setAccount(null); loadedRemote.current = false; accountId.current = null; setProblem(null);
      setState(emptyState());
    }
    setMode('welcome'); setView('client'); setFresh(false);
  };

  return (
    <HubCtx.Provider value={{
      ready, mode, view, state, account, fresh, problem, set, toast, setView, startFresh, startDemo, previewCoach,
      showLogin: () => setMode('login'), completeOnboarding, resetDemo, deleteEverything, leave, theme, toggleTheme,
    }}>
      {children}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="toast bg-navy text-white text-sm rounded-full px-5 py-3 shadow-lg">{t.msg}</div>
        ))}
      </div>
    </HubCtx.Provider>
  );
}
