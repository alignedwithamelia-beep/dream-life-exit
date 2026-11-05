import {
  Baby, BadgeCheck, Briefcase, CalendarHeart, Compass, FileHeart, FolderOpen, GraduationCap, HeartPulse, Home, Landmark,
  LogOut, Plane, PlaneLanding, ShieldCheck, Sparkles, Stamp, Users, Wallet, type LucideIcon,
} from 'lucide-react';

export type Tone = 'teal' | 'gold' | 'sage' | 'terracotta' | 'sky' | 'plum' | 'navy';

// Full class strings so Tailwind can see them.
export const TONE: Record<Tone, { bg: string; soft: string; text: string; bar: string; ring: string }> = {
  teal: { bg: 'bg-teal', soft: 'bg-teal-soft', text: 'text-teal', bar: 'bg-teal', ring: 'var(--color-teal)' },
  gold: { bg: 'bg-gold', soft: 'bg-gold-soft', text: 'text-gold', bar: 'bg-gold', ring: 'var(--color-gold)' },
  sage: { bg: 'bg-sage', soft: 'bg-sage-soft', text: 'text-ok-ink', bar: 'bg-sage', ring: 'var(--color-sage)' },
  terracotta: { bg: 'bg-terracotta', soft: 'bg-terracotta-soft', text: 'text-terracotta', bar: 'bg-terracotta', ring: 'var(--color-terracotta)' },
  sky: { bg: 'bg-sky', soft: 'bg-sky-soft', text: 'text-sky', bar: 'bg-sky', ring: 'var(--color-sky)' },
  plum: { bg: 'bg-plum', soft: 'bg-plum-soft', text: 'text-plum', bar: 'bg-plum', ring: 'var(--color-plum)' },
  navy: { bg: 'bg-navy', soft: 'bg-beige', text: 'text-ink', bar: 'bg-navy', ring: 'var(--color-navy)' },
};

export const CATEGORY_STYLE: Record<string, { icon: LucideIcon; tone: Tone }> = {
  'Dream Life Planning': { icon: Sparkles, tone: 'gold' },
  'Passports & Identity': { icon: BadgeCheck, tone: 'navy' },
  'Visas & Immigration': { icon: Stamp, tone: 'teal' },
  'Income & Employment': { icon: Briefcase, tone: 'sky' },
  Finances: { icon: Wallet, tone: 'sage' },
  'Insurance & Healthcare': { icon: HeartPulse, tone: 'terracotta' },
  Accommodation: { icon: Home, tone: 'plum' },
  'Flights & Travel': { icon: Plane, tone: 'sky' },
  'Family & Children': { icon: Baby, tone: 'terracotta' },
  'Leaving the UK': { icon: LogOut, tone: 'navy' },
  'Arrival Preparation': { icon: PlaneLanding, tone: 'teal' },
};

export const catStyle = (c: string) => CATEGORY_STYLE[c] ?? { icon: Compass, tone: 'teal' as Tone };

const FOLDER_STYLE: [RegExp, LucideIcon, Tone][] = [
  [/passport|identity/i, BadgeCheck, 'navy'], [/visa|immigration/i, Stamp, 'teal'], [/insurance|health/i, HeartPulse, 'terracotta'],
  [/flight|travel/i, Plane, 'sky'], [/accommodation|home/i, Home, 'plum'], [/financ|employ/i, Wallet, 'sage'],
  [/family|education|school/i, GraduationCap, 'gold'],
];
export function folderStyle(name: string): { icon: LucideIcon; tone: Tone } {
  const hit = FOLDER_STYLE.find(([re]) => re.test(name));
  return hit ? { icon: hit[1], tone: hit[2] } : { icon: FolderOpen, tone: 'teal' };
}

export const CONTACT_STYLE: Record<string, { icon: LucideIcon; tone: Tone }> = {
  'Official resources': { icon: Landmark, tone: 'teal' },
  Accommodation: { icon: Home, tone: 'plum' },
  Schools: { icon: GraduationCap, tone: 'gold' },
  Advisers: { icon: Users, tone: 'sky' },
};

export const DATE_STYLE: Record<string, Tone> = {
  'Passport & ID': 'navy', 'Visa & Immigration': 'teal', 'Insurance & Health': 'terracotta', Travel: 'sky',
  Accommodation: 'plum', 'Leaving the UK': 'navy', 'Family & Education': 'gold', Milestone: 'gold', Other: 'sage',
};

export const MEMBER_TONES: Tone[] = ['teal', 'terracotta', 'gold', 'sky', 'plum', 'sage'];

export { CalendarHeart, FileHeart, ShieldCheck };
