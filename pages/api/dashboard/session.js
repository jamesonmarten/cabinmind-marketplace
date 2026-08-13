/**
 * /api/dashboard/session
 * Validates a dashboard token and returns the customer's session data.
 * Falls back to Stripe customer metadata if the local token store is cold (Vercel /tmp cleared).
 */
import Stripe from 'stripe';
import { getToken, saveToken } from '../../../lib/tokenStore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token || token.length < 10) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // ─── Superadmin bypass ───────────────────────────────────────────────────
  // When the token equals ADMIN_SECRET, return a synthetic session so the
  // owner can access any dashboard variant. Pass ?as=lead-researcher (or any
  // agentId from DASHBOARDS) to choose which dashboard to render.
  if (token === process.env.ADMIN_SECRET) {
    const agentId = (req.query.as || 'lead-researcher').toString();
    return res.status(200).json({
      agentId,
      customerEmail: 'superadmin@devcabin.tech',
      customerName:  'Superadmin',
      sessionId:     'superadmin',
      token,
      isSuperadmin:  true,
    });
  }

  // 1. Try the local file store first (fast path)
  const local = getToken(token);
  if (local) {
    return res.status(200).json({
      agentId:       local.agentId,
      customerEmail: local.customerEmail,
      customerName:  local.customerName || '',
      sessionId:     local.sessionId,
      token,
    });
  }

  // 2. Fallback — search Stripe customers by dashboardToken metadata
  // (handles Vercel cold restarts where /tmp is wiped)
  try {
    let foundSession = null;

    // Paginate through recent customers looking for a metadata match
    let startingAfter = undefined;
    outer: for (let page = 0; page < 5; page++) {
      const customers = await stripe.customers.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const customer of customers.data) {
        if (customer.metadata?.dashboardToken === token) {
          // Found the customer — now find their most recent completed checkout session
          const sessions = await stripe.checkout.sessions.list({
            customer: customer.id,
            limit: 10,
          });
          const completed = sessions.data.find(s => s.status === 'complete' || s.payment_status === 'paid');
          foundSession = {
            agentId:       customer.metadata?.agentId || completed?.metadata?.agentId || '',
            customerEmail: customer.email || '',
            customerName:  customer.name  || '',
            sessionId:     completed?.id  || '',
          };
          break outer;
        }
      }

      if (!customers.has_more) break;
      startingAfter = customers.data[customers.data.length - 1].id;
    }

    if (!foundSession) {
      return res.status(404).json({ error: 'Dashboard link not found. Check your welcome email for the correct link.' });
    }

    // Re-hydrate the local store so future lookups are instant
    saveToken(token, foundSession);

    return res.status(200).json({ ...foundSession, token });
  } catch (err) {
    console.error('[dashboard/session] Stripe fallback error:', err.message);
    return res.status(500).json({ error: 'Could not validate your session. Please contact info@devcabin.tech' });
  }
}
