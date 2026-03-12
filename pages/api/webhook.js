/**
 * /api/webhook
 * Receives Stripe events and handles post-payment provisioning.
 * Stripe requires the raw body — disable Next.js body parsing for this route.
 *
 * Setup:
 *  1. Add STRIPE_WEBHOOK_SECRET to .env.local (from Stripe Dashboard → Webhooks)
 *  2. Add RESEND_API_KEY to .env.local (from resend.com → API Keys)
 *  3. Register this endpoint in Stripe Dashboard:
 *     https://dashboard.stripe.com/webhooks → Add endpoint → https://yourdomain.com/api/webhook
 *     Events to listen for: checkout.session.completed, customer.subscription.deleted
 */

import Stripe from 'stripe';
import { Resend } from 'resend';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const AGENT_META = {
  receptionist:      { name: 'AI Receptionist',    icon: '🤖', price: '$39/mo', setupUrl: 'https://cabinmind.com/setup/receptionist' },
  'website-audit':   { name: 'AI Website Auditor',  icon: '📈', price: '$19/mo', setupUrl: 'https://cabinmind.com/setup/website-audit' },
  'blog-writer':     { name: 'AI Blog Writer',       icon: '✍️', price: '$29/mo', setupUrl: 'https://cabinmind.com/setup/blog-writer' },
  'sales-assistant': { name: 'AI Sales Assistant',   icon: '💼', price: '$49/mo', setupUrl: 'https://cabinmind.com/setup/sales-assistant' },
  'lead-researcher': { name: 'AI Lead Researcher',   icon: '🔎', price: '$59/mo', setupUrl: 'https://cabinmind.com/setup/lead-researcher' },
};

/** Read the raw body from the request stream */
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Send a beautiful HTML confirmation email via Resend */
async function sendConfirmationEmail({ toEmail, toName, agentId, sessionId }) {
  const agent = AGENT_META[agentId] || { name: 'Your CabinMind Agent', icon: '⚡', price: '', setupUrl: 'https://cabinmind.com' };
  const firstName = toName?.split(' ')[0] || 'there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to CabinMind!</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6d28d9,#7c3aed,#4f46e5);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">${agent.icon}</div>
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Welcome to CabinMind!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:15px;">Your ${agent.name} is ready to activate</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#111118;padding:36px 40px;">
          <p style="margin:0 0 20px;color:#e2e8f0;font-size:16px;line-height:1.6;">Hey ${firstName} 👋</p>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.7;">
            Thank you for subscribing to the <strong style="color:#a78bfa;">${agent.name}</strong>. Your payment was successful and your agent account is being provisioned right now.
          </p>

          <!-- Order box -->
          <div style="background:#1e1e2e;border:1px solid rgba(109,40,217,0.3);border-radius:12px;padding:20px 24px;margin-bottom:28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;">Agent</td>
                <td align="right" style="color:#e2e8f0;font-size:13px;font-weight:600;padding:6px 0;">${agent.name}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;">Billing</td>
                <td align="right" style="color:#e2e8f0;font-size:13px;font-weight:600;padding:6px 0;">${agent.price} · monthly</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;">Account</td>
                <td align="right" style="color:#e2e8f0;font-size:13px;font-weight:600;padding:6px 0;">${toEmail}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding:6px 0;">Order ref</td>
                <td align="right" style="color:#64748b;font-size:11px;font-family:monospace;padding:6px 0;">${sessionId?.slice(0, 24)}…</td>
              </tr>
            </table>
          </div>

          <!-- Next steps -->
          <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;font-weight:700;">Your next steps</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${[
              ['1', 'Activate your agent', `Click the button below to open your setup guide and go live in minutes.`],
              ['2', 'Connect your tools', 'Link your CRM, calendar, or website — depending on which agent you chose.'],
              ['3', 'Monitor results', 'Check your CabinMind dashboard to see your agent working in real time.'],
            ].map(([n, title, desc]) => `
            <tr>
              <td width="36" valign="top" style="padding:0 12px 16px 0;">
                <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">${n}</div>
              </td>
              <td valign="top" style="padding:0 0 16px;">
                <div style="color:#e2e8f0;font-size:14px;font-weight:600;margin-bottom:2px;">${title}</div>
                <div style="color:#64748b;font-size:13px;line-height:1.5;">${desc}</div>
              </td>
            </tr>`).join('')}
          </table>

          <!-- CTA button -->
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${agent.setupUrl}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
              Activate Your Agent →
            </a>
          </div>

          <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">
            Questions? Reply to this email or reach us at <a href="mailto:support@cabinmind.com" style="color:#a78bfa;">support@cabinmind.com</a>. We typically respond within a few hours.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d0d14;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 6px;color:#334155;font-size:12px;">Dev Cabin Technologies · CabinMind AI Agents</p>
          <p style="margin:0;color:#1e293b;font-size:11px;">
            You're receiving this because you subscribed at cabinmind.com.
            <a href="https://cabinmind.com/unsubscribe" style="color:#334155;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'CabinMind <onboarding@resend.dev>';
  await resend.emails.send({
    from: fromAddress,
    to: toEmail,
    subject: `🎉 Your ${agent.name} is ready — here's how to get started`,
    html,
  });
}

/** Send an internal alert to yourself when a sale comes in */
async function sendInternalAlert({ toEmail, toName, agentId, amountTotal, sessionId }) {
  const agent = AGENT_META[agentId] || { name: agentId, price: '' };
  const notifyEmail = process.env.NOTIFY_EMAIL || 'hello@cabinmind.com';

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'CabinMind <onboarding@resend.dev>';
  await resend.emails.send({
    from: fromAddress,
    to: notifyEmail,
    subject: `💰 New subscription: ${agent.name} — ${toName || toEmail}`,
    html: `<p><strong>New sale!</strong></p>
           <ul>
             <li>Agent: ${agent.name}</li>
             <li>Customer: ${toName || '—'} &lt;${toEmail}&gt;</li>
             <li>Amount: $${((amountTotal || 0) / 100).toFixed(2)}</li>
             <li>Session: ${sessionId}</li>
           </ul>`,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);

    if (webhookSecret && sig) {
      // Verify the webhook signature (required in production)
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // Dev fallback — no signature check (only safe on localhost)
      event = JSON.parse(rawBody.toString());
      console.warn('[webhook] ⚠️  No STRIPE_WEBHOOK_SECRET set — skipping signature verification');
    }
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Handle events ─────────────────────────────────────────────────────────
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName  = session.customer_details?.name  || '';
      const agentId       = session.metadata?.agentId || '';
      const amountTotal   = session.amount_total;

      console.log(`[webhook] ✅ checkout.session.completed — ${customerEmail} — ${agentId}`);

      if (customerEmail) {
        // Send confirmation email to the customer
        await sendConfirmationEmail({
          toEmail:   customerEmail,
          toName:    customerName,
          agentId,
          sessionId: session.id,
        }).catch(err => console.error('[webhook] Failed to send confirmation email:', err.message));

        // Notify yourself of the sale
        await sendInternalAlert({
          toEmail:    customerEmail,
          toName:     customerName,
          agentId,
          amountTotal,
          sessionId: session.id,
        }).catch(err => console.error('[webhook] Failed to send internal alert:', err.message));
      } else {
        console.warn('[webhook] No customer email found on session — skipping emails');
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      console.log(`[webhook] ❌ Subscription cancelled: ${sub.id}`);
      // TODO: revoke access / update database
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err);
    // Still return 200 so Stripe doesn't retry
  }

  return res.status(200).json({ received: true });
}
