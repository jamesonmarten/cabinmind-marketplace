import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map agent IDs to Stripe price data.
// In production, store real Stripe Price IDs here after creating them in your dashboard.
const AGENT_PRICES = {
  // Flat-rate agents
  'website-audit':   { name: 'AI Website Auditor',           amount: 5000  }, // $50/mo
  'blog-writer':     { name: 'AI Blog Writer',               amount: 5000  }, // $50/hr (treated as first session)
  'receptionist':    { name: 'AI Receptionist',              amount: 8000  }, // $80/mo
  'sales-assistant': { name: 'AI Sales Assistant',           amount: 10000 }, // $100/mo
  'social-hub':      { name: 'AI Social Media Hub',          amount: 5000  }, // $50/mo
  'ai-training':     { name: '1-on-1 AI Training (1 hr)',    amount: 5000 },  // $50/hr
  'ai-training-lifetime': { name: '1-on-1 AI Training — Lifetime Pass', amount: 50000 }, // $500 once
  // Lead Researcher — BYOK tiered plans
  'lead-researcher': { name: 'AI Lead Researcher — Starter', amount: 10000 }, // $100/mo  legacy redirect → Starter
  'lead-starter':    { name: 'AI Lead Researcher — Starter', amount: 10000 }, // $100/mo  · platform keys · 100 leads
  'lead-pro':        { name: 'AI Lead Researcher — Pro',     amount: 25000 }, // $250/mo · client Hunter key · 500 leads
  'lead-scale':      { name: 'AI Lead Researcher — Scale',   amount: 50000 }, // $500/mo · full BYOK · unlimited
  'lead-agency':     { name: 'AI Lead Researcher — Agency',  amount: 100000}, // $1000/mo · BYOK · 5 seats · white-label
  // AI Automation Expert — three tiers
  'automation-single': { name: 'AI Automation — Single Workflow', amount: 4700,  mode: 'payment' }, // $47 one-time
  'automation-expert': { name: 'AI Automation Expert',            amount: 19700 }, // $197/mo · 25 generations/mo
  'automation-agency': { name: 'AI Automation Expert — Agency',   amount: 49700 }, // $497/mo · unlimited, white-label exports
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
    const isOneTime = agentPrice.mode === 'payment';
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
