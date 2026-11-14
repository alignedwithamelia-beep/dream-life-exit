import { Check, Crown, Lock, Settings2, Sparkles } from 'lucide-react';
import { Modal } from './ui';
import { MEMBERSHIP_NAME, MEMBERSHIP_PERKS } from '../lib/clubDemo';
import { useMe, useMembership } from '../lib/club';
import { fmtDate, toISO } from '../lib/logic';
import { useHub } from '../lib/store';

const STATUS_TEXT: Record<string, string> = {
  active: 'Active', trialing: 'Free trial', past_due: 'Payment due', canceled: 'Cancelled', none: 'Not a member',
};

export function MembersOnlyBadge({ className = '' }: { className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full bg-gold text-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${className}`}><Lock size={10} /> Members</span>;
}

/** Join / manage card. `compact` for sidebars and profile pages. */
export function MembershipCard({ compact = false }: { compact?: boolean }) {
  const { mode } = useHub();
  const me = useMe();
  const m = useMembership();

  if (me.role === 'coach') {
    return (
      <div className="card !p-5 flex items-center gap-4">
        <span className="w-11 h-11 rounded-2xl bg-gold-soft text-gold grid place-items-center shrink-0"><Crown size={20} /></span>
        <p className="text-sm"><b>Coach access.</b> <span className="muted">You can see everything members see, add library content and moderate the community.</span></p>
      </div>
    );
  }

  if (m.isMember) {
    return (
      <div className="card !p-5 flex flex-wrap items-center gap-4">
        <span className="w-11 h-11 rounded-2xl bg-gold text-white grid place-items-center shrink-0 shadow-md"><Crown size={20} /></span>
        <div className="flex-1 min-w-48">
          <div className="font-serif text-lg leading-tight">{MEMBERSHIP_NAME}</div>
          <div className="text-sm muted">
            {STATUS_TEXT[m.status]}{m.renewsAt && ` · renews ${fmtDate(toISO(new Date(m.renewsAt)))}`}{mode !== 'remote' && ' · demo'}
          </div>
        </div>
        {m.canManage && <button className="btn-outline !py-2" disabled={m.busy} onClick={m.manage}><Settings2 size={14} /> {mode === 'remote' ? 'Manage membership' : 'Cancel (demo)'}</button>}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-sidebar text-white p-6 md:p-7" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-gold/20" />
      <div className="absolute right-10 bottom-[-40px] w-32 h-32 rounded-full border-2 border-dashed border-white/10" />
      <div className={`relative ${compact ? '' : 'md:flex md:items-center md:gap-8'}`}>
        <div className="flex-1">
          <div className="text-[11px] tracking-[0.2em] font-bold text-gold mb-2 flex items-center gap-1.5"><Sparkles size={13} /> MEMBERSHIP</div>
          <h2 className="text-2xl md:text-[28px] leading-tight mb-3">Unlock {MEMBERSHIP_NAME}</h2>
          {m.status === 'past_due' && <p className="text-sm text-warn-ink bg-white/10 rounded-xl px-3 py-2 mb-3">Your last payment didn’t go through. Update your card to keep your access.</p>}
          <ul className="space-y-1.5 text-sm text-white/80 mb-5 md:mb-0">
            {MEMBERSHIP_PERKS.map((p) => <li key={p} className="flex gap-2"><Check size={15} className="text-gold shrink-0 mt-0.5" />{p}</li>)}
          </ul>
        </div>
        <div className={`flex flex-col gap-2 ${compact ? 'mt-5' : 'md:items-end shrink-0'}`}>
          {m.price && <div className="font-serif text-3xl">{m.price}</div>}
          {m.status === 'past_due' && m.canManage
            ? <button className="btn-gold" disabled={m.busy} onClick={m.manage}>Update payment</button>
            : <button className="btn-gold" disabled={m.busy || (mode === 'remote' && !m.price)} onClick={m.join}>{m.busy ? 'Opening checkout…' : 'Become a member'}</button>}
          <span className="text-[11px] text-white/50">
            {mode === 'remote' ? (m.price ? 'Secure payment by Stripe · cancel any time' : 'Membership opens soon') : 'Demo: no payment is taken'}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Shown when someone opens something they haven't unlocked yet. */
export function PaywallModal({ title, onClose }: { title?: string; onClose: () => void }) {
  return (
    <Modal title="Members only" onClose={onClose} wide>
      {title && <p className="text-sm muted">“{title}” is part of {MEMBERSHIP_NAME}.</p>}
      <MembershipCard />
    </Modal>
  );
}
