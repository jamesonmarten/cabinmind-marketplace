/**
 * /api/session
 * Returns limited Stripe session data for the success page (customer name/email).
 * Only exposes non-sensitive fields — never returns payment details.
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id || !id.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['customer_details'],
    });

    // Only return the fields the frontend needs
    return res.status(200).json({
      customer_details: {
        name:  session.customer_details?.name  || null,
        email: session.customer_details?.email || null,
      },
      metadata: session.metadata || {},
    });
  } catch (err) {
    console.error('[api/session]', err.message);
    return res.status(500).json({ error: 'Could not retrieve session' });
  }
}
