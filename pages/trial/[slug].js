/**
 * /trial/[slug]  — Gifted client trial dashboard
 *
 * A private, token-gated lead-generator that gives one client exactly 50 leads
 * using the platform's own Hunter + ZeroBounce keys, at no charge to the client.
 *
 * Usage: share /trial/acme2026 (or whatever slug you pick) with the client.
 * The slug acts as both the access-gate AND the usage-tracking key so the
 * 50-lead cap is enforced server-side per slug.
 *
 * To create a new trial for a new client:
 *   Just send them /trial/<any-slug> — the first time it's used, the counter starts.
 *
 * To revoke access: remove the slug from VALID_SLUGS below and redeploy.
 */

import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Config ───────────────────────────────────────────────────────────────────
// Add/remove slugs here to control who has access.
// Each slug gets its own independent 50-lead counter.
const VALID_SLUGS = [
  'acme2026',
  // add more as needed: 'client-xyz', 'prospectco', etc.
];

const TOTAL_LIMIT     = 50;  // leads per slug (10 batches × 5)
const CHUNK_SIZE      = 5;

const ICP_PRESETS = [
  { label: '🚀 SaaS Founders',     value: 'B2B SaaS startup founders, 10–50 employees, Series A or pre-revenue, using HubSpot or Salesforce, struggling with lead conversion' },
  { label: '📣 Marketing Leaders', value: 'VP of Marketing or CMO at mid-market B2B companies, 50–200 employees, tech industry, running paid acquisition' },
  { label: '🛒 E-commerce Owners', value: 'E-commerce store owners doing $1M–$10M revenue on Shopify, looking to scale customer retention and reduce churn' },
  { label: '🏢 Agency Owners',     value: 'Digital marketing agency owners, 5–30 employees, serving SMB clients, looking to productise services and reduce churn' },
  { label: '👥 HR Directors',      value: 'HR Directors or VP People at companies with 100–500 employees in tech or finance, managing rapid headcount growth' },
  { label: '⚙️ RevOps Leaders',    value: 'Revenue Operations Managers or Directors at B2B SaaS companies 50–300 employees using Salesforce, managing complex sales stack' },
  { label: '🍕 Food Bloggers',     value: 'Independent food bloggers and recipe content creators with 10K–500K monthly readers, monetising through ads, sponsorships, or digital products, publishing on their own domain' },
  { label: '✍️ Newsletter Creators', value: 'Solo newsletter writers and Substack authors with 5K–100K subscribers, covering niche topics, looking for brand sponsorships or course sales' },
];

