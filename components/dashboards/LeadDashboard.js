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

// Batch size options — each API call fetches exactly 5 leads (Groq: ~1-2s, OpenAI fallback: ~10s)
const CHUNK_SIZE = 5;
const BATCH_OPTIONS = [
  { label: '10',  value: 10  },
  { label: '25',  value: 25  },
  { label: '50',  value: 50  },
  { label: '100', value: 100 },
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

// Score style uses grade (A/B/C/D) when available, falls back to raw score
const SCORE_STYLE = (s, grade) => {
  const g = grade || (s >= 90 ? 'A' : s >= 75 ? 'B' : s >= 60 ? 'C' : 'D');
  if (g === 'A') return { badge: 'from-green-500/30 to-emerald-500/20 text-green-300 border-green-500/40', label: 'Hot',  dot: 'bg-green-400',  gradeColor: 'text-green-400' };
  if (g === 'B') return { badge: 'from-blue-500/30 to-cyan-500/20 text-blue-300 border-blue-500/40',     label: 'Warm', dot: 'bg-blue-400',   gradeColor: 'text-blue-400'  };
  if (g === 'C') return { badge: 'from-yellow-500/30 to-amber-500/20 text-yellow-300 border-yellow-500/40', label: 'Cool', dot: 'bg-yellow-400', gradeColor: 'text-yellow-400' };
  return                { badge: 'from-gray-500/30 to-gray-500/20 text-gray-400 border-gray-500/40',       label: 'Cold', dot: 'bg-gray-400',   gradeColor: 'text-gray-400'  };
};

const STORAGE_KEY   = 'cabinmind_leads_pipeline_v2';
const STATS_KEY     = 'cabinmind_leads_stats';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCSV(leads) {
  const headers = [
    'Name','Title','Company','Domain','Industry','Company Size','Location',
    'ICP Score','Score Reason','Buying Signal','Pain Points','Budget Range','Why Now',
    'Tech Stack','Email','Email Source','Email Verified','Phone',
    'LinkedIn','LinkedIn Direct','Company Description','Company Funding','Company LinkedIn',
    'Company Founded','Outreach Status','Notes','Data Source',
  ];
  const rows = leads.map(l => [
    l.name, l.title, l.company, l.domain || '', l.industry || '', l.size || '', l.location || '',
    l.score, l.score_reason || '', l.signal || '', l.pain_points || '', l.budget_range || '', l.why_now || '',
    l.tech || '', l.email || '', l.email_source || '', l.email_verified ? 'Yes' : '',
    l.phone || '', l.linkedin || '',
    l.linkedin_is_direct ? 'Yes' : 'No',
    l.company_description || '', l.company_raised || '', l.company_linkedin || '',
    l.company_founded || '',
    l._status || 'New', l._notes || '', l.data_source || 'ai-pattern',
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

// Instantly.ai-compatible CSV export
// Columns: First Name, Last Name, Email, Company, Website, Phone, Personalization
function buildInstantlyCSV(leads) {
  const headers = ['First Name','Last Name','Email','Company','Website','Phone','Title','ICP Score','Personalization'];
  const rows = leads.map(l => {
    const parts = (l.name || '').trim().split(/\s+/);
    const first = parts[0] || '';
    const last  = parts.slice(1).join(' ') || '';
    // Auto-personalisation line drawn from score signals + pain points
    const signals = (l.score_signals || []).slice(0, 2).map(s => s.replace(/\s*\([^)]*\)/g, '')).join(', ');
    const pain    = l.pain_points ? l.pain_points.slice(0, 80) : '';
    const personalisation = [signals, pain].filter(Boolean).join(' · ').slice(0, 120);
    return [first, last, l.email || '', l.company || '', l.domain ? `https://${l.domain}` : '', l.phone || '', l.title || '', l.score || '', personalisation];
  });
  return [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function downloadInstantlyCSV(leads) {
  const blob = new Blob([buildInstantlyCSV(leads)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `instantly-import-${new Date().toISOString().slice(0, 10)}.csv`;
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
    // ── New Hunter pipeline values ──
    'hunter-verified':   { label: '🟢 Verified', cls: 'text-green-400 bg-green-500/10 border-green-500/20', tip: 'Real verified email from Hunter.io' },
    'hunter':            { label: '🔵 Hunter', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20', tip: 'Real contact found via Hunter.io' },
    'ai-pattern':        { label: '🤖 AI Profile', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20', tip: 'AI-generated profile for real company — verify before outreach' },
    // ── Legacy values (backcompat) ──
    'hunter+gpt':        { label: '🟢 Verified', cls: 'text-green-400 bg-green-500/10 border-green-500/20', tip: 'Real email found via Hunter.io' },
    'hunter+wikipedia':  { label: '🟢 Verified', cls: 'text-green-400 bg-green-500/10 border-green-500/20', tip: 'Real email via Hunter.io + Wikipedia company data' },
    'gpt+pattern':       { label: '🤖 AI Profile', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20', tip: 'AI-generated profile with email pattern — verify before outreach' },
    'wikipedia+pattern': { label: '🔵 Enriched', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20', tip: 'Wikipedia company data + email pattern' },
    'pattern':           { label: '🟡 Pattern', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', tip: 'Email pattern from name + domain' },
    'ai-synthesised':    { label: '🤖 AI Profile', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20', tip: 'AI-generated profile — verify before outreach' },
  };
  const b = map[source] || map['ai-pattern'];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${b.cls}`} title={b.tip}>
      {b.label}
    </span>
  );
}

function DemoUpgradeWall({ onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-br from-purple-900/40 to-violet-900/30 border border-purple-500/30 rounded-2xl p-8 text-center overflow-hidden"
    >
      {/* Background blur blob */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10">
        <div className="text-5xl mb-3">🔒</div>
        <h3 className="text-white font-bold text-xl mb-2">Demo Limited to 5 Leads</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-1 max-w-sm mx-auto">
          You&apos;ve seen the quality. Unlock unlimited generation — up to 100 leads per run,
          full email verification, direct LinkedIn profiles, and CRM export.
        </p>
        <div className="flex flex-wrap justify-center gap-2 my-5 text-sm">
          {['✅ ZeroBounce verified emails','🔗 Direct LinkedIn profiles','📊 Full score breakdown','💾 Pipeline CRM','🔗 HubSpot / Airtable export','♾️ Unlimited batches'].map(f => (
            <span key={f} className="px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-gray-200">{f}</span>
          ))}
        </div>
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-base hover:opacity-90 transition-all shadow-lg shadow-purple-500/30"
        >
          Unlock Full Access — from $49/mo →
        </a>
        {onDismiss && (
          <button onClick={onDismiss} className="block mx-auto mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Keep viewing demo leads
          </button>
        )}
      </div>
    </motion.div>
  );
}

function StatusDropdown({ status, onChange }) {  const [open, setOpen] = useState(false);
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
      <div className="text-xs text-gray-500 font-medium mb-0.5">📬 Email patterns to try manually</div>
      <div className="text-xs text-gray-600 mb-2">These are guesses based on name + domain — copy and verify before sending.</div>
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
      <div className="text-xs text-gray-600 mt-2">★ = most common pattern · unverified — use a tool like NeverBounce before bulk outreach</div>
    </div>
  );
}

function LeadCard({ lead, onSave, saved, onStatusChange, onNoteChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(lead._notes || '');
  const s = SCORE_STYLE(lead.score, lead.grade);
  // Stable identity key — never use email (duplicates possible from AI generation)
  const id = lead._id || `${lead.name}|${lead.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');

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
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot} mr-1`} />
                <span className={`font-black mr-1 ${s.gradeColor}`}>{lead.grade || 'B'}</span>
                {lead.score} · {s.label}
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
          <StatusDropdown status={lead._status || 'New'} onChange={(s) => onStatusChange(id, s)} />
          {onRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(id); }}
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

              {/* Score signals audit trail */}
              {lead.score_signals?.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-xs text-gray-500 font-medium mb-2">
                    📊 Score breakdown — {lead.score} pts · Grade {lead.grade || 'B'} ({s.label})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.score_signals.map((sig, i) => {
                      const isBonus   = sig.includes('(+');
                      const isPenalty = sig.includes('(−') || sig.includes('(-');
                      return (
                        <span key={i} className={`text-xs px-2 py-1 rounded-full border font-medium ${
                          isBonus   ? 'bg-green-500/10 border-green-500/20 text-green-300'
                          : isPenalty ? 'bg-red-500/10 border-red-500/20 text-red-300'
                          : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        }`}>
                          {isBonus ? '↑' : isPenalty ? '↓' : '•'} {sig}
                        </span>
                      );
                    })}
                  </div>
                  {lead.zb_status && (
                    <div className={`mt-2 text-xs font-medium ${
                      lead.zb_status === 'valid'     ? 'text-green-400'
                      : lead.zb_status === 'catch-all' ? 'text-yellow-400'
                      : 'text-gray-500'
                    }`}>
                      🛡️ ZeroBounce: {lead.zb_status}
                      {lead.catch_all && ' (catch-all domain — accepts all mail)'}
                    </div>
                  )}
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
                  { label: 'Email', val: lead.email || null, copy: !!lead.email, note:
                      lead.zb_status === 'valid'                  ? '✅ ZeroBounce verified'
                    : lead.email_verified                          ? '✅ Verified'
                    : lead.zb_status === 'catch-all'              ? '🟡 Catch-all domain'
                    : lead.email_source === 'hunter'               ? '🔵 Hunter'
                    : lead.email_source === 'pattern-verified'     ? '✅ Pattern verified'
                    : lead.email_source === 'pattern'              ? '🟡 Unverified pattern'
                    : lead.email_source === 'pattern-invalid'      ? '❌ Invalid — removed'
                    : null
                  },
                  { label: 'Phone', val: lead.phone || 'Upgrade to Pro', copy: !!lead.phone },
                  { label: 'Company size', val: lead.size || '—' },
                  { label: 'Industry', val: lead.industry || '—' },
                  { label: 'Budget range', val: lead.budget_range || '—' },
                  { label: 'Domain', val: lead.domain || '—', copy: !!lead.domain },
                ].map(({ label, val, copy, note: fieldNote }) => (
                  <div key={label} className="bg-black/20 rounded-xl p-2.5">
                    <div className="text-gray-600 mb-0.5 flex items-center gap-1 flex-wrap">
                      {label}
                      {fieldNote && (
                        <span className={`text-xs font-medium ml-1 ${
                          fieldNote.startsWith('✅') ? 'text-green-500'
                          : fieldNote.startsWith('🟡') ? 'text-yellow-500'
                          : fieldNote.startsWith('❌') ? 'text-red-500'
                          : 'text-gray-500'
                        }`}>{fieldNote}</span>
                      )}
                    </div>
                    <div className="text-gray-300 flex items-center gap-1 break-all">
                      {val ? (
                        <>
                          <span className="truncate">{val}</span>
                          {copy && <CopyBtn value={val} label={label} />}
                        </>
                      ) : (
                        <span className="text-gray-600 italic">
                          {label === 'Email' ? 'Not verified — see patterns below' : '—'}
                        </span>
                      )}
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

              {/* Research links — LinkedIn direct URL (Hunter) or LinkedIn People Search fallback */}
              {(lead.name || lead.company) && (() => {
                const firstName = (lead.name || '').split(' ')[0];

                // Hunter gave us a direct /in/ URL → open the real profile straight away.
                // Fallback: LinkedIn's own People Search (name + company) — works without login,
                // no Google middleman, surfaces the actual person if they have a profile.
                const personLinkedIn = lead.linkedin && lead.linkedin_is_direct
                  ? lead.linkedin
                  : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${lead.name} ${lead.company}`)}&origin=GLOBAL_SEARCH_HEADER`;

                // Company LinkedIn page — search LinkedIn company pages directly
                const companyLinkedIn = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(lead.company)}&origin=GLOBAL_SEARCH_HEADER`;

                // Company website fallback
                const companyWeb = lead.domain
                  ? `https://${lead.domain}`
                  : `https://www.google.com/search?q=${encodeURIComponent(`${lead.company} ${lead.industry || ''} official site`.trim())}`;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">🔍 Research this prospect</span>
                      {lead.linkedin_is_direct && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
                          ✅ Direct LinkedIn URL
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <a href={personLinkedIn}
                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border transition-all font-medium ${
                          lead.linkedin_is_direct
                            ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30'
                            : 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30'
                        }`}>
                        {lead.linkedin_is_direct ? '✅' : '🔗'} {lead.linkedin_is_direct ? `${firstName}'s Profile` : `Search ${firstName} on LinkedIn`}
                      </a>
                      <a href={companyLinkedIn}
                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 hover:bg-blue-600/20 transition-all font-medium">
                        🏢 Company Page
                      </a>
                      <a href={companyWeb}
                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-all font-medium">
                        🌐 {lead.domain || 'Company Web'}
                      </a>
                    </div>
                    <p className="text-xs text-gray-600">
                      {lead.linkedin_is_direct
                        ? 'Verified LinkedIn profile from Hunter.io — opens the real person\'s page.'
                        : `LinkedIn People Search for "${lead.name}" at ${lead.company} — results are from LinkedIn directly.`}
                    </p>
                  </div>
                );
              })()}

              {/* Notes */}
              <div>
                <label className="text-gray-500 text-xs block mb-1">📝 Notes (saved automatically)</label>
                <textarea value={note}
                  onChange={e => { setNote(e.target.value); onNoteChange(id, e.target.value); }}
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
          'LinkedIn': lead.linkedin || '',
          'LinkedIn Direct': lead.linkedin_is_direct ? 'Yes' : 'No',
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

// ─── Campaign Tab ─────────────────────────────────────────────────────────────
// ZeroBounce list validation + AI sequence generation + Instantly.ai export

function CampaignTab({ leads, savedLeads, zeroBounceApiKey: zbKeyProp, isPaid }) {
  const leadsPool = savedLeads.length > 0 ? savedLeads : leads;

  // Validation state
  const [validating, setValidating]     = useState(false);
  const [validateResult, setValidateResult] = useState(null); // { valid, warnings, rejected, stats }
  const [validateError, setValidateError]   = useState('');
  const [zbKey, setZbKey]               = useState(zbKeyProp || '');

  // Sequence generation state
  const [genLead, setGenLead]           = useState(null);   // lead being sequenced
  const [generating, setGenerating]     = useState(false);
  const [sequence, setSequence]         = useState(null);   // [{step,subject,body,day,label}]
  const [genError, setGenError]         = useState('');
  const [activeStep, setActiveStep]     = useState(0);
  const [senderName, setSenderName]     = useState('');
  const [senderCompany, setSenderCompany] = useState('');
  const [productDesc, setProductDesc]   = useState('');
  const [copiedField, setCopiedField]   = useState(null);

  // Which sub-tab
  const [campaignTab, setCampaignTab]   = useState('validate'); // 'validate' | 'sequence' | 'export'

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50';

  // ── ZeroBounce validation ────────────────────────────────────────────────
  const runValidation = async () => {
    if (!leadsPool.length) return;
    const key = zbKey || zbKeyProp;
    setValidating(true);
    setValidateError('');
    setValidateResult(null);
    try {
      const r = await fetch('/api/validate-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsPool, zeroBounceApiKey: key || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setValidateError(d.error || 'Validation failed'); return; }
      setValidateResult(d);
    } catch (e) { setValidateError(e.message); }
    finally { setValidating(false); }
  };

  // ── AI sequence generation ───────────────────────────────────────────────
  const generateSequence = async (lead) => {
    setGenLead(lead);
    setGenerating(true);
    setGenError('');
    setSequence(null);
    setActiveStep(0);
    setCampaignTab('sequence');
    try {
      const r = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, senderName, senderCompany, productDesc }),
      });
      const d = await r.json();
      if (!r.ok) { setGenError(d.error || 'Generation failed'); return; }
      setSequence(d.sequence);
    } catch (e) { setGenError(e.message); }
    finally { setGenerating(false); }
  };

  const copyField = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const exportList = (list, name) => {
    const blob = new Blob([buildInstantlyCSV(list)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <motion.div key="campaign" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

      {/* Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-white font-bold text-lg">📣 Campaign Builder</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              Validate emails with ZeroBounce → generate AI sequences → export to Instantly.ai
            </p>
          </div>
          <div className="text-xs text-gray-500 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            {leadsPool.length} leads in pool ({savedLeads.length > 0 ? 'pipeline' : 'current results'})
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {[
            { id: 'validate', label: '🛡️ Validate Emails' },
            { id: 'sequence', label: '✉️ AI Sequences'    },
            { id: 'export',   label: '🚀 Export'          },
          ].map(t => (
            <button key={t.id} onClick={() => setCampaignTab(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${campaignTab === t.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Validate tab ── */}
      {campaignTab === 'validate' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-1">ZeroBounce Email Validation</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Runs every email in your lead pool through ZeroBounce before sending.
              Removes spam traps, hard bounces, and disposables — protecting your sender reputation.
            </p>
          </div>

          {/* Key input — only show if no key saved */}
          {!zbKeyProp && (
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">
                ZeroBounce API key <span className="text-gray-600">(or add it under API Keys tab)</span>
              </label>
              <input value={zbKey} onChange={e => setZbKey(e.target.value)}
                placeholder="your ZeroBounce API key" className={inputCls} />
              <p className="text-gray-600 text-xs mt-1">
                Free: 100 credits/mo · $16 = 2,000 · $25/mo = 5,000 ·{' '}
                <a href="https://www.zerobounce.net/members/dashboard" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">zerobounce.net →</a>
              </p>
            </div>
          )}

          <button onClick={runValidation} disabled={validating || leadsPool.length === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {validating
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Validating {leadsPool.length} emails…</>
              : `🛡️ Validate ${leadsPool.length} Emails with ZeroBounce`}
          </button>

          {validateError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">{validateError}</div>
          )}

          {validateResult && (
            <div className="space-y-3">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '✅ Valid', val: validateResult.stats.valid,    cls: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                  { label: '⚠️ Catch-all', val: validateResult.stats.warnings, cls: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                  { label: '❌ Rejected', val: validateResult.stats.rejected, cls: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
                ].map(s => (
                  <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                    <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {validateResult.stats.credits_remaining !== null && (
                <p className="text-gray-600 text-xs text-right">
                  ZeroBounce credits remaining: {validateResult.stats.credits_remaining}
                </p>
              )}

              {/* Deliverability score */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs">List deliverability</span>
                  <span className="text-white font-bold">
                    {Math.round(((validateResult.stats.valid + validateResult.stats.warnings) / validateResult.stats.total) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                    style={{ width: `${Math.round((validateResult.stats.valid / validateResult.stats.total) * 100)}%` }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  {validateResult.stats.rejected} emails removed — safe to send to the remaining {validateResult.stats.valid + validateResult.stats.warnings}
                </p>
              </div>

              {/* Rejected list */}
              {validateResult.rejected.length > 0 && (
                <details className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                  <summary className="text-red-400 text-xs font-medium cursor-pointer">
                    ❌ {validateResult.rejected.length} rejected emails (click to expand)
                  </summary>
                  <div className="mt-3 space-y-1.5">
                    {validateResult.rejected.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">{l.email}</span>
                        <span className="text-red-400 font-mono">{l._vz_reason}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Generate sequences from valid leads */}
              <div className="pt-2 border-t border-white/10">
                <p className="text-gray-400 text-xs mb-3">
                  Ready to write sequences for your {validateResult.valid.length} clean leads?
                </p>
                <button onClick={() => setCampaignTab('sequence')}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/10 transition-all">
                  ✉️ Write AI Sequences →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sequence tab ── */}
      {campaignTab === 'sequence' && (
        <div className="space-y-4">
          {/* Sender info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Your sender details</h3>
            <p className="text-gray-400 text-xs">Used to personalise every email — appears as the "from" voice.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Your name</label>
                <input value={senderName} onChange={e => setSenderName(e.target.value)}
                  placeholder="e.g. Jameson" className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1.5">Your company</label>
                <input value={senderCompany} onChange={e => setSenderCompany(e.target.value)}
                  placeholder="e.g. Dev Cabin Technologies" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">What you're offering (1–2 sentences)</label>
              <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} rows={2}
                placeholder="e.g. AI agents that automate lead research, website audits, and customer chat — saving sales teams 10+ hours a week"
                className={inputCls + ' resize-none'} />
            </div>
          </div>

          {/* Lead picker — valid leads from validation, or full pool */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-white font-semibold">Pick a lead to sequence</h3>
            <p className="text-gray-400 text-xs">
              Select any lead — the AI writes a 4-step sequence personalised from their pain points, buying signals, and ICP match.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(validateResult?.valid ?? leadsPool).filter(l => l.email).map((lead, i) => {
                const isSelected = genLead?.name === lead.name && genLead?.company === lead.company;
                const style = SCORE_STYLE(lead.score || 0, lead.grade);
                return (
                  <div key={i}
                    onClick={() => generateSequence(lead)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(lead.score || 0)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {lead.grade || 'B'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{lead.name}</div>
                      <div className="text-gray-400 text-xs truncate">{lead.title} · {lead.company}</div>
                    </div>
                    <div className="text-gray-500 text-xs flex-shrink-0">{lead.email?.slice(0,20)}…</div>
                    {isSelected && generating && (
                      <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                  </div>
                );
              })}
              {(validateResult?.valid ?? leadsPool).filter(l => l.email).length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No leads with emails available. Run validation first or generate leads.</p>
              )}
            </div>
          </div>

          {genError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">{genError}</div>
          )}

          {/* Generated sequence */}
          {sequence && genLead && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">4-Step Sequence — {genLead.name}</h3>
                  <p className="text-gray-500 text-xs">{genLead.title} · {genLead.company}</p>
                </div>
                <button
                  onClick={() => {
                    const text = sequence.map(s => `--- ${s.label} ---\nSubject: ${s.subject}\n\n${s.body}`).join('\n\n');
                    navigator.clipboard.writeText(text);
                    setCopiedField('all');
                    setTimeout(() => setCopiedField(null), 1500);
                  }}
                  className="text-xs text-gray-400 hover:text-purple-400 transition-colors px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                  {copiedField === 'all' ? '✅ Copied' : '📋 Copy all'}
                </button>
              </div>

              {/* Step selector */}
              <div className="flex gap-1.5 flex-wrap">
                {sequence.map((s, i) => (
                  <button key={i} onClick={() => setActiveStep(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeStep === i ? 'bg-purple-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Active step */}
              {sequence[activeStep] && (
                <div className="space-y-3">
                  <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Subject line</label>
                      <button onClick={() => copyField(sequence[activeStep].subject, 'subj')}
                        className="text-xs text-gray-500 hover:text-purple-400 transition-colors">
                        {copiedField === 'subj' ? '✅' : '📋'}
                      </button>
                    </div>
                    <p className="text-white font-semibold">{sequence[activeStep].subject}</p>
                  </div>
                  <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Email body</label>
                      <button onClick={() => copyField(sequence[activeStep].body, 'body')}
                        className="text-xs text-gray-500 hover:text-purple-400 transition-colors">
                        {copiedField === 'body' ? '✅' : '📋'}
                      </button>
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{sequence[activeStep].body}</p>
                  </div>
                  <p className="text-gray-600 text-xs">
                    💡 Replace <code className="text-purple-400">{'{{FIRST_NAME}}'}</code> with {genLead.name.split(' ')[0]} before sending.
                  </p>
                </div>
              )}

              <button onClick={() => setCampaignTab('export')}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/10 transition-all">
                🚀 Export to Instantly.ai →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Export tab ── */}
      {campaignTab === 'export' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-1">🚀 Export to Instantly.ai</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Download a pre-formatted CSV ready to import directly into Instantly.ai campaigns.
              Includes First Name, Last Name, Email, Company, Website, Title, ICP Score, and a personalisation line.
            </p>
          </div>

          {/* Instantly setup guide */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-2">
            <p className="text-blue-300 text-xs font-semibold">📋 Instantly.ai import steps</p>
            {[
              'Download the CSV below',
              'Go to Instantly.ai → Campaigns → New Campaign',
              'Add Leads → Import CSV → map columns (First Name, Last Name, Email, Company, Personalization)',
              'Paste your email sequences from the AI Sequences tab into each step',
              'Enable sending warmup and launch 🚀',
            ].map((step, i) => (
              <div key={i} className="flex gap-2 text-xs text-gray-400">
                <span className="text-blue-400 font-bold flex-shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
            <a href="https://instantly.ai" target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-blue-400 hover:underline">
              Sign up at instantly.ai ($37/mo) →
            </a>
          </div>

          {/* Export buttons */}
          <div className="space-y-3">
            {validateResult && (
              <button onClick={() => exportList(validateResult.valid, 'instantly-validated')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-sm hover:opacity-90 transition-all">
                ✅ Download {validateResult.valid.length} ZeroBounce-Validated Leads (Recommended)
              </button>
            )}
            <button onClick={() => exportList(leadsPool, 'instantly-all-leads')}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${validateResult ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10' : 'bg-gradient-to-r from-purple-600 to-violet-500 text-white hover:opacity-90'}`}>
              ⬇️ Download All {leadsPool.length} Leads (Instantly CSV)
            </button>
          </div>

          {/* Domain warning */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-amber-300 text-xs font-semibold mb-1">⚠️ Use a separate sending domain</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Never send cold email from your main domain (e.g. devcabin.tech).
              Register a variant like <code className="text-amber-300">trycabinmind.com</code> or <code className="text-amber-300">devcabin.io</code>,
              warm it up for 2–3 weeks in Instantly.ai, then launch campaigns.
              This protects your transactional email deliverability.
            </p>
          </div>

          {/* Warmup timeline */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-gray-300 text-xs font-semibold mb-3">📅 Recommended warmup timeline</p>
            <div className="space-y-2">
              {[
                { week: 'Week 1–2', vol: '10–20/day', note: 'Auto-warmup only — no campaigns yet' },
                { week: 'Week 3–4', vol: '30–50/day', note: 'Start with your highest-grade A leads' },
                { week: 'Week 5+',  vol: '100+/day',  note: 'Full campaign volume, B/C leads included' },
              ].map((w, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-purple-400 font-medium w-20 flex-shrink-0">{w.week}</span>
                  <span className="text-white font-bold w-20 flex-shrink-0">{w.vol}</span>
                  <span className="text-gray-500">{w.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function LeadDashboard({ session, isPaid = false, initialPlan = 'starter' }) {
  // ── BYOK API keys (Pro / Scale / Agency plans) ─────────────────────────────
  const BYOK_KEY = 'cabinmind_byok_keys';
  const [hunterApiKey, setHunterApiKey]         = useState('');
  const [zeroBounceApiKey, setZeroBounceApiKey] = useState('');
  const [byokSaved, setByokSaved]               = useState(false);
  const [plan, setPlan]                         = useState(initialPlan);

  // Restore BYOK keys from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BYOK_KEY);
      if (raw) {
        const k = JSON.parse(raw);
        if (k.hunterApiKey)     setHunterApiKey(k.hunterApiKey);
        if (k.zeroBounceApiKey) setZeroBounceApiKey(k.zeroBounceApiKey);
        // Only restore stored plan if it was explicitly set by the user;
        // otherwise keep initialPlan passed from the dashboard (more reliable)
        if (k.plan && k.planSetByUser) setPlan(k.plan);
      }
    } catch {}
  }, []);

  const saveByokKeys = () => {
    try {
      localStorage.setItem(BYOK_KEY, JSON.stringify({ hunterApiKey, zeroBounceApiKey, plan, planSetByUser: true }));
    } catch {}
    setByokSaved(true);
    setTimeout(() => setByokSaved(false), 2500);
  };
  // Form state
  const [icp, setIcp] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [excludeCompanies, setExcludeCompanies] = useState('');
  const [batchSize, setBatchSize] = useState(isPaid ? 25 : 5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Results state
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [lastSources, setLastSources] = useState(null);

  // Batch progress state
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, active: false, provider: null, msPerBatch: null });
  const abortRef = useRef(false);

  // Pipeline (localStorage-persisted)
  // savedIds = Set of _id slugs (name|company), NOT emails — emails can collide across leads
  const [savedLeads, setSavedLeads] = useState([]);
  const [savedIds, setSavedEmails] = useState(new Set()); // alias kept as setSavedEmails internally

  // UI
  const [tab, setTab] = useState('generate');
  const [savedFilter, setSavedFilter] = useState('All');
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showUpgradeWall, setShowUpgradeWall] = useState(true);
  const [sessionStats, setSessionStats] = useState({ runs: 0, total: 0 });

  // ── Restore from localStorage ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Backfill _id for any leads saved before this version
        const hydrated = saved.map(l => ({
          ...l,
          _id: l._id || `${l.name}|${l.company}`.toLowerCase().replace(/[^a-z0-9|]/g, ''),
        }));
        setSavedLeads(hydrated);
        setSavedEmails(new Set(hydrated.map(l => l._id)));
      }
      const stats = localStorage.getItem(STATS_KEY);
      if (stats) setSessionStats(JSON.parse(stats));
    } catch {}
  }, []);

  const persistSaved = useCallback((list) => {
    setSavedLeads(list);
    setSavedEmails(new Set(list.map(l => l._id || `${l.name}|${l.company}`.toLowerCase().replace(/[^a-z0-9|]/g, ''))));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  }, []);

  // ── Chunked batch engine ──────────────────────────────────────────────────
  // Each chunk = 1 API call → 5 leads.
  // With Groq: ~1-2s/chunk → 100 leads in ~20-40s, appearing live as they arrive.
  // Fallback OpenAI: ~10s/chunk → 100 leads in ~3-4 min.
  const generateLeads = async () => {
    if (!icp.trim()) return;
    abortRef.current = false;
    setLoading(true);
    setError('');
    setLeads([]);
    setLastSources(null);
    setShowUpgradeWall(true); // reset so wall shows again on next demo run

    const chunks = Math.ceil(batchSize / CHUNK_SIZE);
    setBatchProgress({ done: 0, total: chunks, active: true, provider: null, msPerBatch: null });

    const payload = {
      icp: icp.trim(),
      industry: industry.trim() || undefined,
      location: location.trim() || undefined,
      companySize: companySize || undefined,
      excludeCompanies: excludeCompanies.trim() || undefined,
    };

    let allLeads = [];
    let chunkErrors = 0;
    let totalMs = 0;
    let detectedProvider = null;

    for (let i = 0; i < chunks; i++) {
      if (abortRef.current) break;
      const t0 = Date.now();
      try {
        const r = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            batchNum: i + 1,
            isDemo: !isPaid,
            plan,
            hunterApiKey:     hunterApiKey     || undefined,
            zeroBounceApiKey: zeroBounceApiKey || undefined,
          }),
        });
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Server timeout — will retry next batch');
        const data = await r.json();
        if (data.error) throw new Error(data.error);

        const elapsed = Date.now() - t0;
        totalMs += elapsed;
        if (data.provider) detectedProvider = data.provider;

        const chunk = (data.leads || []).map(l => ({
          ...l,
          _id: `${l.name}|${l.company}`.toLowerCase().replace(/[^a-z0-9|]/g, ''),
          _status: 'New',
          _notes: '',
        }));
        allLeads = [...allLeads, ...chunk];
        setLeads([...allLeads]);
        setLastSources(data.sources);
        setBatchProgress({
          done: i + 1,
          total: chunks,
          active: i + 1 < chunks && !abortRef.current,
          provider: detectedProvider,
          msPerBatch: Math.round(totalMs / (i + 1)),
        });
        chunkErrors = 0; // reset on success
      } catch (e) {
        chunkErrors++;
        setBatchProgress(p => ({ ...p, done: i + 1, active: i + 1 < chunks }));
        if (chunkErrors >= 3) {
          setError(`Stopped after ${allLeads.length} leads — too many errors: ${e.message}`);
          break;
        }
        // Brief pause before retrying next chunk
        await new Promise(res => setTimeout(res, 1000));
      }
    }

    if (allLeads.length > 0) {
      const newStats = { runs: sessionStats.runs + 1, total: sessionStats.total + allLeads.length };
      setSessionStats(newStats);
      try { localStorage.setItem(STATS_KEY, JSON.stringify(newStats)); } catch {}
    } else if (!error) {
      setError('No leads generated. Please refine your ICP description and try again.');
    }

    setBatchProgress(p => ({ ...p, active: false }));
    setLoading(false);
  };

  const stopGeneration = () => {
    abortRef.current = true;
    setLoading(false);
    setBatchProgress(p => ({ ...p, active: false }));
  };

  // ── Pipeline actions ──────────────────────────────────────────────────────
  // All identity operations use lead._id (name|company slug) stamped by the API.
  // The fallback recomputes it client-side for old localStorage records only.
  const leadId = (lead) =>
    lead._id || `${lead.name}|${lead.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');

  const saveLead = (lead) => {
    const id = leadId(lead);
    setSavedLeads(prev => {
      const existingIds = new Set(prev.map(leadId));
      if (existingIds.has(id)) return prev;
      const next = [...prev, { ...lead, _id: id, _status: statuses[id] || 'New', _notes: notes[id] || '' }];
      setSavedEmails(new Set(next.map(l => leadId(l))));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // saveAll: build the full merged list in one pass — avoids stale closure bug
  // where forEach + saveLead each see the same old savedLeads snapshot
  const saveAll = () => {
    setSavedLeads(prev => {
      const existingIds = new Set(prev.map(leadId));
      const newLeads = leads
        .filter(l => !existingIds.has(leadId(l)))
        .map(l => {
          const id = leadId(l);
          return { ...l, _id: id, _status: statuses[id] || 'New', _notes: notes[id] || '' };
        });
      if (!newLeads.length) return prev;
      const next = [...prev, ...newLeads];
      setSavedEmails(new Set(next.map(l => leadId(l))));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const removeSaved = (id) => persistSaved(savedLeads.filter(l => leadId(l) !== id));

  const updateStatus = (id, status) => {
    setStatuses(s => ({ ...s, [id]: status }));
    setLeads(ls => ls.map(l => leadId(l) === id ? { ...l, _status: status } : l));
    const updated = savedLeads.map(l => leadId(l) === id ? { ...l, _status: status } : l);
    persistSaved(updated);
  };

  const updateNote = (id, note) => {
    setNotes(n => ({ ...n, [id]: note }));
    const updated = savedLeads.map(l => leadId(l) === id ? { ...l, _notes: note } : l);
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
    ? lastSources.hunterUsed && lastSources.realLeads > 0
      ? [
          `🟢 Hunter.io — ${lastSources.realLeads} real contacts`,
          lastSources.zeroBounceVerified > 0 ? `${lastSources.zeroBounceVerified} ZeroBounce verified` : '',
          `${lastSources.verifiedEmails} verified emails`,
          `${lastSources.directLinkedIn} direct LinkedIn URLs`,
        ].filter(Boolean).join(' · ')
      : lastSources.hunterQuotaExceeded
      ? '🟡 Hunter quota reached — AI profiles for real companies'
      : `🤖 AI profile synthesis${lastSources.patternVerified > 0 ? ` · ${lastSources.patternVerified} pattern emails verified` : ''}`
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
            { id: 'generate',  label: '🔎 Research' },
            { id: 'pipeline',  label: `🗂️ Pipeline (${savedLeads.length})` },
            { id: 'campaign',  label: '📣 Campaign' },
            ...(isPaid ? [{ id: 'settings', label: '🔑 API Keys' }] : []),
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

              {/* Batch size — demo users capped at 5 leads */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs block mb-1.5">
                  Total leads to generate
                  {!isPaid && <span className="ml-2 text-purple-400 font-medium">— Demo: 5 leads free · <a href="/#pricing" className="underline hover:text-purple-300">Upgrade for 100+</a></span>}
                  {isPaid && <span className="text-gray-600 ml-2">
                    — streamed live · {batchProgress.provider === 'groq' ? '⚡ Groq (~1-2s/batch)' : batchProgress.provider ? '🔄 OpenAI (~10s/batch)' : '⚡ Groq + OpenAI fallback'}
                  </span>}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(isPaid ? BATCH_OPTIONS : [{ label: '5 (Demo)', value: 5 }]).map(({ label, value }) => (
                    <button key={value} onClick={() => isPaid && setBatchSize(value)}
                      className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all ${
                        (!isPaid || batchSize === value)
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}>
                      {label}
                    </button>
                  ))}
                  {!isPaid && (
                    <a href="/#pricing" className="px-5 py-2 rounded-xl text-sm font-medium border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all">
                      🔓 Unlock 10 / 25 / 50 / 100
                    </a>
                  )}
                </div>
                {isPaid && (
                  <p className="text-gray-600 text-xs mt-1.5">
                    ⚡ With Groq: {batchSize} leads in ~{Math.ceil(batchSize / CHUNK_SIZE) * 2}–{Math.ceil(batchSize / CHUNK_SIZE) * 3}s · results appear as each batch of {CHUNK_SIZE} completes
                  </p>
                )}
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
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
                    : `🔎 Research ${batchSize} Leads`}
                </button>
                {loading && (
                  <button onClick={stopGeneration}
                    className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-all">
                    ⏹ Stop
                  </button>
                )}
                {leads.length > 0 && !loading && (
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

              {/* Live batch progress bar */}
              {loading && batchProgress.total > 0 && (
                <div className="mt-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="text-xs text-white font-medium">
                        Batch {Math.min(batchProgress.done + 1, batchProgress.total)} of {batchProgress.total}
                      </span>
                      <span className="text-xs text-gray-500">· {leads.length} leads found</span>
                      {batchProgress.provider && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          batchProgress.provider === 'groq'
                            ? 'text-green-400 bg-green-500/10 border-green-500/20'
                            : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        }`}>
                          {batchProgress.provider === 'groq' ? '⚡ Groq' : '🔄 OpenAI'}
                          {batchProgress.msPerBatch ? ` · ${(batchProgress.msPerBatch / 1000).toFixed(1)}s/batch` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-purple-400 font-bold text-sm">
                      {Math.round((batchProgress.done / batchProgress.total) * 100)}%
                    </span>
                  </div>

                  {/* Main progress bar */}
                  <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 via-violet-500 to-fuchsia-500"
                      animate={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    {/* Shimmer effect while active */}
                    {batchProgress.active && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                  </div>

                  {/* Batch segment dots */}
                  <div className="flex gap-1">
                    {Array.from({ length: batchProgress.total }).map((_, i) => (
                      <motion.div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                          i < batchProgress.done
                            ? 'bg-purple-400'
                            : i === batchProgress.done
                            ? 'bg-purple-400/50 animate-pulse'
                            : 'bg-white/10'
                        }`}
                        initial={{ scaleY: 0.5 }}
                        animate={{ scaleY: i < batchProgress.done ? 1 : 0.5 }}
                      />
                    ))}
                  </div>

                  {/* ETA estimate */}
                  {batchProgress.msPerBatch && batchProgress.done > 0 && (
                    <div className="text-xs text-gray-500 text-right">
                      {(() => {
                        const remaining = batchProgress.total - batchProgress.done;
                        const etaMs = remaining * batchProgress.msPerBatch;
                        return etaMs < 60000
                          ? `~${Math.ceil(etaMs / 1000)}s remaining`
                          : `~${Math.ceil(etaMs / 60000)}m remaining`;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
            </div>

            {/* Data source banner */}
            {tierLabel && (
              <div className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <span>{tierLabel}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">
                  {lastSources?.hunterUsed && lastSources?.realLeads > 0
                    ? `${lastSources.verifiedEmails > 0 ? 'Verified emails ready for outreach.' : 'Emails sourced from Hunter.io.'} Direct LinkedIn links open real profiles. Invalid emails automatically dropped.`
                    : lastSources?.hunterQuotaExceeded
                    ? 'Hunter monthly quota reached — upgrade to Hunter Starter for 500 searches/mo.'
                    : `AI-synthesised profiles for real companies.${lastSources?.patternVerified > 0 ? ` ${lastSources.patternVerified} pattern emails passed Hunter verification.` : ' Invalid pattern emails removed automatically.'}`}
                </span>
              </div>
            )}

            {/* Results */}
            {leads.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">
                    {leads.length} {loading ? 'and counting…' : 'prospects profiled'}
                    {loading && <span className="ml-2 inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin align-middle" />}
                  </h3>
                  {avgScore > 0 && (
                    <span className="text-gray-500 text-xs">
                      Avg score <span className="text-white font-bold">{avgScore}</span> ·
                      Est. pipeline <span className="text-white font-bold">${pipeline.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                {leads.map((lead, i) => {
                  const lid = lead._id || `${lead.name}|${lead.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
                  return (
                    <LeadCard
                      key={`${lid}-${i}`}
                      lead={{ ...lead, _id: lid, _status: statuses[lid] || lead._status || 'New', _notes: notes[lid] || '' }}
                      onSave={saveLead}
                      saved={savedIds.has(lid)}
                      onStatusChange={updateStatus}
                      onNoteChange={updateNote}
                    />
                  );
                })}
                {/* Demo upgrade wall — shown after 5 leads for unpaid users */}
                {!isPaid && leads.length >= 5 && !loading && showUpgradeWall && (
                  <DemoUpgradeWall onDismiss={() => setShowUpgradeWall(false)} />
                )}
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
                {filteredSaved.map((lead, i) => {
                  const lid = lead._id || `${lead.name}|${lead.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
                  return (
                    <LeadCard
                      key={`${lid}-${i}`}
                      lead={{ ...lead, _id: lid }}
                      onSave={() => {}}
                      saved={true}
                      onStatusChange={updateStatus}
                      onNoteChange={updateNote}
                      onRemove={removeSaved}
                    />
                  );
                })}
              </>
            )}
          </motion.div>
        )}

        {/* ── Campaign tab ── */}
        {tab === 'campaign' && (
          <CampaignTab
            leads={leads}
            savedLeads={savedLeads}
            zeroBounceApiKey={zeroBounceApiKey}
            isPaid={isPaid}
          />
        )}

        {/* ── API Keys / Settings tab (paid only) ── */}
        {tab === 'settings' && isPaid && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Plan selector */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-1">Your Plan</h2>
              <p className="text-gray-400 text-sm mb-5">
                Select which plan you purchased. This controls which API keys are used and how many leads you can generate.
              </p>
              <div className="grid sm:grid-cols-4 gap-3">
                {[
                  { id: 'starter',  label: 'Starter',  price: '$49/mo', sub: '100 leads · Platform keys',    color: 'border-green-500/40 bg-green-500/5'   },
                  { id: 'pro',      label: 'Pro',       price: '$149/mo',sub: '500 leads · Your Hunter key', color: 'border-blue-500/40 bg-blue-500/5'     },
                  { id: 'scale',    label: 'Scale',     price: '$299/mo',sub: 'Unlimited · Both your keys',  color: 'border-purple-500/40 bg-purple-500/5' },
                  { id: 'agency',   label: 'Agency',    price: '$599/mo',sub: 'Unlimited · BYOK · 5 seats',  color: 'border-violet-500/40 bg-violet-500/5' },
                ].map(p => (
                  <button key={p.id} onClick={() => setPlan(p.id)}
                    className={`border rounded-xl p-4 text-left transition-all ${plan === p.id ? p.color + ' ring-1 ring-white/20' : 'border-white/10 bg-white/3 hover:bg-white/8'}`}>
                    <div className="text-white font-bold">{p.label}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{p.price}</div>
                    <div className="text-gray-500 text-xs mt-1">{p.sub}</div>
                    {plan === p.id && <div className="text-xs text-green-400 mt-2 font-semibold">✓ Active</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Hunter key */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl flex-shrink-0">🎯</div>
                <div>
                  <h3 className="text-white font-bold">Hunter.io API Key</h3>
                  <p className="text-gray-400 text-xs">Required for Pro, Scale, and Agency plans. Powers real email + LinkedIn discovery.</p>
                </div>
                {plan === 'starter' && (
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
                    ✅ Platform key used on Starter
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={hunterApiKey}
                  onChange={e => setHunterApiKey(e.target.value)}
                  placeholder={plan === 'starter' ? 'Optional — platform key active on Starter' : 'Paste your Hunter.io API key…'}
                  className="flex-1 bg-black/30 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                />
                <a href="https://hunter.io/api-keys" target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-semibold hover:bg-orange-500/25 transition-colors whitespace-nowrap flex items-center gap-1">
                  Get key →
                </a>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Hunter Starter $49/mo = 500 searches · Growth $99/mo = 2,000 searches ·{' '}
                <a href="https://hunter.io/pricing" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">View plans</a>
              </div>
            </div>

            {/* ZeroBounce key */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl flex-shrink-0">🛡️</div>
                <div>
                  <h3 className="text-white font-bold">ZeroBounce API Key</h3>
                  <p className="text-gray-400 text-xs">Required for Scale and Agency plans. Blocks spam traps, disposables, and hard bounces.</p>
                </div>
                {(plan === 'starter' || plan === 'pro') && (
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
                    ✅ Platform key used on {plan === 'starter' ? 'Starter' : 'Pro'}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={zeroBounceApiKey}
                  onChange={e => setZeroBounceApiKey(e.target.value)}
                  placeholder={plan === 'starter' || plan === 'pro' ? 'Optional — platform key active on this plan' : 'Paste your ZeroBounce API key…'}
                  className="flex-1 bg-black/30 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/50"
                />
                <a href="https://www.zerobounce.net/members/api" target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/25 transition-colors whitespace-nowrap flex items-center gap-1">
                  Get key →
                </a>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Pay-as-you-go $16 / 2,000 credits · Monthly $25/mo (5K) · $49/mo (10K) ·{' '}
                <a href="https://www.zerobounce.net/email-validation-pricing.html" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">View plans</a>
              </div>
            </div>

            {/* What each plan uses */}
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5">
              <div className="text-amber-400 font-semibold text-sm mb-3">🔑 Which keys does each plan use?</div>
              <div className="space-y-2 text-xs text-gray-400">
                {[
                  { plan: 'Starter $49',  hunter: 'Platform',      zb: 'Platform',     leads: '100/mo cap' },
                  { plan: 'Pro $149',     hunter: 'Your key 🔑',   zb: 'Platform',     leads: '500/mo' },
                  { plan: 'Scale $299',   hunter: 'Your key 🔑',   zb: 'Your key 🔑',  leads: 'Unlimited' },
                  { plan: 'Agency $599',  hunter: 'Your key 🔑',   zb: 'Your key 🔑',  leads: 'Unlimited' },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-300 font-semibold">{row.plan}</span>
                    <span>Hunter: {row.hunter}</span>
                    <span>ZB: {row.zb}</span>
                    <span className="text-gray-300">{row.leads}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={saveByokKeys}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-base hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
            >
              {byokSaved ? '✅ Keys Saved!' : '💾 Save API Keys'}
            </button>
            <p className="text-center text-xs text-gray-600">
              Keys are stored in your browser only — never sent to our servers except to make API calls on your behalf.
            </p>
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
