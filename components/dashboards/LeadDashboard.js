/**
 * LeadDashboard — AI Lead Researcher (full product)
 *
 * Tier 1 (Clearbit + Hunter): real company data + verified emails
 * Tier 2 (Clearbit + patterns): real company data + generated email patterns
 * Tier 3 (GPT synthesis): always-on fallback
 *
 * Integrations:
 *  - CSV export (any view)
 *  - Google Sheets export (pre-formatted)
 *  - HubSpot CRM push via user's private API key
 *  - Airtable push (base + table key)
 *  - localStorage persistence across sessions
 *  - Full pipeline kanban with status tracking
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ───────────────────────────────────────────────────────────────

const ICP_PRESETS = [
  { label: '🚀 SaaS Founders', value: 'B2B SaaS startup founders, 10–50 employees, Series A or pre-revenue, using HubSpot or Salesforce, struggling with lead conversion' },
  { label: '📣 Marketing Leaders', value: 'VP of Marketing or CMO at mid-market B2B companies, 50–200 employees, tech industry, running paid acquisition' },
  { label: '🛒 E-commerce Owners', value: 'E-commerce store owners doing $1M–$10M revenue on Shopify, looking to scale customer retention and reduce churn' },
  { label: '🏢 Agency Owners', value: 'Digital marketing agency owners, 5–30 employees, serving SMB clients, looking to productise services and reduce churn' },
  { label: '👥 HR Directors', value: 'HR Directors or VP People at companies with 100–500 employees in tech or finance, managing rapid headcount growth' },
  { label: '⚙️ RevOps Leaders', value: 'Revenue Operations Managers or Directors at B2B SaaS companies 50–300 employees using Salesforce, managing complex sales stack' },
  { label: '💰 CFOs / Finance', value: 'CFOs or VP Finance at PE-backed companies 100–500 employees looking to streamline reporting and close faster' },
  { label: '🏥 HealthTech', value: 'CTO or Head of Product at digital health companies, 20–100 employees, raising Series A/B, dealing with HIPAA compliance' },
];

const COMPANY_SIZES = [
  { label: 'Any size', value: '' },
  { label: '1–10 (Startup)', value: '1-10' },
  { label: '11–50 (Small)', value: '11-50' },
  { label: '51–200 (SMB)', value: '51-200' },
  { label: '201–500 (Mid-market)', value: '201-500' },
  { label: '500+ (Enterprise)', value: '500+' },
];

const OUTREACH_STATUSES = ['New', 'Contacted', 'Replied', 'Qualified', 'Meeting Set', 'Not a fit'];
const STATUS_COLORS = {
  'New':         'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'Contacted':   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Replied':     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Qualified':   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Meeting Set': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Not a fit':   'bg-red-500/20 text-red-400 border-red-500/30',
};
const STATUS_ICONS = {
  'New': '🆕', 'Contacted': '📧', 'Replied': '💬',
  'Qualified': '⭐', 'Meeting Set': '📅', 'Not a fit': '❌',
};

const SCORE_STYLE = (s) =>
  s >= 90 ? { badge: 'from-green-500/30 to-emerald-500/20 text-green-300 border-green-500/40', label: 'Excellent', dot: 'bg-green-400' }
  : s >= 82 ? { badge: 'from-blue-500/30 to-cyan-500/20 text-blue-300 border-blue-500/40', label: 'Strong', dot: 'bg-blue-400' }
  : s >= 72 ? { badge: 'from-yellow-500/30 to-amber-500/20 text-yellow-300 border-yellow-500/40', label: 'Good', dot: 'bg-yellow-400' }
  : { badge: 'from-gray-500/30 to-gray-500/20 text-gray-400 border-gray-500/40', label: 'Partial', dot: 'bg-gray-400' };

const STORAGE_KEY   = 'cabinmind_leads_pipeline_v2';
const SETTINGS_KEY  = 'cabinmind_leads_settings';
const STATS_KEY     = 'cabinmind_leads_stats';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCSV(leads) {
  const headers = [
    'Name','Title','Company','Domain','Industry','Company Size','Location',
    'ICP Score','Score Reason','Buying Signal','Pain Points','Budget Range','Why Now',
    'Tech Stack','Email','Email Source','Email Verified','Phone',
    'LinkedIn Search','Company Description','Company Funding','Company LinkedIn',
    'Company Founded','Outreach Status','Notes','Data Source',
  ];
  const rows = leads.map(l => [
    l.name, l.title, l.company, l.domain || '', l.industry || '', l.size || '', l.location || '',
    l.score, l.score_reason || '', l.signal || '', l.pain_points || '', l.budget_range || '', l.why_now || '',
    l.tech || '', l.email || '', l.email_source || '', l.email_verified ? 'Yes' : '',
    l.phone || '', l.linkedin_search || '',
    l.company_description || '', l.company_raised || '', l.company_linkedin || '',
    l.company_founded || '',
    l._status || 'New', l._notes || '', l.data_source || 'ai-synthesised',
  ]);
  return [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function downloadCSV(leads, filename) {
  const blob = new Blob([buildCSV(leads)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function openInSheets(leads) {
  // Build a Google Sheets importdata-compatible CSV data URI
  // Easiest cross-browser approach: download CSV then instruct user,
  // OR open sheets.new with clipboard pre-filled via a data URL trick.
  // We use the direct approach: download the CSV + open sheets.new
  downloadCSV(leads, 'leads-for-sheets');
  setTimeout(() => window.open('https://sheets.new', '_blank'), 400);
}

function pipelineValue(leads) {
  return leads.reduce((sum, l) => {
    const m = (l.budget_range || '').match(/\$([\d,]+)/);
    return sum + (m ? parseInt(m[1].replace(/,/g, '')) : 15000);
  }, 0);
}

function initials(name = '') {
  const parts = name.split(' ').filter(Boolean);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function avatarGradient(score) {
  if (score >= 90) return 'from-green-500 to-emerald-400';
  if (score >= 82) return 'from-blue-500 to-cyan-400';
  if (score >= 72) return 'from-yellow-500 to-amber-400';
  return 'from-gray-500 to-gray-400';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyBtn({ value, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="ml-1 text-gray-600 hover:text-purple-400 transition-colors flex-shrink-0 text-xs"
      title={`Copy ${label || ''}`}
    >
      {done ? '✅' : '📋'}
    </button>
  );
}

function DataSourceBadge({ source }) {
  if (!source) return null;
  const map = {
    'hunter+wikipedia':  { label: '🟢 Verified', cls: 'text-green-400 bg-green-500/10 border-green-500/20', tip: 'Email found via Hunter.io + company description from Wikipedia' },
    'wikipedia+pattern': { label: '🔵 Enriched', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20', tip: 'Company description from Wikipedia, email pattern generated from name + domain' },
    'pattern':           { label: '🟡 Pattern', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', tip: 'Email generated from name + domain pattern' },
    'ai-synthesised':    { label: '🤖 AI Profile', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20', tip: 'AI-generated profile — verify before outreach' },
  };
  const b = map[source] || map['ai-synthesised'];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${b.cls}`} title={b.tip}>
      {b.label}
    </span>
  );
}

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${STATUS_COLORS[status] || STATUS_COLORS['New']}`}>
        {STATUS_ICONS[status]} {status} ▾
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 mt-1 z-30 bg-gray-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[150px]">
            {OUTREACH_STATUSES.map(s => (
              <button key={s} onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
                className={`flex items-center gap-2 w-full text-left px-4 py-2 text-xs hover:bg-white/5 transition-all ${STATUS_COLORS[s]}`}>
                <span>{STATUS_ICONS[s]}</span>{s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmailPatternsPanel({ patterns, email }) {
  const [copied, setCopied] = useState(null);
  const copy = (v, i) => {
    navigator.clipboard.writeText(v);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };
  const allPatterns = patterns?.length ? patterns : email ? [email] : [];
  if (!allPatterns.length) return null;
  return (
    <div className="bg-black/20 border border-white/10 rounded-xl p-3">
      <div className="text-xs text-gray-500 font-medium mb-2">📬 Email patterns to try</div>
      <div className="space-y-1">
        {allPatterns.map((p, i) => (
          <div key={i} className={`flex items-center justify-between text-xs rounded-lg px-2 py-1.5 transition-all ${i === 0 ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/5'}`}>
            <span className={`font-mono ${i === 0 ? 'text-purple-300' : 'text-gray-500'}`}>
              {i === 0 ? '★ ' : ''}{p}
            </span>
            <button onClick={() => copy(p, i)} className="text-gray-600 hover:text-purple-400 ml-2 flex-shrink-0">
              {copied === i ? '✅' : '📋'}
            </button>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600 mt-2">★ = most common pattern for this domain</div>
    </div>
  );
}

function LeadCard({ lead, onSave, saved, onStatusChange, onNoteChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(lead._notes || '');
  const s = SCORE_STYLE(lead.score);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden transition-all group">

      {/* ── Collapsed row ── */}
      <div className="p-4 flex items-start gap-3 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br ${avatarGradient(lead.score)}`}>
          {initials(lead.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{lead.name}</span>
            {lead.location && <span className="text-gray-600 text-xs">📍 {lead.location}</span>}
            <DataSourceBadge source={lead.data_source} />
          </div>
          <div className="text-gray-400 text-xs truncate mt-0.5">{lead.title} · {lead.company}</div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-bold bg-gradient-to-r ${s.badge}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot} mr-1`} />{lead.score} {s.label}
            </span>
            {lead.signal && (
              <span className="text-xs text-amber-300/80 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 truncate max-w-[240px]">
                🔥 {lead.signal}
              </span>
            )}
            {lead.budget_range && (
              <span className="text-xs text-purple-300/70 bg-purple-400/10 border border-purple-400/20 rounded-full px-2 py-0.5">
                💰 {lead.budget_range}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-1">
          <StatusDropdown status={lead._status || 'New'} onChange={(s) => onStatusChange(lead.email, s)} />
          {onRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(lead.email); }}
              className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs">✕</button>
          )}
          <span className="text-gray-700 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5">
            <div className="p-4 space-y-4">

              {/* Score reason */}
              {lead.score_reason && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-xs text-gray-500 font-medium mb-1">🧠 ICP fit reason</div>
                  <div className="text-gray-300 text-xs leading-relaxed">{lead.score_reason}</div>
                </div>
              )}

              {/* Why now */}
              {lead.why_now && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <div className="text-xs text-amber-400 font-medium mb-1">⚡ Why reach out this week</div>
                  <div className="text-amber-200/80 text-xs leading-relaxed">{lead.why_now}</div>
                </div>
              )}

              {/* Company details (Clearbit data) */}
              {(lead.company_description || lead.company_raised || lead.company_founded) && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <div className="text-xs text-blue-400 font-medium mb-1">🏢 Company intelligence</div>
                  {lead.company_description && <div className="text-blue-200/70 text-xs leading-relaxed mb-2">{lead.company_description}</div>}
                  <div className="flex gap-3 flex-wrap text-xs">
                    {lead.company_raised && <span className="text-blue-300/70">💵 {lead.company_raised}</span>}
                    {lead.company_founded && <span className="text-blue-300/70">📅 Founded {lead.company_founded}</span>}
                    {lead.company_linkedin && (
                      <a href={lead.company_linkedin} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="text-blue-400 hover:underline">🔗 LinkedIn</a>
                    )}
                  </div>
                </div>
              )}

              {/* Pain points */}
              {lead.pain_points && (
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1.5">😤 Likely pain points</div>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.pain_points.split(',').map((p, i) => (
                      <span key={i} className="text-xs bg-red-500/10 border border-red-500/20 text-red-300/80 rounded-full px-2.5 py-1">{p.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { label: 'Email', val: lead.email, copy: true, note: lead.email_verified ? '✅ Verified' : lead.email_source === 'hunter' ? '🔵 Hunter' : '🟡 Pattern' },
                  { label: 'Phone', val: lead.phone || 'Upgrade to Pro', copy: !!lead.phone },
                  { label: 'Company size', val: lead.size || '—' },
                  { label: 'Industry', val: lead.industry || '—' },
                  { label: 'Budget range', val: lead.budget_range || '—' },
                  { label: 'Domain', val: lead.domain || '—', copy: !!lead.domain },
                ].map(({ label, val, copy, note: fieldNote }) => (
                  <div key={label} className="bg-black/20 rounded-xl p-2.5">
                    <div className="text-gray-600 mb-0.5 flex items-center gap-1">{label} {fieldNote && <span className="text-gray-700">{fieldNote}</span>}</div>
                    <div className="text-gray-300 flex items-center gap-1 break-all">
                      <span className="truncate">{val}</span>
                      {copy && val && <CopyBtn value={val} label={label} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tech badges */}
              {lead.tech && (
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1.5">🛠️ Tech stack</div>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tech.split(',').map((t, i) => (
                      <span key={i} className="text-xs text-purple-300/70 bg-purple-400/10 border border-purple-400/20 rounded-full px-2.5 py-1">{t.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Email patterns */}
              <EmailPatternsPanel patterns={lead.all_email_patterns} email={lead.email} />

              {/* LinkedIn */}
              {lead.linkedin_search && (
                <a href={`https://www.google.com/search?q=${encodeURIComponent(lead.linkedin_search)}`}
                  target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all w-fit">
                  🔗 Find on LinkedIn
                </a>
              )}

              {/* Notes */}
              <div>
                <label className="text-gray-500 text-xs block mb-1">📝 Notes (saved automatically)</label>
                <textarea value={note}
                  onChange={e => { setNote(e.target.value); onNoteChange(lead.email, e.target.value); }}
                  onClick={e => e.stopPropagation()}
                  rows={2} placeholder="Add context, call notes, next steps…"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/40 resize-none" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {!saved ? (
                  <button onClick={(e) => { e.stopPropagation(); onSave(lead); }}
                    className="flex-1 text-xs py-2 rounded-xl border font-medium transition-all bg-purple-500/20 border-purple-400/30 text-purple-300 hover:bg-purple-500/30">
                    + Save to Pipeline
                  </button>
                ) : (
                  <div className="flex-1 text-xs py-2 rounded-xl border font-medium text-center bg-green-500/20 border-green-500/30 text-green-400">
                    ✓ In Pipeline
                  </div>
                )}
                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`Name: ${lead.name}\nTitle: ${lead.title}\nCompany: ${lead.company}\nEmail: ${lead.email}\nPhone: ${lead.phone || 'N/A'}\nSignal: ${lead.signal}\nBudget: ${lead.budget_range}`); }}
                  className="flex-1 text-xs py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all font-medium">
                  📋 Copy Details
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Integration modal ────────────────────────────────────────────────────────

