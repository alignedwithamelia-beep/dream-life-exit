import { useState } from 'react';
import { ArrowRight, FolderLock, ListChecks, Mail, Map, Plane } from 'lucide-react';
import { Illustration, Logo, SunMark, ThemeToggle } from '../components/ui';
import { useHub } from '../lib/store';
import { backendEnabled, supabase } from '../lib/supabase';

const STAR_POS = [[40, 40, 1.6], [90, 150, 1.1], [150, 60, 1.4], [230, 40, 1.8], [270, 150, 1.2], [200, 110, 1], [30, 200, 1]];

/** Portrait sunrise (moonrise in dark mode) for the arched window. */
function ArchScene() {
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="arch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ill-sky1)" /><stop offset=".55" stopColor="var(--ill-sky2)" /><stop offset="1" stopColor="var(--ill-sky2)" />
        </linearGradient>
        <radialGradient id="arch-glow"><stop offset="0" stopColor="var(--ill-glow)" stopOpacity=".75" /><stop offset="1" stopColor="var(--ill-glow)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="300" height="400" fill="url(#arch-sky)" />
      <g style={{ opacity: 'var(--ill-stars)' }} fill="#fff">{STAR_POS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} className={i % 2 ? 'twinkle' : ''} />)}</g>
      <circle cx="150" cy="232" r="150" fill="url(#arch-glow)" />
      <g stroke="var(--ill-ray)" strokeWidth="3" strokeLinecap="round" opacity=".45">
        {[-70, -45, -22, 0, 22, 45, 70].map((a) => {
          const r = ((a - 90) * Math.PI) / 180;
          return <line key={a} x1={150 + Math.cos(r) * 78} y1={232 + Math.sin(r) * 78} x2={150 + Math.cos(r) * 98} y2={232 + Math.sin(r) * 98} />;
        })}
      </g>
      <circle cx="150" cy="232" r="60" fill="var(--ill-sun)" />
      <circle cx="138" cy="220" r="40" fill="var(--ill-sun-hi)" opacity=".4" />
      <g className="float">
        <path d="M56 104 q10 -10 20 0 q10 -10 20 0" stroke="var(--ill-bird)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M104 78 q7 -7 14 0 q7 -7 14 0" stroke="var(--ill-bird)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M210 120 q6 -6 12 0 q6 -6 12 0" stroke="var(--ill-bird)" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />
      </g>
      <path d="M0 262 C 60 236, 110 272, 170 256 S 260 236, 300 250 V400 H0Z" fill="var(--ill-sea1)" />
      <g transform="translate(60 228)"><path d="M0 22 h36 l-6 8 h-24Z" fill="var(--ill-bird)" /><path d="M18 0 v21 h-15Z" fill="var(--ill-sail)" /><path d="M20 5 v16 h11Z" fill="#E7DECF" /></g>
      <path d="M0 290 C 70 266, 130 308, 200 288 S 280 272, 300 282 V400 H0Z" fill="var(--ill-sea2)" />
      <path d="M14 292 C 70 272, 130 310, 196 291" stroke="var(--ill-sail)" strokeOpacity=".4" strokeWidth="2" fill="none" />
      <path d="M0 324 C 80 304, 150 344, 230 322 S 290 314, 300 318 V400 H0Z" fill="var(--ill-sea3)" />
      <path d="M0 356 C 90 342, 170 372, 250 352 S 296 350, 300 352 V400 H0Z" fill="var(--ill-sea4)" />
    </svg>
  );
}

