/**
 * /compare — CabinMind vs Apollo, Hunter, ZoomInfo, Clay, Lusha, Sales Navigator
 *
 * Conversion-focused comparison page:
 *  1. Hero — "Stop paying for spreadsheets"
 *  2. Feature comparison table (sticky header)
 *  3. Per-competitor deep-dive cards
 *  4. Price calculator — see what competitors cost vs CabinMind
 *  5. CTA → /pricing
 */
import Layout from '../components/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useCheckout } from '../hooks/useCheckout';

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  { label: 'AI-written ICP scoring (A–D)',        cm: true,  apollo: false, hunter: false, clay: 'partial', zoom: false, lusha: false, nav: false },
  { label: 'Per-lead buying signal detection',    cm: true,  apollo: false, hunter: false, clay: 'partial', zoom: false, lusha: false, nav: false },
  { label: 'AI 4-step cold email sequences',      cm: true,  apollo: false, hunter: false, clay: false,     zoom: false, lusha: false, nav: false },
  { label: 'ZeroBounce email validation',         cm: true,  apollo: 'partial', hunter: true, clay: 'partial', zoom: 'partial', lusha: false, nav: false },
  { label: 'Direct LinkedIn /in/ profiles',       cm: true,  apollo: true,  hunter: false, clay: true,      zoom: true,  lusha: true,  nav: true  },
  { label: 'Instantly.ai one-click export',       cm: true,  apollo: false, hunter: false, clay: false,     zoom: false, lusha: false, nav: false },
  { label: 'HubSpot / Airtable push',             cm: true,  apollo: true,  hunter: false, clay: true,      zoom: true,  lusha: false, nav: false },
  { label: 'Pain points + tech stack per lead',   cm: true,  apollo: false, hunter: false, clay: 'partial', zoom: false, lusha: false, nav: false },
  { label: 'Campaign Builder (bulk validate)',     cm: true,  apollo: false, hunter: false, clay: false,     zoom: false, lusha: false, nav: false },
  { label: 'No annual contract required',         cm: true,  apollo: false, hunter: true,  clay: false,     zoom: false, lusha: false, nav: false },
  { label: 'BYOK (bring your own API keys)',      cm: true,  apollo: false, hunter: false, clay: true,      zoom: false, lusha: false, nav: false },
  { label: 'Live data (not cached database)',     cm: true,  apollo: false, hunter: true,  clay: true,      zoom: false, lusha: false, nav: false },
  { label: 'Pipeline CRM built-in',              cm: true,  apollo: true,  hunter: false, clay: false,     zoom: true,  lusha: false, nav: false },
  { label: 'White-label / agency seats',          cm: true,  apollo: false, hunter: false, clay: false,     zoom: false, lusha: false, nav: false },
  { label: 'Starts at under $100/mo',            cm: true,  apollo: true,  hunter: true,  clay: false,     zoom: false, lusha: false, nav: false },
];

