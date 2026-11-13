import Stripe from 'stripe';
import { getOrCreateCoupon } from '../../lib/stripeCoupons';
import { PRODUCTS } from '../../lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Signup perks ────────────────────────────────────────────────────────────
// Everyone gets 50% off their first month (LAUNCH50). If they arrived via a
// referral link (?ref=cus_xxx from an existing customer), that's upgraded to
// a fully free first month, and the referrer is credited a free month too
// (handled in /api/webhook on checkout.session.completed).
const LAUNCH_COUPON_ID   = 'LAUNCH50';
const REFERRAL_COUPON_ID = 'REFERRAL-FREE-MONTH';

// Prices come from lib/plans.js so the pricing page, the chat assistant and the
// card charge can never disagree.
const AGENT_PRICES = Object.fromEntries(
  Object.entries(PRODUCTS).map(([id, p]) => [
    id,
    { name: p.name, amount: p.amountCents, ...(p.mode ? { mode: p.mode } : {}) },
  ])
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId, utms = {}, ref } = req.body;
  const agentPrice = AGENT_PRICES[agentId];

  if (!agentPrice) {
    return res.status(400).json({ error: 'Invalid agent ID' });
  }

  // Validate an optional referral code — must be a real, different Stripe customer
  let referredBy = null;
  if (typeof ref === 'string' && ref.startsWith('cus_')) {
    try {
      const referrer = await stripe.customers.retrieve(ref);
      if (referrer && !referrer.deleted) referredBy = ref;
    } catch {
      // invalid/unknown customer id — silently ignore, no perk applied
    }
  }

  // Strip any trailing slash and quotes so Stripe never sees a malformed URL
  const rawBase = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002';
  const baseUrl = rawBase.replace(/\/+$/, '').replace(/^["']|["']$/g, '').trim();

  if (!baseUrl.startsWith('http')) {
    return res.status(500).json({ error: `Bad BASE_URL config: "${baseUrl}"` });
  }

  const successUrl = `${baseUrl}/checkout/success?agent=${agentId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${baseUrl}/agents/${agentId}?cancelled=true`;
  console.log('[checkout] baseUrl:', baseUrl);
  console.log('[checkout] successUrl:', successUrl);

  // Merge agentId + UTM attribution into Stripe session metadata
  const metadata = {
    agentId,
    ...(referredBy && { referredBy }),
    ...(utms.utm_source   && { utm_source:   String(utms.utm_source).slice(0,500)   }),
    ...(utms.utm_medium   && { utm_medium:   String(utms.utm_medium).slice(0,500)   }),
    ...(utms.utm_campaign && { utm_campaign: String(utms.utm_campaign).slice(0,500) }),
    ...(utms.utm_content  && { utm_content:  String(utms.utm_content).slice(0,500)  }),
    ...(utms.gclid        && { gclid:        String(utms.gclid).slice(0,500)        }),
    ...(utms.fbclid       && { fbclid:       String(utms.fbclid).slice(0,500)       }),
  };

  try {
    const isOneTime = agentPrice.mode === 'payment';

    // One-time purchases don't get a recurring "first month" perk
    let discounts;
    if (!isOneTime) {
      const coupon = referredBy
        ? await getOrCreateCoupon(stripe, REFERRAL_COUPON_ID, { percent_off: 100, duration: 'once', name: 'Referral — free first month' })
        : await getOrCreateCoupon(stripe, LAUNCH_COUPON_ID,   { percent_off: 50,  duration: 'once', name: 'Launch offer — 50% off first month' });
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isOneTime ? 'payment' : 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            ...(isOneTime ? {} : { recurring: { interval: 'month' } }),
            product_data: {
              name: agentPrice.name,
              description: isOneTime
                ? `CabinMind – ${agentPrice.name} (one-time purchase)`
                : `CabinMind – ${agentPrice.name} monthly subscription`,
              images: [],
            },
            unit_amount: agentPrice.amount,
          },
          quantity: 1,
        },
      ],
      // Pass agentId + UTM attribution so the webhook knows which product was purchased
      metadata,
      ...(!isOneTime && { subscription_data: { metadata } }),
      success_url: successUrl,
      cancel_url:  cancelUrl,
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      billing_address_collection: 'required',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