function IntegrationsModal({ leads, savedLeads, onClose }) {
  const [tab, setTab] = useState('hubspot');
  const [hubspotKey, setHubspotKey] = useState('');
  const [airtableKey, setAirtableKey] = useState('');
  const [airtableBase, setAirtableBase] = useState('');
  const [airtableTable, setAirtableTable] = useState('Leads');
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState('');

  const leadsToExport = savedLeads.length > 0 ? savedLeads : leads;

  const pushToHubspot = async () => {
    if (!hubspotKey || leadsToExport.length === 0) return;
    setPushing(true); setResult('');
    let success = 0, failed = 0;
    for (const lead of leadsToExport) {
      try {
        const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubspotKey}` },
          body: JSON.stringify({
            properties: {
              firstname: lead.name?.split(' ')[0] || '',
              lastname: lead.name?.split(' ').slice(1).join(' ') || '',
              email: lead.email || '',
              phone: lead.phone || '',
              company: lead.company || '',
              jobtitle: lead.title || '',
              city: lead.location || '',
              hs_lead_status: 'NEW',
              message: `ICP Score: ${lead.score} | Signal: ${lead.signal} | Budget: ${lead.budget_range} | Tech: ${lead.tech}`,
            },
          }),
        });
        if (r.ok) success++; else failed++;
      } catch { failed++; }
    }
    setResult(`✅ Pushed ${success} contacts to HubSpot${failed > 0 ? ` (${failed} failed — may already exist)` : ''}`);
    setPushing(false);
  };

  const pushToAirtable = async () => {
    if (!airtableKey || !airtableBase || leadsToExport.length === 0) return;
    setPushing(true); setResult('');
    try {
      const records = leadsToExport.map(lead => ({
        fields: {
          'Name': lead.name || '',
          'Title': lead.title || '',
          'Company': lead.company || '',
          'Email': lead.email || '',
          'Phone': lead.phone || '',
          'Industry': lead.industry || '',
          'Company Size': lead.size || '',
          'Location': lead.location || '',
          'ICP Score': lead.score || 0,
          'Signal': lead.signal || '',
          'Pain Points': lead.pain_points || '',
          'Budget Range': lead.budget_range || '',
          'Tech Stack': lead.tech || '',
          'LinkedIn Search': lead.linkedin_search || '',
          'Status': lead._status || 'New',
          'Notes': lead._notes || '',
          'Data Source': lead.data_source || '',
        },
      }));
      // Airtable max 10 records per request
      const chunks = Array.from({ length: Math.ceil(records.length / 10) }, (_, i) => records.slice(i * 10, i * 10 + 10));
      let success = 0;
      for (const chunk of chunks) {
        const r = await fetch(`https://api.airtable.com/v0/${airtableBase}/${encodeURIComponent(airtableTable)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${airtableKey}` },
          body: JSON.stringify({ records: chunk }),
        });
        if (r.ok) success += chunk.length;
      }
      setResult(`✅ ${success} leads pushed to Airtable table "${airtableTable}"`);
    } catch (e) {
      setResult('❌ Airtable push failed — check your API key and Base ID');
    }
    setPushing(false);
  };

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 font-mono text-xs';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-950 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-lg">🔗 Integrations</h3>
            <p className="text-gray-500 text-xs mt-0.5">{leadsToExport.length} leads ready to export</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl">×</button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5">
          {[
            { id: 'hubspot', label: '🟠 HubSpot' },
            { id: 'airtable', label: '🟣 Airtable' },
            { id: 'sheets', label: '🟢 Sheets' },
            { id: 'csv', label: '📄 CSV' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* HubSpot */}
        {tab === 'hubspot' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-xs leading-relaxed">
              Push leads directly to HubSpot as contacts. Get your private API key from{' '}
              <a href="https://app.hubspot.com/settings/integrations/private-apps" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">HubSpot → Settings → Integrations → Private Apps</a>.
              Required scope: <code className="text-gray-300">crm.objects.contacts.write</code>
            </p>
            <input value={hubspotKey} onChange={e => setHubspotKey(e.target.value)}
              placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className={inputCls} />
            <button onClick={pushToHubspot} disabled={pushing || !hubspotKey}
              className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm disabled:opacity-40 hover:bg-orange-400 transition-all flex items-center justify-center gap-2">
              {pushing ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Pushing…</> : `🟠 Push ${leadsToExport.length} Contacts to HubSpot`}
            </button>
          </div>
        )}

        {/* Airtable */}
        {tab === 'airtable' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-xs leading-relaxed">
              Push leads to any Airtable base. Get your API key from{' '}
              <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">airtable.com/create/tokens</a>{' '}
              and your Base ID from the URL: <code className="text-gray-300">airtable.com/appXXXXXXXXXXXXXX</code>
            </p>
            <input value={airtableKey} onChange={e => setAirtableKey(e.target.value)}
              placeholder="Airtable API key (patXXXXXXXXXXXXXX)" className={inputCls} />
            <input value={airtableBase} onChange={e => setAirtableBase(e.target.value)}
              placeholder="Base ID (appXXXXXXXXXXXXXX)" className={inputCls} />
            <input value={airtableTable} onChange={e => setAirtableTable(e.target.value)}
              placeholder="Table name (default: Leads)" className={inputCls} />
            <button onClick={pushToAirtable} disabled={pushing || !airtableKey || !airtableBase}
              className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm disabled:opacity-40 hover:bg-purple-500 transition-all flex items-center justify-center gap-2">
              {pushing ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Pushing…</> : `🟣 Push ${leadsToExport.length} Records to Airtable`}
            </button>
          </div>
        )}

        {/* Google Sheets */}
        {tab === 'sheets' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-xs leading-relaxed">
              Downloads a pre-formatted CSV and opens <strong className="text-white">sheets.new</strong> in a new tab.
              In Sheets: File → Import → Upload → select the downloaded file.
              All columns are pre-labeled and ready for filtering.
            </p>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-xs text-green-300">
              📋 {leadsToExport.length} leads · 25 columns · pre-formatted for Sheets
            </div>
            <button onClick={() => { openInSheets(leadsToExport); }}
              className="w-full py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-500 transition-all">
              🟢 Download CSV + Open Google Sheets
            </button>
          </div>
        )}

        {/* CSV */}
        {tab === 'csv' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-xs leading-relaxed">
              Download all {leadsToExport.length} leads as a CSV file compatible with any CRM, spreadsheet, or email tool (Instantly, Lemlist, Mailshake, etc.).
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-400 font-mono leading-relaxed">
              Name, Title, Company, Email, Phone, Score, Signal, Pain Points, Budget, Tech Stack, Status, Notes, Data Source…
            </div>
            <button onClick={() => downloadCSV(leadsToExport, 'leads-export')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-sm hover:opacity-90 transition-all">
              ⬇️ Download {leadsToExport.length} Leads as CSV
            </button>
          </div>
        )}

        {result && (
          <div className={`mt-4 text-sm rounded-xl px-4 py-3 ${result.startsWith('✅') ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
            {result}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function LeadDashboard({ session }) {
  // Form state
  const [icp, setIcp] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [excludeCompanies, setExcludeCompanies] = useState('');
  const [batchSize, setBatchSize] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Results state
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [lastSources, setLastSources] = useState(null);

  // Pipeline (localStorage-persisted)
  const [savedLeads, setSavedLeads] = useState([]);
  const [savedEmails, setSavedEmails] = useState(new Set());

  // UI
  const [tab, setTab] = useState('generate');
  const [savedFilter, setSavedFilter] = useState('All');
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [sessionStats, setSessionStats] = useState({ runs: 0, total: 0 });

  // ── Restore from localStorage ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setSavedLeads(saved);
        setSavedEmails(new Set(saved.map(l => l.email)));
      }
      const stats = localStorage.getItem(STATS_KEY);
      if (stats) setSessionStats(JSON.parse(stats));
    } catch {}
  }, []);

  const persistSaved = useCallback((list) => {
    setSavedLeads(list);
    setSavedEmails(new Set(list.map(l => l.email)));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────────
  const generateLeads = async () => {
    if (!icp.trim()) return;
    setLoading(true); setError(''); setLeads([]);
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icp: icp.trim(), count: batchSize,
          industry: industry.trim() || undefined,
          location: location.trim() || undefined,
          companySize: companySize || undefined,
          excludeCompanies: excludeCompanies.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      const enriched = (data.leads || []).map(l => ({ ...l, _status: 'New', _notes: '' }));
      setLeads(enriched);
      setLastSources(data.sources);
      const newStats = { runs: sessionStats.runs + 1, total: sessionStats.total + enriched.length };
      setSessionStats(newStats);
      try { localStorage.setItem(STATS_KEY, JSON.stringify(newStats)); } catch {}
    } catch (e) {
      setError(e.message || 'Lead generation failed. Please try again.');
    }
    setLoading(false);
  };

  // ── Pipeline actions ──────────────────────────────────────────────────────
  const saveLead = (lead) => {
    if (savedEmails.has(lead.email)) return;
    persistSaved([...savedLeads, { ...lead, _status: statuses[lead.email] || 'New', _notes: notes[lead.email] || '' }]);
  };
  const saveAll = () => leads.forEach(saveLead);
  const removeSaved = (email) => persistSaved(savedLeads.filter(l => l.email !== email));

  const updateStatus = (email, status) => {
    setStatuses(s => ({ ...s, [email]: status }));
    setLeads(ls => ls.map(l => l.email === email ? { ...l, _status: status } : l));
    const updated = savedLeads.map(l => l.email === email ? { ...l, _status: status } : l);
    persistSaved(updated);
  };

  const updateNote = (email, note) => {
    setNotes(n => ({ ...n, [email]: note }));
    const updated = savedLeads.map(l => l.email === email ? { ...l, _notes: note } : l);
    persistSaved(updated);
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / leads.length) : 0;
  const pipeline = pipelineValue(leads);
  const totalPipeline = pipelineValue(savedLeads);

  const statusCounts = OUTREACH_STATUSES.reduce((acc, s) => {
    acc[s] = savedLeads.filter(l => (l._status || 'New') === s).length;
    return acc;
  }, {});

  const filteredSaved = savedFilter === 'All' ? savedLeads : savedLeads.filter(l => (l._status || 'New') === savedFilter);

  const tierLabel = lastSources
    ? lastSources.tier === 1 ? '🟢 Tier 1 — Hunter verified emails + Wikipedia company data'
    : lastSources.tier === 2 ? '🔵 Tier 2 — Wikipedia company data + email pattern generation'
    : '🤖 Tier 3 — AI profile synthesis'
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Lifetime stats bar ── */}
      {(sessionStats.total > 0 || savedLeads.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total researched', val: sessionStats.total, icon: '🔎' },
            { label: 'In pipeline', val: savedLeads.length, icon: '💾' },
            { label: 'Avg ICP score', val: avgScore || '—', icon: '⭐' },
            { label: 'Pipeline value', val: totalPipeline > 0 ? `$${(totalPipeline / 1000).toFixed(0)}K` : '—', icon: '💰' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-white font-bold text-xl">{s.val}</div>
              <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
          {[
            { id: 'generate', label: '🔎 Research' },
            { id: 'pipeline', label: `🗂️ Pipeline (${savedLeads.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowIntegrations(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 hover:text-white transition-all">
          🔗 Integrations & Export
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ── Research tab ── */}
        {tab === 'generate' && (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* ICP builder card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-1 gap-3 flex-wrap">
                <div>
                  <h2 className="text-white font-bold text-lg">ICP Research Engine</h2>
                  <p className="text-gray-400 text-sm mt-0.5">
                    Describe your ideal customer. Get fully-profiled prospects with contact data, tech stack, buying signals, and pain points.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  3-tier enrichment active
                </div>
              </div>

              {/* Presets */}
              <div className="mb-4 mt-4">
                <label className="text-gray-500 text-xs block mb-2">Quick start presets</label>
                <div className="flex flex-wrap gap-2">
                  {ICP_PRESETS.map(p => (
                    <button key={p.label} onClick={() => setIcp(p.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${icp === p.value ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-purple-500/20 hover:border-purple-500/30 hover:text-purple-300'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ICP textarea */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs block mb-1.5">Ideal Customer Profile *</label>
                <textarea value={icp} onChange={e => setIcp(e.target.value)} rows={3}
                  placeholder="e.g. B2B SaaS founders, 10–50 employees, Series A or pre-revenue, using HubSpot or Salesforce, struggling with lead conversion and wanting to scale outbound"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none" />
              </div>

              {/* Batch size */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs block mb-1.5">Leads per run</label>
                <div className="flex gap-2">
                  {[5, 10, 15].map(n => (
                    <button key={n} onClick={() => setBatchSize(n)}
                      className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all ${batchSize === n ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced filters */}
              <button onClick={() => setShowAdvanced(s => !s)}
                className="text-xs text-purple-400 hover:text-purple-300 mb-3 flex items-center gap-1 transition-colors">
                {showAdvanced ? '▲ Hide' : '▼ Show'} advanced filters
              </button>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="grid sm:grid-cols-2 gap-3 mb-4 overflow-hidden">
                    <div>
                      <label className="text-gray-400 text-xs block mb-1.5">Industry / vertical</label>
                      <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. FinTech, Healthcare, E-commerce"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1.5">Location / region</label>
                      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. United States, London, APAC"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1.5">Company size</label>
                      <select value={companySize} onChange={e => setCompanySize(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                        {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1.5">Exclude companies</label>
                      <input value={excludeCompanies} onChange={e => setExcludeCompanies(e.target.value)} placeholder="e.g. Google, Salesforce, IBM"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="flex gap-3 flex-wrap items-center">
                <button onClick={generateLeads} disabled={loading || !icp.trim()}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enriching prospects…</>
                    : `🔎 Research ${batchSize} Leads`}
                </button>
                {leads.length > 0 && (
                  <>
                    <button onClick={saveAll} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-all">
                      💾 Save All to Pipeline
                    </button>
                    <button onClick={() => setShowIntegrations(true)} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-all">
                      🔗 Export / Push to CRM
                    </button>
                  </>
                )}
              </div>
              {error && <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
            </div>

            {/* Data source banner */}
            {tierLabel && (
              <div className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <span>{tierLabel}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">
                  {lastSources?.tier === 1 ? 'Real emails found via Hunter.io + company info from Wikipedia (free)'
                   : lastSources?.tier === 2 ? 'Company info from Wikipedia (free) + email patterns generated from name + domain'
                   : 'AI-synthesised profiles — verify contact details before outreach'}
                </span>
              </div>
            )}

            {/* Results */}
            {leads.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">{leads.length} prospects profiled</h3>
                  {avgScore > 0 && (
                    <span className="text-gray-500 text-xs">
                      Avg score <span className="text-white font-bold">{avgScore}</span> ·
                      Est. pipeline <span className="text-white font-bold">${pipeline.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                {leads.map((lead, i) => (
                  <LeadCard
                    key={lead.email + i}
                    lead={{ ...lead, _status: statuses[lead.email] || lead._status || 'New', _notes: notes[lead.email] || '' }}
                    onSave={saveLead}
                    saved={savedEmails.has(lead.email)}
                    onStatusChange={updateStatus}
                    onNoteChange={updateNote}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Pipeline tab ── */}
        {tab === 'pipeline' && (
          <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

            {savedLeads.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
                <div className="text-5xl mb-4">🗂️</div>
                <div className="text-white font-semibold text-base mb-2">Your pipeline is empty</div>
                <div className="text-gray-500 text-sm">Generate leads and click "+ Save to Pipeline" — they persist between sessions.</div>
                <button onClick={() => setTab('generate')} className="mt-6 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-all">
                  Research Leads →
                </button>
              </div>
            ) : (
              <>
                {/* Status summary pills */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {OUTREACH_STATUSES.map(s => (
                    <button key={s} onClick={() => setSavedFilter(savedFilter === s ? 'All' : s)}
                      className={`text-center p-3 rounded-xl border transition-all ${savedFilter === s ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <div className="text-lg">{STATUS_ICONS[s]}</div>
                      <div className={`text-xl font-bold ${savedFilter === s ? 'text-white' : 'text-gray-300'}`}>{statusCounts[s]}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s}</div>
                    </button>
                  ))}
                </div>

                {/* Header + export */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-white font-semibold text-sm flex-1">
                    {savedFilter === 'All' ? `${savedLeads.length} leads in pipeline` : `${filteredSaved.length} leads — ${savedFilter}`}
                  </h3>
                  {savedFilter !== 'All' && (
                    <button onClick={() => setSavedFilter('All')} className="text-xs text-purple-400 hover:text-purple-300">Clear filter ✕</button>
                  )}
                  <button onClick={() => setShowIntegrations(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white text-xs font-bold hover:opacity-90 transition-all">
                    🔗 Export / CRM Push
                  </button>
                </div>

                {/* Pipeline value */}
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-gray-400 text-xs">Total estimated pipeline value:</span>
                  <span className="text-white font-bold">${totalPipeline.toLocaleString()}</span>
                  <span className="text-gray-600 text-xs">(mid-point of each lead's budget range)</span>
                </div>

                {/* Lead cards */}
                {filteredSaved.map((lead, i) => (
                  <LeadCard
                    key={lead.email + i}
                    lead={lead}
                    onSave={() => {}}
                    saved={true}
                    onStatusChange={updateStatus}
                    onNoteChange={updateNote}
                    onRemove={removeSaved}
                  />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Integrations modal ── */}
      {showIntegrations && (
        <IntegrationsModal
          leads={leads}
          savedLeads={savedLeads}
          onClose={() => setShowIntegrations(false)}
        />
      )}
    </div>
  );
}