const COMPETITORS = [
  {
    id: 'apollo',
    name: 'Apollo.io',
    logo: '🔵',
    tagline: 'The database that needs a CRM on top',
    price: '$49–$199/mo',
    annualLock: false,
    verdict: 'Good entry point, but it\'s a static database. No AI sequences, no ICP scoring, no ZeroBounce validation — you still spend hours working leads manually. Apollo tells you *who* to call. CabinMind tells you *why* they\'ll buy and *what* to say.',
    theyWin: 'Larger raw database volume, built-in dialer',
    weWin: 'AI sequences, ICP scoring, ZeroBounce, Instantly export, BYOK, live data',
    color: 'border-blue-500/30 bg-blue-500/5',
    textColor: 'text-blue-400',
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    logo: '🟠',
    tagline: 'Great at finding emails — nothing else',
    price: '$49–$299/mo',
    annualLock: false,
    verdict: 'Hunter is the gold standard for email finding — which is why CabinMind uses it under the hood on Pro and Scale plans. But Hunter alone gives you a name and an email address. No scoring, no signals, no sequences, no pain points. You\'re paying for a single step in the pipeline.',
    theyWin: 'Best-in-class email finding accuracy',
    weWin: 'Full pipeline — Hunter + scoring + sequences + validation + export',
    color: 'border-orange-500/30 bg-orange-500/5',
    textColor: 'text-orange-400',
  },
  {
    id: 'zoominfo',
    name: 'ZoomInfo',
    logo: '🟣',
    tagline: '$15,000/yr for a database you can\'t afford',
    price: '$15,000–$40,000/yr',
    annualLock: true,
    verdict: 'ZoomInfo has the biggest B2B database on the planet. It also has the biggest contract. Most SMBs and startups can\'t justify $15K/yr minimum with annual lock-in, dedicated sales reps, and zero month-to-month flexibility. CabinMind Scale is 96% cheaper with AI features ZoomInfo doesn\'t have.',
    theyWin: 'Largest B2B database, intent data (Bombora), org charts',
    weWin: '96% cheaper, no annual lock-in, AI sequences, ICP scoring, cancel anytime',
    color: 'border-purple-500/30 bg-purple-500/5',
    textColor: 'text-purple-400',
  },
  {
    id: 'clay',
    name: 'Clay',
    logo: '🟤',
    tagline: 'Powerful — if you have 40 hours to configure it',
    price: '$149–$800/mo',
    annualLock: true,
    verdict: 'Clay is a powerful enrichment platform loved by technical RevOps teams. It\'s also complex — waterfall enrichment logic, table building, API key juggling, and hours of setup per use case. CabinMind does what Clay does in one click: paste your ICP, get scored leads with AI sequences. No spreadsheet required.',
    theyWin: 'Maximum flexibility, waterfall enrichment, technical power users',
    weWin: 'Zero setup, AI-first, sequences included, 5x cheaper to start',
    color: 'border-amber-500/30 bg-amber-500/5',
    textColor: 'text-amber-400',
  },
  {
    id: 'lusha',
    name: 'Lusha',
    logo: '🟢',
    tagline: '40 contacts a month for $49',
    price: '$49–$79/mo',
    annualLock: false,
    verdict: 'Lusha gives you 480 credits per year on their Pro plan — that\'s 40 contacts a month. CabinMind Starter gives you 100 fully AI-profiled, ZeroBounce-validated leads with ICP scores and cold email sequences. For virtually the same price, there\'s no comparison.',
    theyWin: 'Chrome extension for LinkedIn prospecting',
    weWin: '100 vs 40 leads/mo, AI scoring, sequences, ZeroBounce validation, no credit limits',
    color: 'border-green-500/30 bg-green-500/5',
    textColor: 'text-green-400',
  },
  {
    id: 'nav',
    name: 'LinkedIn Sales Navigator',
    logo: '🔷',
    tagline: '$99/mo to search — then what?',
    price: '$99–$169/mo/user',
    annualLock: true,
    verdict: 'Sales Nav is the best place to find prospects on LinkedIn. It\'s also just a search tool — no emails, no phone numbers, no sequences, no export, annual contracts only. You still need Apollo or Hunter on top of it. CabinMind replaces the entire stack and gives you verified emails and AI sequences from one dashboard.',
    theyWin: 'Largest LinkedIn search database, InMail credits',
    weWin: 'Verified emails included, AI sequences, no annual lock-in, 5x cheaper',
    color: 'border-sky-500/30 bg-sky-500/5',
    textColor: 'text-sky-400',
  },
];

const COLS = [
  { key: 'cm',     label: 'CabinMind', highlight: true  },
  { key: 'apollo', label: 'Apollo'                      },
  { key: 'hunter', label: 'Hunter'                      },
  { key: 'clay',   label: 'Clay'                        },
  { key: 'zoom',   label: 'ZoomInfo'                    },
  { key: 'lusha',  label: 'Lusha'                       },
  { key: 'nav',    label: 'Sales Nav'                   },
];

function Cell({ val, highlight }) {
  if (val === true)      return <span className={`text-lg ${highlight ? 'text-green-400' : 'text-green-500/70'}`}>✓</span>;
  if (val === false)     return <span className="text-gray-700 text-lg">✕</span>;
  if (val === 'partial') return <span className="text-yellow-500 text-sm font-medium">~</span>;
  return <span className="text-gray-600 text-xs">{val}</span>;
}

