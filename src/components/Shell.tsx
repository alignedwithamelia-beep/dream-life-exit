import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookHeart, CalendarDays, CheckSquare, Contact, FolderLock, Home, LogOut, Map, MoreHorizontal, Plane, Repeat, UserRound, Users,
} from 'lucide-react';
import { Logo, Modal, ThemeToggle, WaveBand } from './ui';
import { useHub } from '../lib/store';
import { checklistStats, daysUntil } from '../lib/logic';

type Item = { to: string; label: string; short?: string; icon: ReactNode; group: string };

export const CLIENT_NAV: Item[] = [
  { to: '/', label: 'Home', icon: <Home size={18} />, group: '' },
  { to: '/checklist', label: 'Exit Checklist', short: 'Checklist', icon: <CheckSquare size={18} />, group: 'Get ready' },
  { to: '/plan', label: 'Four-Week Plan', short: 'Plan', icon: <Map size={18} />, group: 'Get ready' },
  { to: '/vault', label: 'Document Vault', short: 'Vault', icon: <FolderLock size={18} />, group: 'Organise' },
  { to: '/dates', label: 'Important Dates', icon: <CalendarDays size={18} />, group: 'Organise' },
  { to: '/contacts', label: 'Contacts & Links', icon: <Contact size={18} />, group: 'Organise' },
  { to: '/planner', label: 'Dream Life Planner', icon: <BookHeart size={18} />, group: 'Dream' },
  { to: '/household', label: 'Household & Profile', icon: <UserRound size={18} />, group: 'You' },
];

const COACH_NAV: Item[] = [{ to: '/coach', label: 'My clients', icon: <Users size={18} />, group: '' }];

const navCls = ({ isActive }: { isActive: boolean }) =>
  `relative flex items-center gap-3 rounded-xl px-3.5 py-2 text-[14px] transition ${isActive
    ? 'bg-white/10 text-white font-semibold [&_svg]:text-gold before:absolute before:-left-5 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-gold'
    : 'text-white/70 hover:bg-white/5 hover:text-white'}`;

function JourneyMini() {
  const { state } = useHub();
  const p = state.profile;
  const days = p.targetDate ? daysUntil(p.targetDate) : null;
  const pct = checklistStats(state.tasks).pct;
  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 mb-3 [@media(max-height:820px)]:hidden">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] font-bold text-white/50 mb-2"><Plane size={12} className="text-gold" /> YOUR JOURNEY</div>
      <div className="font-serif text-white text-lg leading-tight">{p.country || 'Somewhere new'}</div>
      <div className="text-xs text-white/60 mb-3">{days !== null && days >= 0 ? `${days} days to go` : 'Date not set yet'}</div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gold rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
      <div className="text-[11px] text-white/50 mt-1.5">{pct}% of your checklist</div>
    </div>
  );
}

export default function Shell({ coach, children }: { coach?: boolean; children: ReactNode }) {
  const { mode, setView, leave, account, theme } = useHub();
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const items = coach ? COACH_NAV : CLIENT_NAV;
  const isRemote = mode === 'remote';

  const switchView = () => {
    setView(coach ? 'client' : 'coach');
    navigate(coach ? '/' : '/coach');
  };

  const footer = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between rounded-full bg-white/[0.04] border border-white/10 pl-4 pr-1 py-1 mb-2">
        <span className="text-xs text-white/70">{theme === 'dark' ? 'Night mode' : 'Day mode'}</span>
        <ThemeToggle onDark />
      </div>
      {!isRemote && (
        <button onClick={switchView} className="w-full flex items-center gap-2 justify-center rounded-full border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10 cursor-pointer transition">
          <Repeat size={15} /> {coach ? 'Switch to client view' : 'Preview coach view'}
        </button>
      )}
      <button onClick={() => { leave(); navigate('/'); }} className="w-full flex items-center gap-2 justify-center rounded-full px-4 py-1.5 text-xs text-white/55 hover:text-white cursor-pointer">
        <LogOut size={13} /> {isRemote ? 'Sign out' : 'Back to welcome screen'}
      </button>
      <div className="text-[10.5px] text-white/35 text-center tracking-wide">{isRemote ? account?.email : 'Prototype · demo data'}</div>
    </div>
  );

  const groups = items.reduce<[string, Item[]][]>((acc, i) => {
    const last = acc[acc.length - 1];
    if (last && last[0] === i.group) last[1].push(i); else acc.push([i.group, [i]]);
    return acc;
  }, []);

  const mobileTabs = coach ? COACH_NAV : CLIENT_NAV.slice(0, 3).concat(CLIENT_NAV[3]);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex flex-col w-[264px] shrink-0 bg-sidebar sticky top-0 h-screen overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(400px 260px at 0% 0%, rgba(184,145,58,0.14), transparent 70%)' }}>
        <div className="px-6 pt-6 pb-5"><Logo /></div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-5 space-y-3">
          {groups.map(([g, list]) => (
            <div key={g || 'main'}>
              {g && <div className="px-3.5 pb-1.5 text-[10px] tracking-[0.22em] font-bold text-white/35 uppercase">{g}</div>}
              <div className="space-y-0.5">
                {list.map((i) => <NavLink key={i.to} to={i.to} end={i.to === '/'} className={navCls}>{i.icon}{i.label}</NavLink>)}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-5 pt-3 pb-4 relative z-10">
          {!coach && <JourneyMini />}
          {footer}
        </div>
        <WaveBand className="absolute bottom-0 left-0 w-full h-10 opacity-25 pointer-events-none" />
      </aside>

      <header className="md:hidden sticky top-0 z-30 bg-sidebar px-4 py-3 flex items-center justify-between shadow-lg">
        <Logo />
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] tracking-widest font-semibold rounded-full bg-gold/20 text-gold px-2.5 py-1">
            {isRemote ? (coach ? 'COACH' : 'PRIVATE') : 'PROTOTYPE'}
          </span>
          <ThemeToggle onDark />
        </div>
      </header>

      <main className="flex-1 min-w-0 px-4 py-7 md:px-12 md:py-12 pb-28 md:pb-14">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-3 inset-x-3 z-30 bg-sidebar rounded-2xl shadow-2xl grid px-1"
        style={{ gridTemplateColumns: `repeat(${mobileTabs.length + 1}, 1fr)` }}>
        {mobileTabs.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === '/'}
            className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[10.5px] transition ${isActive ? 'text-gold font-semibold' : 'text-white/60'}`}>
            {i.icon}{i.short ?? i.label}
          </NavLink>
        ))}
        <button onClick={() => setMore(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10.5px] text-white/60 cursor-pointer">
          <MoreHorizontal size={18} />More
        </button>
      </nav>

      {more && (
        <Modal title="More" onClose={() => setMore(false)}>
          <div className="space-y-1">
            {(coach ? [] : CLIENT_NAV.slice(4)).map((i) => (
              <NavLink key={i.to} to={i.to} onClick={() => setMore(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${isActive ? 'bg-teal-soft text-teal font-semibold' : 'hover:bg-beige'}`}>
                {i.icon}{i.label}
              </NavLink>
            ))}
          </div>
          <div className="bg-sidebar rounded-2xl p-4" onClick={() => setMore(false)}>{footer}</div>
        </Modal>
      )}
    </div>
  );
}
