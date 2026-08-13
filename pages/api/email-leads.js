/**
 * /api/email-leads
 *
 * POST { leads: Lead[], toEmail: string, toName?: string, icp?: string }
 *
 * Sends a beautifully formatted HTML email of the lead results via Resend.
 * Works for both demo users (5 leads) and paid users (up to 100 per email).
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM_EMAIL || 'CabinMind <info@devcabin.tech>';
const MAX_LEADS = 100;

function scoreColor(score, grade) {
  const g = grade || (score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D');
  if (g === 'A') return { bg: '#065f46', text: '#6ee7b7', label: 'Hot 🔥' };
  if (g === 'B') return { bg: '#1e3a5f', text: '#93c5fd', label: 'Warm ✨' };
  if (g === 'C') return { bg: '#78350f', text: '#fcd34d', label: 'Cool' };
  return            { bg: '#1f2937', text: '#9ca3af', label: 'Cold' };
}

function buildLeadRow(lead, i) {
  const s = scoreColor(lead.score, lead.grade);
  const email = lead.email || '—';
  const linkedin = lead.linkedin
    ? `<a href="${lead.linkedin}" style="color:#a78bfa;">LinkedIn →</a>`
    : '—';

  return `
  <tr style="border-bottom:1px solid #1e1e2e;">
    <td style="padding:14px 12px;color:#e2e8f0;font-size:13px;font-weight:600;white-space:nowrap;">
      ${i + 1}. ${lead.name || '—'}
    </td>
    <td style="padding:14px 12px;color:#94a3b8;font-size:12px;">
      ${lead.title || '—'}<br>
      <span style="color:#6b7280;">${lead.company || '—'}</span>
    </td>
    <td style="padding:14px 12px;text-align:center;">
      <span style="background:${s.bg};color:${s.text};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">
        ${lead.grade || 'B'} · ${lead.score} — ${s.label}
      </span>
    </td>
    <td style="padding:14px 12px;color:#94a3b8;font-size:12px;font-family:monospace;">
      ${email}
    </td>
    <td style="padding:14px 12px;font-size:12px;">
      ${linkedin}
    </td>
    <td style="padding:14px 12px;color:#94a3b8;font-size:12px;">
      ${lead.signal ? `🔥 ${lead.signal}` : '—'}
    </td>
  </tr>`;
}

function buildHTML({ leads, toName, icp }) {
  const firstName = toName?.split(' ')[0] || 'there';
  const avgScore = leads.length
    ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / leads.length)
    : 0;
  const hotLeads  = leads.filter(l => (l.grade || 'B') === 'A').length;
  const warmLeads = leads.filter(l => (l.grade || 'B') === 'B').length;
  const withEmail = leads.filter(l => l.email).length;

  const rows = leads.slice(0, MAX_LEADS).map((l, i) => buildLeadRow(l, i)).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your CabinMind Lead Results</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:32px 16px;">
<tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#6d28d9,#7c3aed,#4f46e5);border-radius:16px 16px 0 0;padding:36px 40px 28px;text-align:center;">
    <div style="font-size:42px;margin-bottom:10px;">🔎</div>
    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">Your Lead Research Results</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">
      ${leads.length} prospects researched by CabinMind AI
    </p>
  </td></tr>

  <!-- Stats row -->
  <tr><td style="background:#13131f;padding:0 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #1e1e2e;padding:24px 0;">
      <tr>
        <td style="text-align:center;padding:0 12px;">
          <div style="font-size:28px;font-weight:800;color:#fff;">${leads.length}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Total Leads</div>
        </td>
        <td style="text-align:center;padding:0 12px;border-left:1px solid #1e1e2e;">
          <div style="font-size:28px;font-weight:800;color:#6ee7b7;">${hotLeads}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Grade A 🔥</div>
        </td>
        <td style="text-align:center;padding:0 12px;border-left:1px solid #1e1e2e;">
          <div style="font-size:28px;font-weight:800;color:#93c5fd;">${warmLeads}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Grade B ✨</div>
        </td>
        <td style="text-align:center;padding:0 12px;border-left:1px solid #1e1e2e;">
          <div style="font-size:28px;font-weight:800;color:#fff;">${avgScore}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Avg Score</div>
        </td>
        <td style="text-align:center;padding:0 12px;border-left:1px solid #1e1e2e;">
          <div style="font-size:28px;font-weight:800;color:#a78bfa;">${withEmail}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">With Email</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ICP label -->
  ${icp ? `
  <tr><td style="background:#13131f;padding:16px 40px 0;">
    <p style="margin:0;font-size:12px;color:#6b7280;">
      ICP: <span style="color:#a78bfa;">${icp.slice(0, 120)}${icp.length > 120 ? '…' : ''}</span>
    </p>
  </td></tr>` : ''}

  <!-- Lead table -->
  <tr><td style="background:#13131f;padding:20px 40px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e1e2e;border-radius:12px;overflow:hidden;">
      <thead>
        <tr style="background:#1a1a2e;">
          <th style="padding:12px;text-align:left;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Name</th>
          <th style="padding:12px;text-align:left;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Title / Company</th>
          <th style="padding:12px;text-align:center;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Score</th>
          <th style="padding:12px;text-align:left;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</th>
          <th style="padding:12px;text-align:left;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">LinkedIn</th>
          <th style="padding:12px;text-align:left;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Buying Signal</th>
        </tr>
      </thead>
      <tbody style="background:#111118;">
        ${rows}
      </tbody>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:#13131f;padding:0 40px 36px;text-align:center;">
    <a href="https://products.devcabin.tech/demo"
      style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;margin-bottom:12px;">
      Generate More Leads →
    </a>
    <p style="margin:12px 0 0;color:#4b5563;font-size:12px;">
      Upgrade for 100 leads/run, ZeroBounce verification, LinkedIn profiles &amp; CRM export.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0d0d17;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #1e1e2e;">
    <p style="margin:0;color:#374151;font-size:12px;">
      CabinMind by Dev Cabin Technologies ·
      <a href="https://products.devcabin.tech" style="color:#6d28d9;text-decoration:none;">products.devcabin.tech</a>
    </p>
    <p style="margin:6px 0 0;color:#374151;font-size:11px;">
      Questions? Reply to this email or contact <a href="mailto:info@devcabin.tech" style="color:#6d28d9;text-decoration:none;">info@devcabin.tech</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { leads = [], toEmail, toName = '', icp = '' } = req.body || {};

  if (!toEmail || !toEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'No leads to send.' });
  }

  const capped = leads.slice(0, MAX_LEADS);
  const firstName = toName?.split(' ')[0] || 'there';

  try {
    await resend.emails.send({
      from:    FROM,
      to:      toEmail,
      subject: `🔎 Your ${capped.length} CabinMind Lead Research Results`,
      html:    buildHTML({ leads: capped, toName, icp }),
    });

    // Also notify Jameson of the email request (internal alert)
    if (process.env.NOTIFY_EMAIL && process.env.NOTIFY_EMAIL !== toEmail) {
      await resend.emails.send({
        from:    FROM,
        to:      process.env.NOTIFY_EMAIL,
        subject: `📬 Lead email sent to ${toEmail} — ${capped.length} leads`,
        html:    `<p style="font-family:sans-serif;color:#374151;">
          Lead results emailed to <strong>${toEmail}</strong>${toName ? ` (${toName})` : ''}.<br>
          ${capped.length} leads · ICP: ${icp?.slice(0,100) || 'not specified'}
        </p>`,
      }).catch(() => {}); // non-fatal
    }

    return res.status(200).json({ ok: true, sent: capped.length, to: toEmail });
  } catch (err) {
    console.error('[email-leads]', err);
    return res.status(500).json({ error: err.message || 'Failed to send email.' });
  }
}
