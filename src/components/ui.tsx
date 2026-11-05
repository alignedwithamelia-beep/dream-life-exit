import { useEffect, type ReactNode } from 'react';
import { Check, Moon, ShieldCheck, Sun, X, type LucideIcon } from 'lucide-react';
import type { TaskStatus } from '../lib/types';
import { useHub } from '../lib/store';
import { TONE, type Tone } from '../lib/theme';

export function PageHeader({ eyebrow, title, sub, icon, children }: { eyebrow: string; title: ReactNode; sub?: ReactNode; icon?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 fade-in">
      <div className="flex items-center gap-2.5 mb-3">
        <SunMark className="w-5 h-5" />
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-[34px] md:text-[46px] leading-[1.05] mb-3">{title}</h1>
          {sub && <p className="muted max-w-2xl leading-relaxed text-[15px]">{sub}</p>}
        </div>
        {icon && <div className="hidden md:grid place-items-center w-16 h-16 rounded-[20px] bg-paper border border-line text-teal rotate-3 shadow-sm shrink-0">{icon}</div>}
      </div>
      {children}
    </header>
  );
}

/** Half-sun on a horizon: the Hub's signature mark. */
export function SunMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 15a7 7 0 0 1 14 0Z" fill="#B8913A" />
      <path d="M2 18.5h20" stroke="#3F7F78" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 21.5h14" stroke="#7F9C82" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconTile({ icon: Icon, tone = 'teal', size = 'md' }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-8 h-8 rounded-[10px]' : size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl';
  return <span className={`${dim} ${TONE[tone].soft} ${TONE[tone].text} grid place-items-center shrink-0`}><Icon size={size === 'sm' ? 15 : size === 'lg' ? 22 : 18} /></span>;
}

export function Avatar({ name, tone = 'teal', size = 40 }: { name: string; tone?: Tone; size?: number }) {
  return (
    <span className={`${TONE[tone].bg} text-white rounded-full grid place-items-center font-serif shrink-0 ring-2 ring-paper`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}>{(name.trim()[0] ?? '?').toUpperCase()}</span>
  );
}

export function Ring({ pct, size = 120, stroke = 10, tone = 'teal', children }: { pct: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE[tone].ring} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, pct) / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Banner({ tone = 'teal', icon, children }: { tone?: 'teal' | 'yellow'; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={`flex gap-3 items-start rounded-2xl px-4 py-3.5 text-sm leading-relaxed border ${tone === 'yellow' ? 'bg-warn/80 border-gold/20' : 'bg-teal-soft/80 border-teal/15'}`}>
      <span className={`mt-0.5 shrink-0 ${tone === 'yellow' ? 'text-gold' : 'text-teal'}`}>{icon}</span>
      <div>{children}</div>
    </div>
  );
}

export function Disclaimer() {
  const { mode } = useHub();
  return (
    <div className="mt-14">
      <Banner tone="yellow" icon={<ShieldCheck size={18} />}>
        {mode === 'remote'
          ? 'Your Hub is saved to your private account. Your coach can only see your four-week plan and overall checklist progress. Always check official sources before acting on anything here.'
          : 'Prototype with demonstration data. What you change is saved in this browser only, isn’t backed up and isn’t private storage. Please don’t add real passports, visa, medical or financial documents yet.'}
      </Banner>
    </div>
  );
}

