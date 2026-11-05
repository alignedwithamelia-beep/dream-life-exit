// POST /.netlify/functions/invite  { name, email, sessionDate }
// Coach-only. Creates (or re-invites) a client and emails them a secure sign-in link.
// Sends through SMTP (or Resend). Without either, the link is returned so the coach can send it themselves.
import { createClient } from '@supabase/supabase-js';
import { getMailer } from '../lib/mail.mts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, SITE_URL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !SITE_URL) return json({ error: 'The server isn’t configured yet.' }, 500);

  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  // Only signed-in coaches may invite.
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Please sign in again.' }, 401);
  const { data: who } = await admin.auth.getUser(token);
  if (!who.user) return json({ error: 'Please sign in again.' }, 401);
  const { data: me } = await admin.from('profiles').select('role').eq('id', who.user.id).maybeSingle();
  if (me?.role !== 'coach') return json({ error: 'Only coaches can invite clients.' }, 403);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().toLowerCase();
  const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(body.sessionDate ?? '') ? body.sessionDate : null;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please add a name and a valid email.' }, 400);

  // Send the client back to the site the coach is using: the live site, or a local dev server.
  // (It must also be listed in Supabase > Authentication > URL configuration > Redirect URLs.)
  // Netlify sets URL (the site's main address) and DEPLOY_PRIME_URL itself, so the live site works
  // even if SITE_URL still points at localhost.
  const origin = req.headers.get('origin') ?? '';
  const known = [SITE_URL, process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean).map((u) => new URL(u!).origin);
  const siteOrigin = process.env.URL ? new URL(process.env.URL).origin : new URL(SITE_URL).origin;
  const redirectTo = known.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : siteOrigin;

  const options = { data: { full_name: name, session_date: sessionDate ?? '' }, redirectTo };
  let { data: link, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options });
  if (error && /already/i.test(error.message)) {
    ({ data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } }));
  }
  if (error || !link?.user) return json({ error: error?.message ?? 'Couldn’t create the invitation.' }, 400);

  const { data: existing } = await admin.from('profiles').select('role').eq('id', link.user.id).maybeSingle();
  if (existing?.role === 'coach') return json({ error: 'That email belongs to a coach account.' }, 400);
  await admin.from('profiles').upsert({ id: link.user.id, email, full_name: name, session_date: sessionDate, role: 'client' });
  await admin.from('invites').insert({ email, full_name: name, session_date: sessionDate, claimed_by: link.user.id });

  const url = link.properties.action_link;
  const send = getMailer();
  if (!send) return json({ emailed: false, link: url });

  const first = esc(name.split(' ')[0]);
  const sent = await send({
    to: email,
    subject: 'Your Dream Life Exit Hub™ is ready',
    html: `<div style="font-family:Georgia,serif;color:#1E2A47;max-width:520px;margin:auto;padding:24px">
      <p style="letter-spacing:.18em;font:600 11px sans-serif;color:#3F7F78">THE DREAM LIFE™</p>
      <h1 style="font-weight:500">Welcome, ${first}.</h1>
      <p style="font-family:sans-serif;line-height:1.6">Your coach has set up your personal Exit Hub: your checklist, four-week plan, document vault and dates, all in one place.</p>
      <p><a href="${url}" style="display:inline-block;background:#B8913A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-family:sans-serif;font-weight:600">Open my Hub</a></p>
      <p style="font-family:sans-serif;font-size:13px;color:#6B7180">This secure link works once. Next time, sign in at ${esc(redirectTo)} with this email address.</p>
    </div>`,
  });
  if (!sent) return json({ emailed: false, link: url });
  return json({ emailed: true });
};