/** Postmark that slowly turns. */
function Stamp({ className = '' }: { className?: string }) {
  return (
    <div className={`w-32 h-32 rounded-full bg-paper shadow-xl grid place-items-center ${className}`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full spin-slow" aria-hidden="true">
        <defs><path id="stamp-ring" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" /></defs>
        <circle cx="60" cy="60" r="56" fill="none" stroke="#3F7F78" strokeWidth="1.2" strokeDasharray="2 4" />
        <text fontSize="10" letterSpacing="2.2" fill="currentColor" className="text-ink" fontFamily="Figtree, sans-serif" fontWeight="700">
          <textPath href="#stamp-ring">PLAN · ORGANISE · PREPARE · GO ·</textPath>
        </text>
      </svg>
      <span className="w-14 h-14 rounded-full bg-gold text-white grid place-items-center"><Plane size={22} className="-rotate-12" /></span>
    </div>
  );
}

function Ticket({ className = '' }: { className?: string }) {
  return (
    <div className={`w-60 rounded-2xl bg-paper shadow-2xl border border-line overflow-hidden ${className}`}>
      <div className="bg-navy text-gold text-[9px] font-bold tracking-[0.3em] px-4 py-2 flex justify-between"><span>BOARDING PASS</span><span className="text-white/50">DL·001</span></div>
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div><div className="text-[9px] tracking-[0.2em] font-bold muted">FROM</div><div className="font-serif text-2xl leading-none">UK</div></div>
        <div className="flex-1 border-t-2 border-dashed border-teal/40 relative"><Plane size={14} className="absolute left-1/2 -translate-x-1/2 -top-[9px] text-teal rotate-45 bg-paper" /></div>
        <div className="text-right"><div className="text-[9px] tracking-[0.2em] font-bold muted">TO</div><div className="font-serif italic text-lg leading-none text-gold">Dream life</div></div>
      </div>
      <div className="mx-4 border-t border-dashed border-line" />
      <div className="px-4 py-2.5 flex justify-between text-[10px]">
        <div><div className="tracking-[0.18em] font-bold muted">DEPARTS</div><div className="font-semibold text-[11px]">When you’re ready</div></div>
        <div className="text-right"><div className="tracking-[0.18em] font-bold muted">GATE</div><div className="font-semibold text-[11px]">Week 1</div></div>
      </div>
    </div>
  );
}

const STONES = [
  { icon: ListChecks, title: '46-step checklist', tone: 'bg-teal' },
  { icon: Map, title: 'Four-week plan', tone: 'bg-gold' },
  { icon: FolderLock, title: 'Private vault', tone: 'bg-navy' },
];

export default function Welcome() {
  const { mode, startFresh, startDemo, previewCoach, showLogin } = useHub();
  return (
    // Exactly one screen tall: nothing scrolls.
    <div className="h-[100dvh] overflow-hidden grid md:grid-cols-[1.05fr_1fr]">
      {/* Left: an arched window onto the sunrise */}
      <div className="relative hidden md:flex items-center justify-center overflow-hidden bg-sand">
        <div className="absolute -left-40 -bottom-40 w-[560px] h-[560px] rounded-full bg-terracotta-soft/80" />
        <div className="absolute -right-24 -top-24 w-[340px] h-[340px] rounded-full bg-gold-soft" />
        <div className="absolute right-10 bottom-10 w-24 h-24 rounded-full border-2 border-dashed border-teal/25" />
        <div className="absolute top-7 left-9 z-20"><Logo light={false} /></div>

        <div className="relative z-10 mt-8 h-[min(76dvh,640px)] aspect-[3/4] fade-in">
          <div className="absolute inset-0 rounded-t-full rounded-b-[28px] bg-paper p-3 shadow-[0_40px_80px_-30px_rgba(30,42,71,0.45)]">
            <div className="relative w-full h-full rounded-t-full rounded-b-[18px] overflow-hidden"><ArchScene /></div>
          </div>
          <Stamp className="absolute -right-14 top-[14%]" />
          <Ticket className="absolute -left-24 bottom-[9%] -rotate-6" />
        </div>
      </div>

      {/* Right: welcome and actions */}
      <div className="flex flex-col min-h-0 relative">
        <div className="absolute top-5 right-5 z-20"><ThemeToggle /></div>
        <div className="md:hidden relative h-36 shrink-0 bg-sand"><Illustration className="absolute inset-0 w-full h-full" /></div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-5 md:px-14">
          <div className="w-full max-w-md fade-in">
            <div className="flex items-center gap-2.5 mb-4"><SunMark className="w-5 h-5" /><span className="eyebrow">The Dream Life™</span></div>
            <h1 className="text-[30px] md:text-[40px] xl:text-[48px] leading-[1.04] mb-4">
              Welcome to<br />The Dream Life<br />
              <span className="relative inline-block">
                <em>Exit Hub™</em>
                <svg viewBox="0 0 220 18" className="absolute left-0 -bottom-2 w-full h-3" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 12 C 50 3, 120 3, 217 9" stroke="#3F7F78" strokeWidth="3" fill="none" strokeLinecap="round" className="draw" />
                </svg>
              </span>
            </h1>
            <p className="muted mb-1 leading-relaxed">Your personal space to plan, organise and prepare for your next chapter abroad.</p>
            <p className="font-serif italic text-teal text-[15px]">Everything you’re organising for your move abroad, all in one place.</p>

            <div className="flex flex-wrap gap-2 mt-5">
              {STONES.map(({ icon: Icon, title, tone }) => (
                <span key={title} className="inline-flex items-center gap-2 rounded-full bg-paper border border-line pl-1 pr-3.5 py-1 text-xs font-semibold shadow-sm">
                  <span className={`w-6 h-6 rounded-full ${tone} text-white grid place-items-center`}><Icon size={12} /></span>{title}
                </span>
              ))}
            </div>

            <div className="mt-7">
              {mode === 'login' ? <Login /> : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button className="btn-gold !py-3.5 flex-1" onClick={backendEnabled ? showLogin : startFresh}>
                      Let’s get organised <ArrowRight size={16} />
                    </button>
                    <button className="btn-outline !py-3.5 flex-1" onClick={startDemo}>Explore the demo as Sarah</button>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button className="link" onClick={previewCoach}>Preview the coach view <ArrowRight size={14} /></button>
                    {backendEnabled && <button className="text-xs muted underline cursor-pointer hover:text-ink" onClick={startFresh}>Try it without an account</button>}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11.5px] muted mt-6 pt-4 border-t border-line leading-relaxed">
              {backendEnabled
                ? 'The demo and the try-it version keep everything in this browser only. Please use test information there and don’t upload real documents.'
                : 'This is a prototype. Anything you type is kept in this browser only. Please use test information and don’t upload real documents yet.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Login() {
  const { leave } = useHub();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setState('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    if (error) {
      const m = error.message;
      setError(
        /signups not allowed|user not found/i.test(m) ? 'We couldn’t find an invitation for that email. Please check with your coach.'
          : /rate limit|too many|security purposes/i.test(m) ? 'Too many sign-in emails were sent just now. Please wait a few minutes and try again.'
          : /redirect/i.test(m) ? 'This address isn’t allowed to receive sign-in links yet. Add it to Supabase → Authentication → URL configuration → Redirect URLs.'
          : m,
      );
      setState('error');
    } else setState('sent');
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl bg-teal-soft p-5 text-sm text-left flex gap-3">
        <Mail className="text-teal shrink-0" size={20} />
        <div><b>Check your inbox.</b> We’ve sent a secure sign-in link to {email}. You can close this tab once you’ve opened it.</div>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="text-left space-y-3">
      <label className="label" htmlFor="email">Sign in with the email your coach invited</label>
      <input id="email" type="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      {state === 'error' && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button type="button" className="link" onClick={leave}>‹ Back</button>
        <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button>
      </div>
    </form>
  );
}
