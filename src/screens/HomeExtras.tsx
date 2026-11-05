import { Link } from 'react-router-dom';
import { Flag, Plane, Sparkles } from 'lucide-react';
import { SunMark } from '../components/ui';
import { daysUntil, fmtShort, todayISO } from '../lib/logic';
import { DATE_STYLE, TONE } from '../lib/theme';
import type { HubState } from '../lib/types';

/** Greeting that follows the clock, with a sun or moon. */
export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// The road: a gentle wave, with dots placed exactly on it.
const ROAD_TOP = 58;
const roadY = (pct: number) => 30 - 13 * Math.sin((pct / 100) * 3 * Math.PI);
const ROAD_PATH = 'M' + Array.from({ length: 101 }, (_, i) => `${i * 10} ${roadY(i).toFixed(2)}`).join(' L');

/** "The road to …": today on the left, moving day on the right, upcoming dates as stops. */
export function Horizon({ state }: { state: HubState }) {
  const p = state.profile;
  const country = p.country || 'your new home';

  if (!p.targetDate || daysUntil(p.targetDate) < 0) {
    return (
      <section className="card flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-gold-soft text-gold grid place-items-center shrink-0"><Flag size={20} /></span>
        <div className="flex-1">
          <h2 className="text-lg">See the road to {country}</h2>
          <p className="text-sm muted">Add a target moving date and your important dates will appear as stops along the way.</p>
        </div>
        <Link to="/household" className="btn-outline">Set a moving date</Link>
      </section>
    );
  }

  const total = Math.max(1, daysUntil(p.targetDate));
  const today = todayISO();
  // Square-root scale: the next few weeks get more room than dates months away.
  const pos = (iso: string) => Math.min(93, Math.max(7, Math.sqrt(daysUntil(iso) / total) * 100));
  const lanes = [-100, -100]; // last label position used above (0) and below (1) the road
  const stops = state.dates
    .filter((d) => !d.done && d.date >= today && d.date < p.targetDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d, i) => {
      const pct = pos(d.date);
      const prefer = i % 2;
      const lane = pct - lanes[prefer] >= 12 ? prefer : pct - lanes[1 - prefer] >= 12 ? 1 - prefer : -1;
      if (lane >= 0) lanes[lane] = pct;
      return { ...d, pct, lane, y: ROAD_TOP + roadY(pct) };
    });

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
        <div>
          <div className="eyebrow mb-1">The road ahead</div>
          <h2 className="text-xl">The road to <em className="text-gold">{country}</em></h2>
        </div>
        <div className="text-sm muted">{stops.length} stop{stops.length === 1 ? '' : 's'} · <b className="text-ink font-semibold">{total}</b> days to go</div>
      </div>

      <div className="relative h-44 mt-2 mx-4 sm:mx-8">
        {/* The road */}
        <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="absolute left-0 right-0 w-full h-[60px]" style={{ top: ROAD_TOP }} aria-hidden="true">
          <path d={ROAD_PATH} fill="none" stroke="var(--color-line)" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={ROAD_PATH} fill="none" stroke="var(--color-teal)" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Today */}
        <div className="absolute left-0 -translate-x-1/2 flex flex-col items-center" style={{ top: ROAD_TOP + roadY(0) - 22 }}>
          <span className="w-11 h-11 rounded-full bg-navy text-white grid place-items-center shadow-lg ring-4 ring-paper"><Plane size={18} className="rotate-45" /></span>
          <span className="text-[10px] font-bold tracking-[0.18em] mt-1.5">TODAY</span>
        </div>

        {/* Stops: labels on two lanes above and below the road */}
        {stops.map((s) => {
          const tone = DATE_STYLE[s.category] ?? 'teal';
          const up = s.lane === 0;
          return (
            <div key={s.id} className="absolute group" style={{ left: `${s.pct}%`, top: 0, bottom: 0 }} title={`${fmtShort(s.date)} · ${s.title}`}>
              <span className={`absolute left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ${TONE[tone].bg} ring-4 ring-paper shadow z-10 group-hover:scale-125 transition`} style={{ top: s.y }} />
              {s.lane >= 0 && <>
                <span className="absolute left-0 w-px bg-line" style={up ? { top: 36, height: s.y - 36 - 8 } : { top: s.y + 8, height: 128 - s.y - 8 }} />
                <div className="absolute -translate-x-1/2 text-center w-28 hidden sm:block" style={{ top: up ? 0 : 130 }}>
                  <div className={`text-[10px] font-bold tracking-wider ${TONE[tone].text}`}>{fmtShort(s.date).toUpperCase()}</div>
                  <div className="text-[11.5px] leading-tight truncate">{s.title}</div>
                </div>
              </>}
            </div>
          );
        })}

        {/* Moving day */}
        <div className="absolute right-0 translate-x-1/2 flex flex-col items-center" style={{ top: ROAD_TOP + roadY(100) - 28 }}>
          <span className="w-14 h-14 rounded-full bg-gold-soft grid place-items-center ring-4 ring-paper shadow-lg"><SunMark className="w-8 h-8" /></span>
          <span className="text-[10px] font-bold tracking-[0.18em] mt-1.5 text-gold">{fmtShort(p.targetDate).toUpperCase()}</span>
        </div>
      </div>
      {stops.length === 0 && <p className="text-sm muted text-center -mt-4">No stops yet. <Link to="/dates?add=1" className="link">Add an important date</Link></p>}
    </section>
  );
}

