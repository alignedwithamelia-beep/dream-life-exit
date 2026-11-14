// Shared helpers for Netlify functions: JSON replies and "who is calling?".
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export function adminClient(): SupabaseClient | null {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
}

export type Caller = { id: string; email: string; role: 'client' | 'coach'; full_name: string | null; stripe_customer_id: string | null; access: string };

/** The signed-in user behind the request's Bearer token, with their profile. */
export async function getCaller(req: Request, admin: SupabaseClient): Promise<Caller | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;
  const { data: p } = await admin.from('profiles').select('id, email, role, full_name, stripe_customer_id, access').eq('id', data.user.id).maybeSingle();
  return p ? ({ ...p, email: p.email ?? data.user.email ?? '' } as Caller) : null;
}

/** The address to send people back to: the site they came from if it's ours, otherwise the live site. */
export function siteOrigin(req: Request): string {
  const origin = req.headers.get('origin') ?? '';
  const known = [process.env.SITE_URL, process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean).map((u) => new URL(u!).origin);
  if (known.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return known[1] ?? known[0] ?? 'http://localhost:5173';
}
