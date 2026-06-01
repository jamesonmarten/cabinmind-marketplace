/**
 * POST /api/dashboard/cancel
 * Cancels the customer's subscription at the end of the current billing period.
 * Body: { token }
 */
import Stripe from 'stripe';
import { getToken } from '../../../lib/tokenStore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { token } = req.body || {};
  if (!token || token.length < 10) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // Superadmin token can't be used to cancel a real subscription
  if (token === process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Superadmin token cannot cancel subscriptions.' });
  }

  try {
    // Find the customer by token (same logic as session endpoint)
    let customerId = null;

    // Try local store first
    const local = getToken(token);
    if (local?.sessionId) {
      const session = await stripe.checkout.sessions.retrieve(local.sessionId);
      customerId = session.customer;
    }

    // Fallback: search Stripe customers by metadata
    if (!customerId) {
      let startingAfter;
      outer: for (let page = 0; page < 5; page++) {
        const customers = await stripe.customers.list({
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        for (const customer of customers.data) {
          if (customer.metadata?.dashboardToken === token) {
            customerId = customer.id;
            break outer;
          }
        }
        if (!customers.has_more) break;
        startingAfter = customers.data[customers.data.length - 1]?.id;
      }
    }

    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Find their active subscription
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 5,
    });

    const activeSub = subs.data[0];
    if (!activeSub) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel at period end (they keep access until the billing cycle ends)
    const updated = await stripe.subscriptions.update(activeSub.id, {
      cancel_at_period_end: true,
    });

    const cancelDate = new Date(updated.current_period_end * 1000).toISOString();

    return res.status(200).json({
      success: true,
      message: 'Subscription will cancel at the end of your billing period.',
      cancelAt: cancelDate,
    });
  } catch (err) {
    console.error('[dashboard/cancel] Error:', err);
    return res.status(500).json({ error: 'Failed to cancel subscription. Please contact support.' });
  }
}
