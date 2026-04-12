import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map agent IDs to Stripe price data.
// In production, store real Stripe Price IDs here after creating them in your dashboard.
const AGENT_PRICES = {
  // Flat-rate agents (no external API cost)
  'website-audit':   { name: 'AI Website Auditor',           amount: 2900  }, // $29/mo
  'blog-writer':     { name: 'AI Blog Writer',               amount: 4900  }, // $49/mo
  'receptionist':    { name: 'AI Receptionist',              amount: 7900  }, // $79/mo
  'sales-assistant': { name: 'AI Sales Assistant',           amount: 9900  }, // $99/mo
  'social-hub':      { name: 'AI Social Media Hub',          amount: 4900  }, // $49/mo
  // Lead Researcher — BYOK tiered plans
  'lead-researcher': { name: 'AI Lead Researcher — Starter', amount: 9700  }, // $97/mo  legacy redirect → Starter
  'lead-starter':    { name: 'AI Lead Researcher — Starter', amount: 9700  }, // $97/mo  · platform keys · 100 leads
  'lead-pro':        { name: 'AI Lead Researcher — Pro',     amount: 24700 }, // $247/mo · client Hunter key · 500 leads
  'lead-scale':      { name: 'AI Lead Researcher — Scale',   amount: 49700 }, // $497/mo · full BYOK · unlimited
  'lead-agency':     { name: 'AI Lead Researcher — Agency',  amount: 99700 }, // $997/mo · BYOK · 5 seats · white-label
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId, utms = {} } = req.body;
  const agentPrice = AGENT_PRICES[agentId];

  if (!agentPrice) {
    return res.status(400).json({ error: 'Invalid agent ID' });
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
    ...(utms.utm_source   && { utm_source:   String(utms.utm_source).slice(0,500)   }),
    ...(utms.utm_medium   && { utm_medium:   String(utms.utm_medium).slice(0,500)   }),
    ...(utms.utm_campaign && { utm_campaign: String(utms.utm_campaign).slice(0,500) }),
    ...(utms.utm_content  && { utm_content:  String(utms.utm_content).slice(0,500)  }),
    ...(utms.gclid        && { gclid:        String(utms.gclid).slice(0,500)        }),
    ...(utms.fbclid       && { fbclid:       String(utms.fbclid).slice(0,500)       }),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            product_data: {
              name: agentPrice.name,
              description: `CabinMind – ${agentPrice.name} monthly subscription`,
              images: [],
            },
            unit_amount: agentPrice.amount,
          },
          quantity: 1,
        },
      ],
      // Pass agentId + UTM attribution so the webhook knows which product was purchased
      metadata,
      success_url: successUrl,
      cancel_url:  cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
