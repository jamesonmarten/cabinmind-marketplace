import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map agent IDs to Stripe price data.
// In production, store real Stripe Price IDs here after creating them in your dashboard.
const AGENT_PRICES = {
  receptionist:    { name: 'AI Receptionist',   amount: 3900  }, // $39/mo
  'website-audit': { name: 'AI Website Auditor', amount: 1900  }, // $19/mo
  'blog-writer':   { name: 'AI Blog Writer',     amount: 2900  }, // $29/mo
  'sales-assistant':{ name: 'AI Sales Assistant',amount: 4900  }, // $49/mo
  'lead-researcher':{ name: 'AI Lead Researcher', amount: 5900  }, // $59/mo
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId } = req.body;
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
      // Pass agentId so the webhook knows which product was purchased
      metadata: { agentId },
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