/** The vision statement as a postcard to your future self, with values as stepping stones. */
export function VisionPostcard({ state }: { state: HubState }) {
  const { vision, values } = state.planner;
  const vals = values.filter(Boolean);
  return (
    <section className="relative rounded-[22px] bg-paper border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="h-2" style={{ background: 'repeating-linear-gradient(135deg, var(--color-terracotta) 0 14px, transparent 14px 22px, var(--color-sky) 22px 36px, transparent 36px 44px)' }} />
      <div className="grid md:grid-cols-[1.5fr_1fr]">
        <div className="p-6 md:p-8 md:border-r border-dashed border-line">
          <div className="eyebrow mb-3 flex items-center gap-2"><Sparkles size={13} /> A postcard from your dream life</div>
          {vision ? (
            <p className="font-serif italic text-[19px] md:text-[21px] leading-relaxed line-clamp-5">“{vision}”</p>
          ) : (
            <p className="font-serif italic text-lg muted">You haven’t written your vision yet. What does life look like once you’ve arrived?</p>
          )}
          <Link to="/planner" className="link mt-4">{vision ? 'Revisit my planner' : 'Write my vision'} →</Link>
        </div>
        <div className="p-6 md:p-8 relative">
          <div className="absolute top-5 right-5 w-16 h-20 rounded-md border-2 border-dashed border-gold/60 grid place-items-center rotate-6 bg-gold-soft">
            <SunMark className="w-9 h-9" />
          </div>
          <div className="text-[10px] font-bold tracking-[0.2em] muted mb-1">TO</div>
          <div className="font-serif text-lg mb-1">My future self</div>
          <div className="border-b border-line w-36 mb-1" />
          <div className="border-b border-line w-28 mb-5" />
          <div className="text-[10px] font-bold tracking-[0.2em] muted mb-2">WHAT THIS MOVE PROTECTS</div>
          {vals.length ? (
            <div className="flex flex-wrap gap-1.5">
              {vals.map((v, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-field border border-line pl-1 pr-3 py-0.5 text-xs font-medium">
                  <span className="w-5 h-5 rounded-full bg-gold text-white text-[10px] font-bold grid place-items-center">{i + 1}</span>{v}
                </span>
              ))}
            </div>
          ) : <Link to="/planner" className="text-sm link">Choose your five values</Link>}
        </div>
      </div>
    </section>
  );
}
