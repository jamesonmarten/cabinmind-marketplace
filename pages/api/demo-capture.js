/**
 * /api/demo-capture
 *
 * POST { email, name?, icp?, source? }
 *
 * Called when a demo visitor submits their email.
 * 1. Sends them a follow-up email with a link to start free
 * 2. Notifies jameson@devcabin.tech with the lead details
 * 3. Returns { ok: true }
 */
import { Resend } from 'resend';
import { withProtection } from '../../lib/rateLimit';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM_EMAIL || 'CabinMind <info@devcabin.tech>';
const NOTIFY = process.env.NOTIFY_EMAIL || 'jameson@devcabin.tech';

export default withProtection('demo-capture', async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { email, name, icp, company, message, source = 'demo-page' } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const firstName = name?.split(' ')[0] || 'there';
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  // ── 1. Send follow-up to the prospect ──────────────────────────────────────
  const prospectHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <tr><td style="background:linear-gradient(135deg,#6d28d9,#7c3aed,#4f46e5);border-radius:16px 16px 0 0;padding:36px 40px 28px;text-align:center;">
    <div style="font-size:44px;margin-bottom:10px;">🔎</div>
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">Your free leads are waiting</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">CabinMind AI Lead Researcher</p>
  </td></tr>

  <tr><td style="background:#111118;padding:36px 40px;">
    <p style="margin:0 0 20px;color:#e2e8f0;font-size:16px;line-height:1.6;">Hey ${firstName} 👋</p>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.7;">
      Thanks for checking out CabinMind. You just saw what a few seconds of AI research looks like —
      here's how to get real leads for <em>your</em> ICP, free, no credit card.
    </p>

    ${icp ? `
    <div style="background:#1e1e2e;border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
      <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Your ICP</div>
      <div style="color:#c4b5fd;font-size:14px;font-style:italic;">"${icp}"</div>
    </div>` : ''}

    <p style="margin:0 0 8px;color:#e2e8f0;font-size:15px;font-weight:700;">What you get free:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${[
        ['5 real, verified leads', 'Matching your exact ICP — real companies, real people'],
        ['ZeroBounce email validation', 'Every email checked before you see it'],
        ['A–D ICP scoring', 'Know who to contact first, and why'],
        ['Direct LinkedIn profiles', 'Hunter.io verified /in/ URLs where available'],
        ['AI buying signal', 'One-line reason why this person might buy right now'],
      ].map(([title, desc]) => `
      <tr>
        <td width="28" valign="top" style="padding:0 10px 14px 0;">
          <div style="width:22px;height:22px;border-radius:50%;background:#6d28d9;color:#fff;font-size:12px;text-align:center;line-height:22px;font-weight:700;">✓</div>
        </td>
        <td valign="top" style="padding:0 0 14px;">
          <div style="color:#e2e8f0;font-size:14px;font-weight:600;margin-bottom:1px;">${title}</div>
          <div style="color:#64748b;font-size:13px;">${desc}</div>
        </td>
      </tr>`).join('')}
    </table>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://products.devcabin.tech/demo#live-demo"
        style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;">
        Run Free Lead Search →
      </a>
    </div>

    <div style="background:#1e1e2e;border:1px solid rgba(109,40,217,0.2);border-radius:12px;padding:18px 22px;margin-bottom:24px;">
      <div style="color:#64748b;font-size:12px;margin-bottom:8px;">When you're ready to go beyond 5 leads:</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${[
          ['Starter', '$100/mo', '100 leads/mo, ZeroBounce included, AI sequences'],
          ['Pro', '$250/mo', '500 leads/mo, bring your own Hunter key'],
          ['Scale', '$500/mo', 'Unlimited leads, full BYOK, campaign builder'],
        ].map(([plan, price, desc]) => `
        <tr>
          <td style="padding:5px 0;color:#a78bfa;font-size:13px;font-weight:700;width:70px;">${plan}</td>
          <td style="padding:5px 0;color:#e2e8f0;font-size:13px;font-weight:700;width:80px;">${price}</td>
          <td style="padding:5px 0;color:#64748b;font-size:12px;">${desc}</td>
        </tr>`).join('')}
      </table>
      <div style="margin-top:12px;">
        <a href="https://products.devcabin.tech/pricing"
          style="color:#a78bfa;font-size:13px;text-decoration:none;">See all plans →</a>
      </div>
    </div>

    <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">
      Questions? Just reply to this email — it goes straight to me.
      <br>— Jameson, Dev Cabin Technologies
    </p>
  </td></tr>

  <tr><td style="background:#0d0d14;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:0;color:#334155;font-size:11px;">
      CabinMind · Dev Cabin Technologies · products.devcabin.tech
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // ── 2. Internal alert to Jameson ───────────────────────────────────────────
  const alertHtml = `
<body style="font-family:-apple-system,sans-serif;background:#0a0a0f;padding:30px 20px;">
<div style="max-width:520px;margin:0 auto;background:#111118;border:1px solid rgba(109,40,217,0.3);border-radius:16px;padding:28px 32px;">
  <div style="font-size:32px;margin-bottom:12px;">🎯</div>
  <h2 style="color:#e2e8f0;margin:0 0 8px;font-size:18px;">New Demo Lead</h2>
  <p style="color:#64748b;font-size:13px;margin:0 0 20px;">${timestamp}</p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="color:#64748b;font-size:13px;padding:6px 0;width:100px;">Email</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;padding:6px 0;">${email}</td></tr>
    ${name    ? `<tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Name</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;padding:6px 0;">${name}</td></tr>` : ''}
    ${company ? `<tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Company</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;padding:6px 0;">${company}</td></tr>` : ''}
    ${icp     ? `<tr><td style="color:#64748b;font-size:13px;padding:6px 0;">ICP</td><td style="color:#c4b5fd;font-size:13px;font-style:italic;padding:6px 0;">"${icp}"</td></tr>` : ''}
    ${message ? `<tr><td style="color:#64748b;font-size:13px;padding:6px 0;vertical-align:top;">Message</td><td style="color:#94a3b8;font-size:13px;padding:6px 0;white-space:pre-wrap;">${message}</td></tr>` : ''}
    <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Source</td><td style="color:#e2e8f0;font-size:13px;padding:6px 0;">${source}</td></tr>
  </table>
  <div style="margin-top:20px;">
    <a href="mailto:${email}?subject=Your%20CabinMind%20free%20leads&body=Hey%20${encodeURIComponent(firstName)}%2C"
      style="display:inline-block;background:#6d28d9;color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;margin-right:8px;">
      Reply →
    </a>
    <a href="https://products.devcabin.tech/admin"
      style="display:inline-block;background:#1e293b;color:#94a3b8;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:8px;">
      Admin →
    </a>
  </div>
</div>
</body>`;

  try {
    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: email,
        subject: `Your 5 free CabinMind leads are ready — here's how to run the search`,
        html: prospectHtml,
        reply_to: 'jameson@devcabin.tech',
      }),
      resend.emails.send({
        from: FROM,
        to: NOTIFY,
        subject: `🎯 Demo lead: ${name || email}${company ? ` @ ${company}` : ''}${icp ? ` — "${icp.slice(0, 50)}"` : ''}${source !== 'demo-page' ? ` [${source}]` : ''}`,
        html: alertHtml,
      }),
    ]);

    console.log(`[demo-capture] Captured ${email} from ${source}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[demo-capture]', err.message);
    // Don't fail visibly — email capture failing shouldn't block the user
    return res.status(200).json({ ok: true, warn: err.message });
  }
});
