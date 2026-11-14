// Stripe calls this when someone pays, renews, fails a payment or cancels.
// It's the only thing that changes profiles.membership, so access always matches billing.
// Stripe Dashboard > Developers > Webhooks: point it at https://<site>/.netlify/functions/stripe-webhook
// with checkout.session.completed and customer.subscription.created/updated/deleted.
import Stripe from 'stripe';
import { adminClient, json } from '../lib/auth.mts';

const STATUS: Record<string, string> = {
  active: 'active', trialing: 'trialing', past_due: 'past_due', unpaid: 'past_due',
  canceled: 'canceled', incomplete_expired: 'canceled', incomplete: 'none', paused: 'canceled',
};

export default async (req: Request) => {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;
  const admin = adminClient();
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !admin) return json({ error: 'Not configured' }, 503);
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature') ?? '', STRIPE_WEBHOOK_SECRET);
  } catch {
    return json({ error: 'Bad signature' }, 400);
  }

  const setMembership = async (customer: string, membership: string, renews: number | null, profileId?: string | null) => {
    const patch = { membership, membership_renews_at: renews ? new Date(renews * 1000).toISOString() : null, stripe_customer_id: customer };
    const { data } = await admin.from('profiles').update(patch).eq('stripe_customer_id', customer).select('id');
    if (!data?.length && profileId) await admin.from('profiles').update(patch).eq('id', profileId);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const customer = typeof s.customer === 'string' ? s.customer : s.customer?.id;
      if (!customer) break;
      if (s.mode === 'payment' && s.payment_status === 'paid') await setMembership(customer, 'active', null, s.client_reference_id);
      if (s.mode === 'subscription' && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id);
        await setMembership(customer, STATUS[sub.status] ?? 'none', sub.current_period_end, s.client_reference_id);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : STATUS[sub.status] ?? 'none';
      await setMembership(customer, status, sub.current_period_end, sub.metadata?.profile_id);
      break;
    }
  }
  return json({ received: true });
};