// ─── Price calculator ────────────────────────────────────────────────────────

const CALC_TOOLS = [
  { id: 'apollo',    label: 'Apollo.io Basic',           price: 49  },
  { id: 'hunter',    label: 'Hunter.io Starter',         price: 49  },
  { id: 'zb',        label: 'ZeroBounce (2K credits)',   price: 16  },
  { id: 'instantly', label: 'Instantly.ai Growth',       price: 37  },
  { id: 'nav',       label: 'LinkedIn Sales Navigator',  price: 99  },
  { id: 'clay',      label: 'Clay Starter',              price: 149 },
];

function PriceCalculator() {
  const [selected, setSelected] = useState({ apollo: true, hunter: false, zb: true, instantly: false, nav: false, clay: false });
  const total = CALC_TOOLS.filter(t => selected[t.id]).reduce((s, t) => s + t.price, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8"
    >
      <h3 className="text-white font-bold text-xl mb-1">💸 Stack cost calculator</h3>
      <p className="text-gray-400 text-sm mb-6">Check the tools you're already paying for — or wish you had.</p>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {CALC_TOOLS.map(t => (
          <label key={t.id}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              selected[t.id] ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/3 hover:bg-white/8'
            }`}>
            <input type="checkbox" checked={!!selected[t.id]}
              onChange={e => setSelected(s => ({ ...s, [t.id]: e.target.checked }))}
              className="w-4 h-4 accent-purple-500" />
            <span className="flex-1 text-sm text-gray-300">{t.label}</span>
            <span className="text-white font-semibold text-sm">${t.price}/mo</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-black/30 rounded-2xl p-5 border border-white/10">
        <div className="flex-1 text-center sm:text-left">
          <div className="text-gray-400 text-xs mb-1">Your current stack costs</div>
          <div className="text-4xl font-black text-red-400">${total}<span className="text-xl text-gray-500">/mo</span></div>
          <div className="text-gray-500 text-xs mt-1">${(total * 12).toLocaleString()}/yr — and you still do sequences manually</div>
        </div>
        <div className="text-gray-600 text-2xl hidden sm:block">→</div>
        <div className="flex-1 text-center sm:text-right">
          <div className="text-gray-400 text-xs mb-1">CabinMind Starter replaces this for</div>
          <div className="text-4xl font-black text-green-400">$97<span className="text-xl text-gray-500">/mo</span></div>
          <div className="text-emerald-400 text-sm font-semibold mt-1">
            {total > 97 ? `Save $${total - 97}/mo ($${((total - 97) * 12).toLocaleString()}/yr)` : 'All-in-one — no juggling tabs'}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link href="/pricing"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20">
          See CabinMind Plans →
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [activeComp, setActiveComp] = useState(null);
  const { handleCheckout, loading: checkoutLoading } = useCheckout();

  return (
    <Layout title="CabinMind vs Apollo, Hunter, ZoomInfo & More — AI Lead Research Comparison">
      <div className="min-h-screen">

        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-600/15 blur-3xl rounded-full pointer-events-none" />

          <div className="relative max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6"
            >
              🔎 Honest comparison — updated March 2026
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl font-black text-white mb-5 leading-tight"
            >
              Stop paying for<br />
              <span className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">
                spreadsheets and silence
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
            >
              Apollo gives you a list. Hunter gives you an email. Sales Navigator gives you a search bar.
              <strong className="text-white"> CabinMind gives you a campaign</strong> — scored leads, validated emails,
              AI-written sequences, and a one-click export to Instantly.ai.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 justify-center"
            >
              <Link href="/demo"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20">
                Try Free Demo →
              </Link>
              <Link href="/pricing"
                className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/15 text-white font-semibold hover:bg-white/10 transition-all">
                See Pricing
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── 3 Unique differentiators ── */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: '🎯',
                title: 'AI ICP Scoring — A to D',
                desc: 'Every lead gets a letter grade based on 8 signals: title, seniority, company size, industry fit, tech stack, hiring signals, funding stage, and location. No competitor does this automatically.',
                color: 'from-purple-500/20 to-violet-500/10 border-purple-500/30',
              },
              {
                icon: '✉️',
                title: 'AI Sequences Per Lead',
                desc: 'A 4-step cold email sequence written from each lead\'s pain points, buying signals, and tech stack — not a generic template you have to edit yourself. Apollo, Hunter, ZoomInfo: none of them do this.',
                color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
              },
              {
                icon: '🚀',
                title: 'Research → Campaign in One Click',
                desc: 'Research → validate → sequence → export to Instantly.ai. The entire outbound pipeline in one dashboard. Competitors make you stitch 4–5 tools together manually.',
                color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
              },
            ].map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border p-6 bg-gradient-to-br ${d.color}`}
              >
                <div className="text-3xl mb-3">{d.icon}</div>
                <h3 className="text-white font-bold text-base mb-2">{d.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{d.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Feature comparison table ── */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-white font-black text-3xl text-center mb-2">Full feature comparison</h2>
            <p className="text-gray-500 text-center text-sm mb-8">✓ = included · ✕ = not available · ~ = partial / extra cost</p>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-gray-400 font-medium w-56">Feature</th>
                    {COLS.map(c => (
                      <th key={c.key} className={`p-4 text-center font-bold ${c.highlight ? 'text-purple-300 bg-purple-500/10' : 'text-gray-400'}`}>
                        {c.highlight && <span className="block text-xs text-purple-400 mb-0.5">⭐</span>}
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((f, i) => (
                    <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/2' : ''}`}>
                      <td className="p-4 text-gray-300 text-xs leading-relaxed">{f.label}</td>
                      {COLS.map(c => (
                        <td key={c.key} className={`p-4 text-center ${c.highlight ? 'bg-purple-500/5' : ''}`}>
                          <Cell val={f[c.key]} highlight={c.highlight} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 bg-white/5">
                    <td className="p-4 text-gray-400 font-semibold text-xs">Starting price</td>
                    {[
                      { label: '$97/mo', highlight: true  },
                      { label: '$49/mo', highlight: false },
                      { label: '$49/mo', highlight: false },
                      { label: '$149/mo',highlight: false },
                      { label: '$15K/yr',highlight: false },
                      { label: '$49/mo', highlight: false },
                      { label: '$99/mo', highlight: false },
                    ].map((p, i) => (
                      <td key={i} className={`p-4 text-center font-bold text-sm ${p.highlight ? 'text-purple-300 bg-purple-500/10' : 'text-gray-400'}`}>
                        {p.label}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-gray-600 text-xs text-center mt-3">
              Prices and features verified March 2026. Competitor features subject to change.
            </p>
          </motion.div>
        </section>

        {/* ── Per-competitor deep-dive ── */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white font-black text-3xl text-center mb-2"
          >
            CabinMind vs. the alternatives
          </motion.h2>
          <p className="text-gray-500 text-center text-sm mb-10">The honest breakdown — where they win, where we win.</p>

          <div className="space-y-4">
            {COMPETITORS.map((comp, i) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border ${comp.color} overflow-hidden`}
              >
                {/* Header row — always visible */}
                <button
                  className="w-full p-5 flex items-center gap-4 text-left"
                  onClick={() => setActiveComp(activeComp === comp.id ? null : comp.id)}
                >
                  <span className="text-3xl flex-shrink-0">{comp.logo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-white font-bold text-lg">{comp.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${comp.color} ${comp.textColor} font-medium`}>
                        {comp.price}
                      </span>
                      {comp.annualLock && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
                          Annual contract required
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">{comp.tagline}</p>
                  </div>
                  <span className="text-gray-600 text-sm flex-shrink-0">{activeComp === comp.id ? '▲' : '▼'}</span>
                </button>

                {/* Expanded detail */}
                {activeComp === comp.id && (
                  <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                    <p className="text-gray-300 text-sm leading-relaxed">{comp.verdict}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-black/20 rounded-xl p-4">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Where they win</div>
                        <p className="text-gray-300 text-sm">{comp.theyWin}</p>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                        <div className="text-purple-400 text-xs font-semibold uppercase tracking-wide mb-2">Where CabinMind wins</div>
                        <p className="text-gray-300 text-sm">{comp.weWin}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Link href="/demo"
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition-all">
                        Try Free Demo →
                      </Link>
                      <Link href="/pricing"
                        className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/10 transition-all">
                        See Pricing
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Price calculator ── */}
        <section className="max-w-3xl mx-auto px-4 pb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white font-black text-3xl text-center mb-2"
          >
            What's your current stack costing you?
          </motion.h2>
          <p className="text-gray-500 text-center text-sm mb-8">
            Most sales teams pay $200–$400/mo across 4 tools and still write sequences manually.
          </p>
          <PriceCalculator />
        </section>

        {/* ── Why CabinMind Is Worth the Money ── */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-white font-black text-3xl sm:text-4xl mb-3">
              Why CabinMind is worth the money
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Not marketing. The actual technical reasons — rooted in what the product does.
            </p>
          </motion.div>

          <div className="space-y-5">
            {[
              {
                icon: '🔗',
                title: 'It replaces a 4–5 tool stack in one dashboard',
                color: 'border-purple-500/30 from-purple-500/10 to-violet-500/5',
                accent: 'text-purple-400',
                rows: [
                  { step: 'Find companies matching your ICP', competitor: 'Apollo $49 or Sales Nav $99', cm: 'AI generates real companies + domains' },
                  { step: 'Get decision-maker emails',         competitor: 'Hunter.io $49',               cm: 'Hunter runs under the hood (or BYOK)' },
                  { step: 'Validate emails — no bounces',     competitor: 'ZeroBounce $16',              cm: '6-layer validation built in, automatic' },
                  { step: 'Score leads — work best ones first', competitor: 'Nothing on the market',     cm: 'Deterministic A–D scoring on 8 signals' },
                  { step: 'Write cold email sequences',        competitor: 'Instantly $37 + your time',  cm: 'AI writes 4-step sequence per lead' },
                  { step: 'Export to your sending tool',       competitor: 'Manual CSV formatting',      cm: 'One-click Instantly.ai CSV export' },
                ],
                footer: 'Competitor stack total: $250+/mo and hours of manual work. CabinMind Starter: $97/mo. Zero setup.',
              },
              {
                icon: '🎯',
                title: 'The ICP scoring is genuinely unique — nothing else does this automatically',
                color: 'border-blue-500/30 from-blue-500/10 to-cyan-500/5',
                accent: 'text-blue-400',
                signals: [
                  { name: 'Title tier',              detail: 'C-suite +20pts · VP/Director +14pts · Manager +8pts' },
                  { name: 'ICP keyword match',        detail: 'Title words cross-referenced against your exact ICP description' },
                  { name: 'ZeroBounce verified email', detail: '+15pts — hard data, not a guess' },
                  { name: 'Hunter confidence score',  detail: 'Direct signal of email accuracy — low confidence rejected' },
                  { name: 'LinkedIn direct /in/ URL', detail: 'Proof they\'re a real, findable person' },
                  { name: 'Company size fit',         detail: 'Filtered to your target band — not random-sized companies' },
                  { name: 'Catch-all domain penalty', detail: 'Flags risky emails before you send — protects your domain' },
                  { name: 'Email source tier',        detail: 'Hunter-found > AI-pattern — transparent sourcing shown to client' },
                ],
                footer: 'Every signal is shown to the client in the dashboard. Not just a score — the exact reason. Apollo, Hunter, Clay, ZoomInfo — none do this per lead, automatically.',
              },
              {
                icon: '📧',
                title: 'AI sequences written from each lead\'s actual data — not a filled-in template',
                color: 'border-emerald-500/30 from-emerald-500/10 to-green-500/5',
                accent: 'text-emerald-400',
                steps: [
                  { day: 'Day 0',  label: 'Cold Intro',    desc: 'References ONE specific pain point or buying signal from that lead\'s company. Under 150 words. Ends with a single soft question.' },
                  { day: 'Day 3',  label: 'Value Add',     desc: 'Shares a relevant insight, stat, or mini case study tied to their tech stack. Show don\'t sell. Under 180 words.' },
                  { day: 'Day 7',  label: 'Social Proof',  desc: 'References a result or customer story. Urgency framed around their specific buying signal. Under 150 words.' },
                  { day: 'Day 14', label: 'Break-up Email', desc: 'Short, honest, low-pressure. Offers one final resource. Under 80 words. A copywriter charges $200–$500 to write this for one lead.' },
                ],
                footer: 'CabinMind generates a personalised 4-step sequence for every lead in 3 seconds. Plain text, peer-to-peer tone, no bullet points in the body — rules enforced by the prompt.',
              },
              {
                icon: '🛡️',
                title: '6-layer email validation protects your client\'s sending domain',
                color: 'border-amber-500/30 from-amber-500/10 to-yellow-500/5',
                accent: 'text-amber-400',
                layers: [
                  { n: 1, name: 'Format check',           risk: 'Malformed addresses that crash senders' },
                  { n: 2, name: 'Role address filter',     risk: 'info@, admin@, support@ — never real decision-makers' },
                  { n: 3, name: 'MX record check',         risk: 'Domain can\'t receive email at all' },
                  { n: 4, name: 'Hunter confidence floor', risk: 'Low-confidence emails rejected before sending' },
                  { n: 5, name: 'Hunter status check',     risk: 'Hunter-flagged invalid addresses dropped instantly' },
                  { n: 6, name: 'ZeroBounce primary',      risk: 'Spam traps, disposables, hard bounces, catch-alls' },
                ],
                footer: 'Apollo doesn\'t do this. Hunter\'s verification is single-layer. Clay lets you build it yourself if you know what you\'re doing. CabinMind does it automatically on every lead before the client ever sees them.',
              },
              {
                icon: '💸',
                title: 'The BYOK model means clients pay less as they scale — not more',
                color: 'border-violet-500/30 from-violet-500/10 to-purple-500/5',
                accent: 'text-violet-400',
                tiers: [
                  { plan: 'Starter $97/mo',  desc: 'Platform covers everything. Just subscribe, get 100 validated leads. Zero API accounts.', perLead: '$0.97/lead' },
                  { plan: 'Pro $247/mo',      desc: 'Bring your own Hunter key. Platform covers ZeroBounce. 500 leads/mo.', perLead: '$0.59/lead' },
                  { plan: 'Scale $497/mo',    desc: 'Bring both keys. Unlimited leads flat — no per-lead fees ever again.', perLead: 'Unlimited' },
                  { plan: 'Agency $997/mo',   desc: 'One subscription. 5 client seats. White-label dashboard. Bill clients at any margin.', perLead: 'Your margin' },
                ],
                footer: 'Every other tool charges more as you use more. CabinMind flips it — the more serious and high-volume the client, the better value they get. That\'s a trust signal.',
              },
              {
                icon: '🚀',
                title: 'Live data vs. stale databases — a fundamental difference',
                color: 'border-rose-500/30 from-rose-500/10 to-pink-500/5',
                accent: 'text-rose-400',
                points: [
                  { them: 'Apollo, ZoomInfo, Lusha', issue: 'Pre-collected databases — records may be months or years old. People leave companies. Titles change. Emails go stale.' },
                  { them: 'CabinMind', issue: 'Calls Hunter\'s live API against real company domains at the moment of the request. ZeroBounce then confirms the email is still active right now. Every result is current.' },
                ],
                footer: 'The difference between a contacts list and a live intelligence feed.',
              },
            ].map((section, si) => (
              <motion.div
                key={si}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: si * 0.05 }}
                className={`rounded-2xl border bg-gradient-to-br p-6 sm:p-8 ${section.color}`}
              >
                <div className="flex items-start gap-4 mb-5">
                  <span className="text-3xl flex-shrink-0">{section.icon}</span>
                  <h3 className={`text-white font-bold text-lg sm:text-xl leading-snug`}>{section.title}</h3>
                </div>

                {/* Stack replacement table */}
                {section.rows && (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left pb-2 text-gray-500 font-medium text-xs w-1/3">Pipeline step</th>
                          <th className="text-left pb-2 text-gray-500 font-medium text-xs w-1/3">Competitors</th>
                          <th className={`text-left pb-2 font-medium text-xs w-1/3 ${section.accent}`}>CabinMind</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {section.rows.map((r, i) => (
                          <tr key={i}>
                            <td className="py-2.5 pr-4 text-gray-400 text-xs">{r.step}</td>
                            <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.competitor}</td>
                            <td className={`py-2.5 text-xs font-medium ${section.accent}`}>{r.cm}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Scoring signals */}
                {section.signals && (
                  <div className="grid sm:grid-cols-2 gap-2 mb-4">
                    {section.signals.map((s, i) => (
                      <div key={i} className="flex gap-2 items-start bg-black/20 rounded-lg p-3">
                        <span className={`text-xs font-bold mt-0.5 flex-shrink-0 ${section.accent}`}>#{i + 1}</span>
                        <div>
                          <div className="text-white text-xs font-semibold">{s.name}</div>
                          <div className="text-gray-400 text-xs">{s.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sequence steps */}
                {section.steps && (
                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    {section.steps.map((s, i) => (
                      <div key={i} className="bg-black/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-black/30 ${section.accent}`}>{s.day}</span>
                          <span className="text-white text-xs font-semibold">{s.label}</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Validation layers */}
                {section.layers && (
                  <div className="space-y-2 mb-4">
                    {section.layers.map((l, i) => (
                      <div key={i} className="flex items-center gap-3 bg-black/20 rounded-lg px-4 py-2.5">
                        <span className={`text-xs font-black w-5 flex-shrink-0 ${section.accent}`}>L{l.n}</span>
                        <span className="text-white text-xs font-semibold flex-shrink-0 w-44">{l.name}</span>
                        <span className="text-gray-400 text-xs">Catches: {l.risk}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* BYOK tiers */}
                {section.tiers && (
                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    {section.tiers.map((t, i) => (
                      <div key={i} className="bg-black/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-bold ${section.accent}`}>{t.plan}</span>
                          <span className="text-xs text-gray-500 font-medium">{t.perLead}</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live vs stale */}
                {section.points && (
                  <div className="space-y-3 mb-4">
                    {section.points.map((p, i) => (
                      <div key={i} className={`rounded-xl p-4 ${i === 0 ? 'bg-black/30 border border-red-500/20' : 'bg-black/30 border border-emerald-500/20'}`}>
                        <div className={`text-xs font-bold mb-1 ${i === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {i === 0 ? '✕ ' : '✓ '}{p.them}
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed">{p.issue}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className={`text-xs font-semibold mt-2 ${section.accent}`}>{section.footer}</p>
              </motion.div>
            ))}
          </div>

          {/* One-line pitch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 text-center bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 border border-purple-500/20 rounded-2xl p-8"
          >
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-3 font-semibold">The one-line pitch</p>
            <p className="text-white text-lg sm:text-xl font-bold leading-relaxed max-w-3xl mx-auto">
              "Apollo tells you who exists. Hunter finds their email. Sales Nav lets you search.{' '}
              <span className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">
                CabinMind tells you who to contact, why they'll buy, what to say, and gets you to Instantly.ai ready to launch — in under 60 seconds.
              </span>"
            </p>
            <p className="text-gray-600 text-xs mt-3">No other tool in this category does all five. That's the moat.</p>
          </motion.div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="max-w-3xl mx-auto px-4 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-purple-900/40 to-violet-900/30 border border-purple-500/30 rounded-3xl p-10 relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-white font-black text-3xl sm:text-4xl mb-3">
                Ready to replace your entire stack?
              </h2>
              <p className="text-gray-300 text-lg mb-6 max-w-xl mx-auto leading-relaxed">
                5 free leads, no credit card. See exactly what CabinMind finds for your ICP
                before you spend a dollar.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/demo"
                  className="px-10 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-purple-500/30">
                  Try Free Demo — No Card
                </Link>
                <button
                  onClick={() => handleCheckout('lead-starter')}
                  disabled={!!checkoutLoading}
                  className="px-10 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-lg hover:bg-white/15 transition-all disabled:opacity-50"
                >
                  {checkoutLoading ? 'Redirecting…' : 'Start Starter — $97/mo'}
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-4">Cancel anytime · No annual contract · Setup in 5 minutes</p>
            </div>
          </motion.div>
        </section>

      </div>
    </Layout>
  );
}