// Must match scoreLabel() thresholds in /api/leads.js — A≥88, B≥72, C≥58
const SCORE_STYLE = (score, grade) => {
  const g = grade || (score >= 88 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : 'D');
  if (g === 'A') return { badge: 'bg-green-500/20 text-green-300 border-green-500/40',   label: 'Hot',  dot: 'bg-green-400'  };
  if (g === 'B') return { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',     label: 'Warm', dot: 'bg-blue-400'   };
  if (g === 'C') return { badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', label: 'Cool', dot: 'bg-yellow-400' };
  return              { badge: 'bg-gray-500/20 text-gray-400 border-gray-500/40',       label: 'Cold', dot: 'bg-gray-400'   };
};

function buildCSV(leads) {
  const headers = ['Name','Title','Company','Domain','Email','Email Verified','LinkedIn','Score','Grade','Signal','Pain Points'];
  const rows = leads.map(l => [
    l.name, l.title, l.company, l.domain, l.email || '',
    l.email_verified ? 'Yes' : 'No',
    l.linkedin || '',
    l.score, l.grade,
    l.signal || '',
    l.pain_points || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// ─── Components ───────────────────────────────────────────────────────────────

function LeadCard({ lead, index }) {
  const [expanded, setExpanded] = useState(false);
  const style = SCORE_STYLE(lead.score, lead.grade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-gray-800/60 border border-gray-700/60 rounded-xl overflow-hidden"
    >
      {/* Main row */}
      <div
        className="p-4 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Score badge */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg border flex flex-col items-center justify-center ${style.badge}`}>
          <span className="text-sm font-black leading-none">{lead.grade}</span>
          <span className="text-[10px] leading-none mt-0.5 opacity-80">{lead.score}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{lead.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style.badge}`}>{style.label}</span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{lead.title} · <span className="text-brand-400">{lead.company}</span></p>
          {lead.email && (
            <p className="text-gray-300 text-xs mt-1 font-mono flex items-center gap-1">
              {lead.email}
              {lead.email_verified && <span className="text-green-400 text-[10px] ml-1">✓ verified</span>}
            </p>
          )}
        </div>

        {/* Chevron */}
        <span className={`text-gray-500 transition-transform flex-shrink-0 mt-1 ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-700/50 space-y-3">
              {lead.signal && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Buying Signal</p>
                  <p className="text-sm text-amber-300">{lead.signal}</p>
                </div>
              )}
              {lead.pain_points && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Pain Points</p>
                  <p className="text-sm text-gray-300">{lead.pain_points}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {lead.linkedin && (
                  <a href={lead.linkedin} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg hover:bg-blue-600/30 transition"
                    onClick={e => e.stopPropagation()}>
                    LinkedIn →
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`}
                    className="text-xs px-3 py-1.5 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-lg hover:bg-brand-500/30 transition"
                    onClick={e => e.stopPropagation()}>
                    Email →
                  </a>
                )}
              </div>
              {lead.score_signals?.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Score Breakdown</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.score_signals.map((s, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-700/60 text-gray-400 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrialPage({ slug, valid }) {
  const [icp, setIcp]               = useState('');
  const [leads, setLeads]           = useState([]);
  const [generating, setGenerating] = useState(false);
  const [batchNum, setBatchNum]     = useState(1);
  const [error, setError]           = useState(null);
  const [limitHit, setLimitHit]     = useState(false);
  const [sources, setSources]       = useState(null);
  const abortRef = useRef(null);

  const totalGenerated = leads.length;
  const remaining = TOTAL_LIMIT - totalGenerated;
  const progressPct = Math.min((totalGenerated / TOTAL_LIMIT) * 100, 100);

  const fetchBatch = useCallback(async (currentBatch, currentIcp) => {
    setGenerating(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          icp: currentIcp,
          batchNum: currentBatch,
          plan: 'client-trial',
          trialSlug: slug,
          isDemo: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.quota) {
          setLimitHit(true);
          setError(`You've used all ${TOTAL_LIMIT} trial leads. Contact us to subscribe for unlimited access.`);
        } else {
          setError(data.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      if (data.leads?.length) {
        setLeads(prev => {
          // Deduplicate by _id
          const existing = new Set(prev.map(l => l._id));
          const fresh = data.leads.filter(l => !existing.has(l._id));
          return [...prev, ...fresh];
        });
        setBatchNum(b => b + 1);
        if (data.sources) setSources(data.sources);
      } else {
        setError('No leads returned for this batch. Try adjusting your ICP.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError('Request failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [slug]);

  const handleGenerate = () => {
    if (!icp.trim()) { setError('Please describe your ideal customer first.'); return; }
    if (limitHit || totalGenerated >= TOTAL_LIMIT) { setLimitHit(true); return; }
    fetchBatch(batchNum, icp.trim());
  };

  const handleDownloadCSV = () => {
    const csv  = buildCSV(leads);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `cabinmind-trial-leads-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 404 for invalid slugs ────────────────────────────────────────────────
  if (!valid) {
    return (
      <>
        <Head><title>Not Found – CabinMind</title></Head>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Trial not found</h1>
            <p className="text-gray-400">This trial link is invalid or has expired.</p>
            <a href="https://products.devcabin.tech" className="mt-6 inline-block text-brand-400 hover:underline text-sm">← Back to CabinMind</a>
          </div>
        </div>
      </>
    );
  }

  // ── Main dashboard ───────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>AI Lead Researcher – Trial · CabinMind</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-950 text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-500 px-4 py-5">
          <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-purple-200 text-xs font-medium uppercase tracking-wider mb-0.5">CabinMind · Complimentary Trial</p>
              <h1 className="text-xl font-black text-white">🔎 AI Lead Researcher</h1>
            </div>
            <div className="text-right">
              <p className="text-purple-200 text-xs">Trial leads</p>
              <p className="text-white font-bold text-lg">{totalGenerated} / {TOTAL_LIMIT}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="max-w-3xl mx-auto mt-3">
            <div className="h-1.5 bg-purple-400/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

          {/* ICP Input */}
          <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Describe your ideal customer (ICP)
              </label>
              <textarea
                value={icp}
                onChange={e => setIcp(e.target.value)}
                placeholder="e.g. VP of Sales at B2B SaaS companies, 50–200 employees, Series A/B, using Salesforce…"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 transition"
                rows={3}
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {ICP_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setIcp(p.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    icp === p.value
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/60'
                      : 'bg-gray-800/60 text-gray-400 border-gray-700/50 hover:border-gray-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || limitHit || totalGenerated >= TOTAL_LIMIT || !icp.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating 5 leads…
                  </>
                ) : limitHit || totalGenerated >= TOTAL_LIMIT ? (
                  '🎉 All 50 trial leads used!'
                ) : (
                  `⚡ Generate ${batchNum === 1 ? 'First' : 'Next'} 5 Leads${remaining < 10 ? ` (${remaining} left)` : ''}`
                )}
              </button>

              {leads.length > 0 && (
                <button
                  onClick={handleDownloadCSV}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-sm font-medium rounded-xl transition flex items-center gap-2"
                >
                  ↓ CSV
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className={`rounded-lg px-4 py-3 text-sm border ${
                limitHit
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {error}
                {limitHit && (
                  <div className="mt-2">
                    <a
                      href="https://products.devcabin.tech/pricing"
                      className="font-semibold underline text-purple-300 hover:text-white"
                    >
                      Subscribe for unlimited leads →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats bar */}
          {sources && leads.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Leads found',      value: leads.length },
                { label: 'Emails verified',  value: leads.filter(l => l.email_verified).length },
                { label: 'Hot leads (A)',     value: leads.filter(l => l.grade === 'A').length },
                { label: 'Direct LinkedIn',  value: leads.filter(l => l.linkedin_is_direct).length },
              ].map(s => (
                <div key={s.label} className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Lead cards */}
          {leads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300">{leads.length} lead{leads.length !== 1 ? 's' : ''} generated</h2>
                {leads.length > 0 && (
                  <span className="text-xs text-gray-500">Click any card to expand</span>
                )}
              </div>
              <AnimatePresence>
                {leads.map((lead, i) => (
                  <LeadCard key={lead._id || i} lead={lead} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {leads.length === 0 && !generating && (
            <div className="text-center py-16 text-gray-600">
              <div className="text-5xl mb-3">🔎</div>
              <p className="text-gray-400 font-medium">No leads yet</p>
              <p className="text-sm mt-1">Describe your ideal customer above and hit Generate.</p>
            </div>
          )}

          {/* Limit hit — upgrade CTA */}
          {(limitHit || totalGenerated >= TOTAL_LIMIT) && leads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-900/40 to-violet-900/30 border border-purple-500/30 rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-white mb-1">You've used all 50 trial leads!</h3>
              <p className="text-gray-400 text-sm mb-4">
                Subscribe to keep going — our Starter plan gives you 100 leads/month, and Pro goes up to 500.
              </p>
              <a
                href="https://products.devcabin.tech/pricing"
                className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition text-sm"
              >
                See Plans & Pricing →
              </a>
            </motion.div>
          )}

          {/* Footer */}
          <div className="text-center text-gray-600 text-xs pt-4 pb-8">
            Powered by <a href="https://products.devcabin.tech" className="text-gray-500 hover:text-gray-400">CabinMind</a>
            {' · '}
            Questions? <a href="mailto:support@devcabin.tech" className="text-gray-500 hover:text-gray-400">support@devcabin.tech</a>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SSR: validate slug server-side so bots can't probe ──────────────────────
export async function getServerSideProps({ params }) {
  const slug  = (params?.slug || '').toLowerCase().trim();
  const valid = VALID_SLUGS.includes(slug);
  return { props: { slug, valid } };
}
