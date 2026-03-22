import Layout from '../components/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useCheckout } from '../hooks/useCheckout';

const FEATURES = [
  { label: 'AI ICP scoring A–D on 8 signals',     cm: true,  apollo: false, hunter: false, clay: 'partial', zoom: false, lusha: false, nav: false },
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
  { label: 'Starts under \$100/mo',              cm: true,  apollo: true,  hunter: true,  clay: false,     zoom: false, lusha: false, nav: false },
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

const COMPETITORS = [
  {
    id: 'apollo', name: 'Apollo.io', logo: '🔵', price: '\$49–\$199/mo', annualLock: false,
    tagline: "The database that needs a CRM on top",
    verdict: "Apollo gives you a list. No AI sequences, no ICP scoring, no ZeroBounce — you still write every email manually. CabinMind scores each lead A–D, explains why they fit, and writes a 4-step sequence from their pain points.",
    theyWin: 'Larger raw database, built-in dialer, email cadences',
    weWin: 'AI sequences, ICP scoring, ZeroBounce, Instantly export, live data, BYOK',
    color: 'border-blue-500/30 bg-blue-500/5', textColor: 'text-blue-400',
  },
  {
    id: 'hunter', name: 'Hunter.io', logo: '🟠', price: '\$49–\$299/mo', annualLock: false,
    tagline: "Great at finding emails — nothing else",
    verdict: "Hunter is the gold standard for email finding — which is why CabinMind uses it under the hood on Pro and Scale plans. But Hunter alone gives you a name and an email. No scoring, no signals, no sequences, no campaign builder.",
    theyWin: 'Best-in-class email finding accuracy',
    weWin: 'Full pipeline — Hunter + scoring + sequences + validation + Instantly export',
    color: 'border-orange-500/30 bg-orange-500/5', textColor: 'text-orange-400',
  },
  {
    id: 'zoominfo', name: 'ZoomInfo', logo: '🟣', price: '\$15,000–\$40,000/yr', annualLock: true,
    tagline: "\$15,000/yr for a database you can't afford",
    verdict: "ZoomInfo has the biggest B2B database on the planet — and the biggest contract. Most SMBs can't justify \$15K/yr. CabinMind Scale at \$497/mo is 96% cheaper and adds AI features ZoomInfo doesn't have.",
    theyWin: 'Largest B2B database, intent data, org charts',
    weWin: '96% cheaper, no annual lock-in, AI sequences, ICP scoring, cancel anytime',
    color: 'border-purple-500/30 bg-purple-500/5', textColor: 'text-purple-400',
  },
  {
    id: 'clay', name: 'Clay', logo: '🟤', price: '\$149–\$800/mo', annualLock: true,
    tagline: "Powerful — if you have 40 hours to configure it",
    verdict: "Clay is loved by technical RevOps teams. It's also complex — waterfall enrichment logic, table building, API juggling, hours of setup. CabinMind does it in one click: paste ICP, get scored leads with AI sequences. No spreadsheet required.",
    theyWin: 'Maximum flexibility, waterfall enrichment for technical power users',
    weWin: 'Zero setup, AI-first UX, sequences included, 5x cheaper to start',
    color: 'border-amber-500/30 bg-amber-500/5', textColor: 'text-amber-400',
  },
  {
    id: 'lusha', name: 'Lusha', logo: '🟢', price: '\$49–\$79/mo', annualLock: false,
    tagline: "40 contacts a month for \$49",
    verdict: "Lusha's Pro plan gives 480 credits per year — 40 contacts a month. CabinMind Starter gives 100 fully AI-profiled, ZeroBounce-validated leads with ICP scores and cold email sequences. Same price, no comparison.",
    theyWin: 'Chrome extension for LinkedIn prospecting',
    weWin: '100 vs 40 leads/mo, AI scoring, sequences, ZeroBounce, no credit limits',
    color: 'border-green-500/30 bg-green-500/5', textColor: 'text-green-400',
  },
  {
    id: 'nav', name: 'LinkedIn Sales Navigator', logo: '🔷', price: '\$99–\$169/mo/user', annualLock: true,
    tagline: "\$99/mo to search — then what?",
    verdict: "Sales Nav is the best place to search LinkedIn. It's also just a search tool — no emails, no sequences, no export, annual contracts only. You still need Apollo or Hunter on top. CabinMind replaces the whole stack with verified emails and AI sequences.",
    theyWin: 'Best LinkedIn search, InMail credits',
    weWin: 'Verified emails included, AI sequences, no annual lock-in, 5x cheaper',
    color: 'border-sky-500/30 bg-sky-500/5', textColor: 'text-sky-400',
  },
];

const CALC_TOOLS = [
  { id: 'apollo',    label: 'Apollo.io Basic',          price: 49  },
  { id: 'hunter',    label: 'Hunter.io Starter',        price: 49  },
  { id: 'zb',        label: 'ZeroBounce (2K credits)',  price: 16  },
  { id: 'instantly', label: 'Instantly.ai Growth',      price: 37  },
  { id: 'nav',       label: 'LinkedIn Sales Navigator', price: 99  },
  { id: 'clay',      label: 'Clay Starter',             price: 149 },
];

function Cell({ val, highlight }) {
  if (val === true)      return <span className={`text-lg ${highlight ? 'text-green-400' : 'text-green-500/70'}`}>✓</span>;
  if (val === false)     return <span className="text-gray-700 text-lg">✕</span>;
  if (val === 'partial') return <span className="text-yellow-500 text-sm font-medium">~</span>;
  return <span className="text-gray-600 text-xs">{val}</span>;
}

function PriceCalculator() {
  const [selected, setSelected] = useState({ apollo: true, hunter: false, zb: true, instantly: false, nav: false, clay: false });
  const total = CALC_TOOLS.filter(t => selected[t.id]).reduce((s, t) => s + t.price, 0);
  const savings = total - 97;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
      <h3 className="text-white font-bold text-xl mb-1">💸 What is your current stack costing you?</h3>
      <p className="text-gray-400 text-sm mb-6">Check every tool you pay for — or wish you had.</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {CALC_TOOLS.map(t => (
          <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selected[t.id] ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'}`}>
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
          <div className="text-gray-400 text-xs mb-1">Your stack total</div>
          <div className="text-4xl font-black text-red-400">${total}<span className="text-xl text-gray-500">/mo</span></div>
          <div className="text-gray-500 text-xs mt-1">${(total * 12).toLocaleString()}/yr · still writing sequences manually</div>
        </div>
        <div className="text-gray-600 text-3xl hidden sm:block">→</div>
        <div className="flex-1 text-center sm:text-right">
          <div className="text-gray-400 text-xs mb-1">CabinMind Starter replaces it for</div>
          <div className="text-4xl font-black text-green-400">$97<span className="text-xl text-gray-500">/mo</span></div>
          <div className="text-emerald-400 text-sm font-semibold mt-1">
            {savings > 0 ? `Save $${savings}/mo ($${(savings * 12).toLocaleString()}/yr)` : 'All-in-one — sequences included'}
          </div>
        </div>
      </div>
      <div className="mt-5 text-center">
        <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20">
          See All CabinMind Plans →
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [activeComp, setActiveComp] = useState(null);
  const { handleCheckout, loading: checkoutLoading } = useCheckout();

  return (
    <Layout title="CabinMind vs Apollo, Hunter, ZoomInfo & More — AI Lead Research Comparison">
      <div className="min-h-screen">

        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-600/15 blur-3xl rounded-full pointer-events-none" />
          <div className="relative max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
              🔎 Honest comparison — updated March 2026
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl font-black text-white mb-5 leading-tight">
              Stop paying for<br />
              <span className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">
                spreadsheets and silence
              </span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              Apollo gives you a list. Hunter gives you an email. Sales Navigator gives you a search bar.
              <strong className="text-white"> CabinMind gives you a campaign</strong> — scored leads, validated emails, AI-written sequences, and one-click Instantly.ai export.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 justify-center">
              <Link href="/demo" className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20">
                Try Free Demo →
              </Link>
              <Link href="/pricing" className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/15 text-white font-semibold hover:bg-white/10 transition-all">
                See Pricing
              </Link>
            </motion.div>
          </div>
        </section>

        {/* 3 differentiators */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: '🎯', title: 'AI ICP Scoring — A to D', color: 'from-purple-500/20 to-violet-500/10 border-purple-500/30',
                desc: "Every lead gets a letter grade based on 8 signals: title, seniority, company size, industry fit, tech stack, hiring signals, funding stage, and location. No competitor does this automatically." },
              { icon: '✉️', title: 'AI Sequences Per Lead', color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
                desc: "A 4-step cold email sequence written from each lead's pain points, buying signals, and tech stack — not a template you edit yourself. Apollo, Hunter, ZoomInfo: none of them do this." },
              { icon: '🚀', title: 'Research → Campaign in One Click', color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
                desc: "Research → validate → sequence → export to Instantly.ai. The entire outbound pipeline in one dashboard. Competitors make you stitch 4–5 tools together manually." },
            ].map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border p-6 bg-gradient-to-br ${d.color}`}>
                <div className="text-3xl mb-3">{d.icon}</div>
                <h3 className="text-white font-bold text-base mb-2">{d.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{d.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feature table */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-white font-black text-3xl text-center mb-2">Full feature comparison</h2>
            <p className="text-gray-500 text-center text-sm mb-8">✓ = included &nbsp;·&nbsp; ✕ = not available &nbsp;·&nbsp; ~ = partial / extra cost</p>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm min-w-[720px]">
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
                    <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
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
                      { label: '$97/mo',  highlight: true  },
                      { label: '$49/mo',  highlight: false },
                      { label: '$49/mo',  highlight: false },
                      { label: '$149/mo', highlight: false },
                      { label: '$15K/yr', highlight: false },
                      { label: '$49/mo',  highlight: false },
                      { label: '$99/mo',  highlight: false },
                    ].map((p, i) => (
                      <td key={i} className={`p-4 text-center font-bold text-sm ${p.highlight ? 'text-purple-300 bg-purple-500/10' : 'text-gray-400'}`}>
                        {p.label}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-gray-600 text-xs text-center mt-3">Prices and features verified March 2026. Competitor features subject to change.</p>
          </motion.div>
        </section>

        {/* Per-competitor deep-dive */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-white font-black text-3xl text-center mb-2">
            CabinMind vs. the alternatives
          </motion.h2>
          <p className="text-gray-500 text-center text-sm mb-10">The honest breakdown — where they win, where we win.</p>
          <div className="space-y-4">
            {COMPETITORS.map((comp, i) => (
              <motion.div key={comp.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border ${comp.color} overflow-hidden`}>
                <button className="w-full p-5 flex items-center gap-4 text-left" onClick={() => setActiveComp(activeComp === comp.id ? null : comp.id)}>
                  <span className="text-3xl flex-shrink-0">{comp.logo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-white font-bold text-lg">{comp.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${comp.color} ${comp.textColor} font-medium`}>{comp.price}</span>
                      {comp.annualLock && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">Annual contract required</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">{comp.tagline}</p>
                  </div>
                  <span className="text-gray-600 text-sm flex-shrink-0">{activeComp === comp.id ? '▲' : '▼'}</span>
                </button>
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
                      <Link href="/demo" className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition-all">
                        Try Free Demo →
                      </Link>
                      <Link href="/pricing" className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/10 transition-all">
                        See Pricing
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Price calculator */}
        <section className="max-w-3xl mx-auto px-4 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <PriceCalculator />
          </motion.div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-3xl mx-auto px-4 pb-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-gradient-to-br from-purple-900/40 to-violet-900/30 border border-purple-500/30 rounded-3xl p-10 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-white font-black text-3xl sm:text-4xl mb-3">Ready to replace your entire stack?</h2>
              <p className="text-gray-300 text-lg mb-6 max-w-xl mx-auto leading-relaxed">
                5 free leads, no credit card. See exactly what CabinMind finds for your ICP before you spend a dollar.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/demo" className="px-10 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-purple-500/30">
                  Try Free Demo — No Card
                </Link>
                <button onClick={() => handleCheckout('lead-starter')} disabled={!!checkoutLoading}
                  className="px-10 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-lg hover:bg-white/15 transition-all disabled:opacity-50">
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
