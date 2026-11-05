import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './components/Shell';
import { Logo } from './components/ui';
import { useHub } from './lib/store';
import Welcome from './screens/Welcome';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Checklist from './screens/Checklist';
import Plan from './screens/Plan';
import Vault from './screens/Vault';
import Dates from './screens/Dates';
import Planner from './screens/Planner';
import Contacts from './screens/Contacts';
import Household from './screens/Household';
import { CoachClients, CoachPlan } from './screens/Coach';
import CoachClient from './screens/CoachClient';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const { ready, mode, view, state, account, problem, leave } = useHub();

  if (!ready) return <div className="min-h-screen grid place-items-center"><Logo light={false} /></div>;
  if (mode === 'welcome' || mode === 'login') return <Welcome />;

  if (problem) {
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6">
        <div className="card max-w-lg">
          <div className="eyebrow mb-2">{problem === 'SETUP' ? 'Setup needed' : 'Sign-in problem'}</div>
          <h1 className="text-2xl mb-3">{problem === 'SETUP' ? 'The database isn’t set up yet' : 'We couldn’t open your Hub'}</h1>
          {problem === 'SETUP' ? (
            <div className="text-sm muted space-y-2 mb-6 leading-relaxed">
              <p>You’re signed in, but the Hub’s tables don’t exist in Supabase yet.</p>
              <p>Open Supabase → SQL editor, paste the contents of <code className="text-ink">supabase/migrations/20261106090000_hub_v2.sql</code>, run it, then reload this page.</p>
            </div>
          ) : <p className="text-sm muted mb-6 leading-relaxed">{problem}</p>}
          <div className="flex gap-2">
            <button className="btn" onClick={() => window.location.reload()}>Try again</button>
            <button className="btn-outline" onClick={leave}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'remote' && account?.role === 'client' && account.access === 'paused') {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card max-w-md text-center">
          <h1 className="text-2xl mb-2">Access paused</h1>
          <p className="text-sm muted mb-6">Your Hub is safe, but access is paused for now. Please get in touch with your coach.</p>
          <button className="btn-outline" onClick={leave}>Sign out</button>
        </div>
      </div>
    );
  }

  if (view === 'coach') {
    return (
      <Shell coach>
        <ScrollTop />
        <Routes>
          <Route path="/coach" element={<CoachClients />} />
          <Route path="/coach/client/:id" element={<CoachClient />} />
          <Route path="/coach/plan/:id" element={<CoachPlan />} />
          <Route path="*" element={<Navigate to="/coach" replace />} />
        </Routes>
      </Shell>
    );
  }

  if (!state.onboarded) return <Onboarding />;

  return (
    <Shell>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/dates" element={<Dates />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/household" element={<Household />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
