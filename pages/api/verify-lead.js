/**
 * /api/verify-lead — Live MX lookup for a domain
 *
 * Returns the mail provider (Google Workspace, Microsoft 365, etc.),
 * raw MX records, and whether the domain can receive email.
 *
 * Used by demo UI to prove leads are real, deliverable contacts.
 */
import dns from 'dns/promises';

// Common MX → provider mappings
const MX_PROVIDERS = [
  { pattern: /google|gmail|googlemail/i,           name: 'Google Workspace',    icon: '🟢' },
  { pattern: /outlook|microsoft|office365|hotmail/i, name: 'Microsoft 365',     icon: '🔵' },
  { pattern: /protonmail|proton\.me/i,             name: 'ProtonMail',          icon: '🟣' },
  { pattern: /zoho/i,                              name: 'Zoho Mail',           icon: '🟠' },
  { pattern: /mimecast/i,                          name: 'Mimecast (enterprise)', icon: '🛡️' },
  { pattern: /barracuda/i,                         name: 'Barracuda',           icon: '🛡️' },
  { pattern: /proofpoint|pphosted/i,               name: 'Proofpoint',          icon: '🛡️' },
  { pattern: /secureserver|godaddy/i,              name: 'GoDaddy Email',       icon: '📧' },
  { pattern: /namecheap|privateemail/i,            name: 'Namecheap Email',     icon: '📧' },
  { pattern: /hover/i,                             name: 'Hover Email',         icon: '📧' },
  { pattern: /icloud|apple/i,                      name: 'iCloud Mail',         icon: '🍎' },
  { pattern: /yahoo|yahoodns/i,                    name: 'Yahoo Mail',          icon: '📧' },
  { pattern: /mailgun/i,                           name: 'Mailgun',             icon: '⚙️' },
  { pattern: /sendgrid/i,                          name: 'SendGrid',            icon: '⚙️' },
  { pattern: /amazonses|amazonaws/i,               name: 'Amazon SES',          icon: '☁️' },
  { pattern: /hostgator/i,                         name: 'HostGator',           icon: '📧' },
  { pattern: /bluehost/i,                          name: 'Bluehost',            icon: '📧' },
  { pattern: /dreamhost/i,                         name: 'DreamHost',           icon: '📧' },
  { pattern: /rackspace/i,                         name: 'Rackspace Email',     icon: '📧' },
  { pattern: /fastmail/i,                          name: 'Fastmail',            icon: '📧' },
];

function identifyProvider(mxRecords) {
  const joined = mxRecords.map(r => r.exchange).join(' ').toLowerCase();
  for (const p of MX_PROVIDERS) {
    if (p.pattern.test(joined)) return { name: p.name, icon: p.icon };
  }
  return { name: 'Custom mail server', icon: '📧' };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { domain } = req.body || {};
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing domain' });
  }

  const clean = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  try {
    const mxRecords = await dns.resolveMx(clean);
    const sorted = (mxRecords || []).sort((a, b) => a.priority - b.priority);
    const provider = identifyProvider(sorted);
    const primaryMx = sorted[0]?.exchange || null;

    // Also check if domain has a website (A record)
    let hasWebsite = false;
    try {
      const aRecords = await dns.resolve4(clean);
      hasWebsite = Array.isArray(aRecords) && aRecords.length > 0;
    } catch { /* no A record */ }

    return res.status(200).json({
      domain: clean,
      canReceiveEmail: true,
      mxRecordCount: sorted.length,
      primaryMx,
      provider: provider.name,
      providerIcon: provider.icon,
      hasWebsite,
      mxRecords: sorted.slice(0, 3).map(r => ({ exchange: r.exchange, priority: r.priority })),
    });
  } catch (err) {
    // No MX records — domain cannot receive email
    return res.status(200).json({
      domain: clean,
      canReceiveEmail: false,
      mxRecordCount: 0,
      primaryMx: null,
      provider: null,
      providerIcon: null,
      hasWebsite: false,
      mxRecords: [],
      error: err.code === 'ENOTFOUND' ? 'Domain does not exist' : 'No MX records found',
    });
  }
}
