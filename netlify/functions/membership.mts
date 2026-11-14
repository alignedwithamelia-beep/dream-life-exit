// /.netlify/functions/membership
//   GET                         -> the membership price to show (public)
//   POST { action: 'checkout' } -> a Stripe Checkout link to join (signed-in clients)
//   POST { action: 'portal' }   -> a Stripe billing portal link to update card or cancel (members)
// The price itself is set in Stripe; STRIPE_PRICE_ID says which one.
import Stripe from 'stripe';
import { adminClient, getCaller, json, siteOrigin } from '../lib/auth.mts';

export default async (req: Request) => {
  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) return json({ configured: false, error: 'Payments aren’t set up yet.' }, req.method === 'GET' ? 200 : 503);
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  if (req.method === 'GET') {
    const price = await stripe.prices.retrieve(STRIPE_PRICE_ID);
    const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: price.currency.toUpperCase() })
      .format((price.unit_amount ?? 0) / 100).replace(/\.00$/, '');
    const every = price.recurring ? (price.recurring.interval_count > 1 ? `every ${price.recurring.interval_count} ${price.recurring.interval}s` : `/${price.recurring.interval}`) : 'one-off';
    return json({ configured: true, label: price.recurring ? `${amount}${every.startsWith('/') ? every : ` ${every}`}` : `${amount} one-off`, recurring: !!price.recurring });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const admin = adminClient();
  if (!admin) return json({ error: 'The server isn’t configured yet.' }, 500);
  const me = await getCaller(req, admin);
  if (!me) return json({ error: 'Please sign in again.' }, 401);
  const { action } = await req.json().catch(() => ({ action: '' }));
  const back = siteOrigin(req);

  if (action === 'portal') {
    if (!me.stripe_customer_id) return json({ error: 'There’s no membership to manage yet.' }, 400);
    const portal = await stripe.billingPortal.sessions.create({ customer: me.stripe_customer_id, return_url: `${back}/library` });
    return json({ url: portal.url });
  }

  if (action === 'checkout') {
    if (me.role === 'coach') return json({ error: 'Coaches already have full access.' }, 400);
    let customer = me.stripe_customer_id;
    if (!customer) {
      const c = await stripe.customers.create({ email: me.email, name: me.full_name ?? undefined, metadata: { profile_id: me.id } });
      customer = c.id;
      await admin.from('profiles').update({ stripe_customer_id: customer }).eq('id', me.id);
    }
    const price = await stripe.prices.retrieve(STRIPE_PRICE_ID);
    const session = await stripe.checkout.sessions.create({
      mode: price.recurring ? 'subscription' : 'payment',
      customer,
      client_reference_id: me.id,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${back}/library?joined=1`,
      cancel_url: `${back}/library`,
      metadata: { profile_id: me.id },
      ...(price.recurring ? { subscription_data: { metadata: { profile_id: me.id } } } : {}),
    });
    return json({ url: session.url });
  }

  return json({ error: 'Unknown action.' }, 400);
};
