// Daily at 07:00 UTC: emails each active client the important dates whose reminder falls today.
// Does nothing until SMTP_* (or RESEND_API_KEY and INVITE_FROM) are set.
import { createClient } from '@supabase/supabase-js';
import { getMailer } from '../lib/mail.mts';

export const config = { schedule: '0 7 * * *' };

type HubDate = { title: string; date: string; reminder: string; done: boolean };
const OFFSET: Record<string, number> = { day: 0, '1d': 1, '1w': 7, '1m': 30 };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async () => {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  const SITE_URL = process.env.URL || process.env.SITE_URL; // Netlify sets URL to the live address
  const send = getMailer();
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !send) return new Response('Reminders not configured');

  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);

  const { data: clients } = await admin.from('profiles').select('id, email, full_name').eq('role', 'client').eq('access', 'active');
  let sent = 0;
  for (const c of clients ?? []) {
    if (!c.email) continue;
    const { data: row } = await admin.from('client_private').select('data').eq('client_id', c.id).maybeSingle();
    const dates: HubDate[] = row?.data?.dates ?? [];
    const due = dates.filter((d) => !d.done && d.reminder in OFFSET && shift(d.date, OFFSET[d.reminder]) === today);
    if (!due.length) continue;
    const items = due.map((d) => `<li><b>${esc(d.title)}</b> · ${new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</li>`).join('');
    const ok = await send({
      to: c.email,
      subject: due.length === 1 ? `Reminder: ${due[0].title}` : `${due.length} dates coming up`,
      html: `<div style="font-family:sans-serif;color:#1E2A47;max-width:520px;margin:auto;padding:24px;line-height:1.6">
        <p style="letter-spacing:.18em;font-size:11px;font-weight:600;color:#3F7F78">THE DREAM LIFE™ EXIT HUB</p>
        <p>Hi ${esc((c.full_name ?? '').split(' ')[0] || 'there')}, a gentle reminder:</p><ul>${items}</ul>
        ${SITE_URL ? `<p><a href="${SITE_URL}/dates" style="color:#3F7F78">Open my dates</a></p>` : ''}</div>`,
    });
    if (ok) sent++;
  }
  return new Response(`Sent ${sent} reminder emails`);
};