export function Progress({ pct, className = '', tone = 'teal' }: { pct: number; className?: string; tone?: Tone }) {
  return (
    <div className={`h-2 rounded-full bg-beige overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-700 ${TONE[tone].bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function StatusCircle({ status, onClick, size = 22 }: { status: TaskStatus | 'done' | 'open'; onClick?: () => void; size?: number }) {
  const done = status === 'completed' || status === 'done';
  const base = 'shrink-0 rounded-full grid place-items-center transition cursor-pointer';
  return (
    <button type="button" onClick={onClick} aria-label={done ? 'Mark as not done' : 'Mark as done'} style={{ width: size, height: size }}
      className={done ? `${base} bg-sage text-white scale-100 shadow-[0_2px_6px_-2px_rgba(94,125,98,0.8)]` : status === 'in_progress' ? `${base} border-2 border-dashed border-teal hover:bg-teal-soft`
        : status === 'not_applicable' ? `${base} border-2 border-line bg-beige` : `${base} border-2 border-ink/20 hover:border-teal hover:bg-teal-soft/50`}>
      {done && <Check size={size * 0.6} strokeWidth={3} />}
    </button>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-navy/45 backdrop-blur-[3px] grid place-items-end md:place-items-center p-0 md:p-6" onMouseDown={onClose}>
      <div role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={`fade-in bg-paper w-full ${wide ? 'md:max-w-2xl' : 'md:max-w-lg'} rounded-t-[28px] md:rounded-[28px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden`}>
        <div className="h-1.5 bg-gradient-to-r from-teal via-sage to-gold" />
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[22px]">{title}</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-6 pb-5 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line bg-cream/50 flex flex-wrap items-center gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-xs muted mt-1">{hint}</span>}
    </label>
  );
}

export function CardTitle({ icon, tone = 'teal', children, action }: { icon?: LucideIcon; tone?: Tone; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {icon && <IconTile icon={icon} tone={tone} size="sm" />}
      <h2 className="text-[19px] flex-1">{children}</h2>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm muted py-4 italic font-serif">{children}</div>;
}

export function DateBadge({ iso, tone = 'teal' }: { iso: string; tone?: Tone }) {
  const [y, m, d] = iso.split('-').map(Number);
  const mon = new Date(y, m - 1, d).toLocaleDateString('en-GB', { month: 'short' });
  return (
    <div className="w-12 shrink-0 rounded-xl bg-field border border-line text-center overflow-hidden leading-none shadow-sm">
      <div className={`${TONE[tone].bg} text-white text-[9px] uppercase tracking-[0.15em] font-bold py-1`}>{mon}</div>
      <div className="text-lg font-serif font-semibold py-1.5">{d}</div>
    </div>
  );
}

const STAR_POS = [[30, 22, 1.2], [62, 70, 0.9], [150, 18, 1.1], [268, 30, 1.3], [300, 64, 0.8], [240, 12, 0.9], [110, 92, 0.7]];

const RAYS = [-60, -35, -12, 12, 35, 60].map((a) => {
  const rad = ((a - 90) * Math.PI) / 180;
  return [200 + Math.cos(rad) * 52, 104 + Math.sin(rad) * 52, 200 + Math.cos(rad) * 66, 104 + Math.sin(rad) * 66];
});

/** Sunrise over the sea: sun and rays, layered waves, a distant sailboat and two birds. */
export function Illustration({ className = "", fit = "slice" }: { className?: string; fit?: "slice" | "meet" }) {
  return (
    <svg viewBox="0 0 320 200" className={className} preserveAspectRatio={`xMidYMax ${fit}`} aria-hidden="true">
      <defs>
        <linearGradient id="ill-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ill-sky1)" /><stop offset="1" stopColor="var(--ill-sky2)" /></linearGradient>
        <radialGradient id="ill-glow"><stop offset="0" stopColor="var(--ill-glow)" stopOpacity=".6" /><stop offset="1" stopColor="var(--ill-glow)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#ill-sky)" />
      <g style={{ opacity: 'var(--ill-stars)' }} fill="#fff">{STAR_POS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} className={i % 2 ? 'twinkle' : ''} />)}</g>
      <circle cx="200" cy="104" r="100" fill="url(#ill-glow)" />
      <g stroke="var(--ill-ray)" strokeWidth="2.2" strokeLinecap="round" opacity=".4">
        {RAYS.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>
      <circle cx="200" cy="104" r="40" fill="var(--ill-sun)" />
      <circle cx="192" cy="96" r="26" fill="var(--ill-sun-hi)" opacity=".35" />
      <g className="float">
        <path d="M84 52 q8 -8 16 0 q8 -8 16 0" stroke="var(--ill-bird)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M122 36 q6 -6 12 0 q6 -6 12 0" stroke="var(--ill-bird)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <path d="M0 128 C 50 108, 100 142, 160 126 S 270 108, 320 124 V200 H0Z" fill="var(--ill-sea1)" />
      <g transform="translate(88 104)"><path d="M0 14 h24 l-4 5 h-16Z" fill="var(--ill-bird)" /><path d="M12 0 v13 h-10Z" fill="var(--ill-sail)" /><path d="M13 3 v10 h7Z" fill="#E7DECF" /></g>
      <path d="M0 146 C 60 126, 120 164, 180 146 S 280 130, 320 142 V200 H0Z" fill="var(--ill-sea2)" />
      <path d="M10 147 C 60 130, 120 166, 180 148" stroke="var(--ill-sail)" strokeOpacity=".35" strokeWidth="1.5" fill="none" />
      <path d="M0 168 C 70 152, 140 184, 210 168 S 290 160, 320 166 V200 H0Z" fill="var(--ill-sea3)" />
      <path d="M0 186 C 80 176, 160 196, 240 184 S 300 182, 320 184 V200 H0Z" fill="var(--ill-sea4)" />
    </svg>
  );
}

/** A thin decorative wave band. */
export function WaveBand({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 40" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M0 18 C 60 6, 120 30, 200 16 S 340 6, 400 16 V40 H0Z" fill="#A9C7BC" />
      <path d="M0 26 C 70 14, 140 38, 220 24 S 350 16, 400 24 V40 H0Z" fill="#3F7F78" />
      <path d="M0 34 C 80 26, 160 42, 260 32 S 360 30, 400 32 V40 H0Z" fill="#7F9C82" />
    </svg>
  );
}

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${light ? 'text-white' : 'text-ink'}`}>
      <span className={`w-9 h-9 rounded-xl grid place-items-center ${light ? 'bg-field/10' : 'bg-sand'}`}><SunMark className="w-6 h-6" /></span>
      <div>
        <div className="font-serif text-[17px] leading-none">The Dream Life™</div>
        <div className={`text-[9.5px] tracking-[0.36em] mt-1.5 ${light ? 'text-gold' : 'text-teal'} font-bold`}>EXIT HUB</div>
      </div>
    </div>
  );
}

export function OptionCard({ selected, onClick, children, multi, icon }: { selected: boolean; onClick: () => void; children: ReactNode; multi?: boolean; icon?: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm transition cursor-pointer active:scale-[0.99] ${selected ? 'border-teal bg-teal-soft shadow-[0_0_0_3px_rgba(63,127,120,0.12)]' : 'border-line bg-field/70 hover:border-teal/50 hover:bg-field'}`}>
      <span className={`shrink-0 grid place-items-center w-5 h-5 border-2 ${multi ? 'rounded-md' : 'rounded-full'} ${selected ? 'border-teal bg-teal text-white' : 'border-ink/25'}`}>
        {selected && (multi ? <Check size={12} strokeWidth={3} /> : <span className="w-2 h-2 rounded-full bg-field" />)}
      </span>
      {icon}
      <span className="font-medium">{children}</span>
    </button>
  );
}

export function confirmDelete(what: string) {
  return window.confirm(`Delete ${what}? This can't be undone.`);
}

/** Day/night switch: a sun and moon on a little horizon track. */
export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const { theme, toggleTheme } = useHub();
  const dark = theme === 'dark';
  return (
    <button type="button" role="switch" aria-checked={dark} aria-label="Dark theme" onClick={toggleTheme}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative w-[58px] h-[30px] rounded-full shrink-0 cursor-pointer transition-colors duration-300 border ${onDark ? 'border-white/15' : 'border-line'} ${dark ? 'bg-[#1b2440]' : 'bg-[#f3e2bd]'}`}>
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className={`absolute left-2 top-[7px] w-1 h-1 rounded-full bg-white twinkle transition-opacity ${dark ? 'opacity-90' : 'opacity-0'}`} />
        <span className={`absolute left-4 top-[17px] w-0.5 h-0.5 rounded-full bg-white transition-opacity ${dark ? 'opacity-70' : 'opacity-0'}`} />
        <span className={`absolute right-2 bottom-[6px] w-4 h-[2px] rounded-full bg-[#3F7F78] transition-opacity ${dark ? 'opacity-0' : 'opacity-60'}`} />
      </span>
      <span className={`absolute top-[3px] w-[22px] h-[22px] rounded-full grid place-items-center shadow-md transition-all duration-300 ${dark ? 'left-[31px] bg-[#e8dfc4] text-[#1b2440]' : 'left-[3px] bg-[#B8913A] text-white'}`}>
        {dark ? <Moon size={12} strokeWidth={2.5} /> : <Sun size={12} strokeWidth={2.5} />}
      </span>
    </button>
  );
}
