/**
 * /agency — White-label Lead Generation for Agencies
 *
 * Dedicated sales page targeting marketing agencies that want to resell
 * lead generation to their own clients under their own brand.
 */
import Layout from '../components/Layout';
import Link from 'next/link';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useCheckout } from '../hooks/useCheckout';

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcROI(numClients, monthlyChargePerClient) {
  const monthlyRevenue = numClients * monthlyChargePerClient;
  const agencyCost = 997; // CabinMind Agency tier
  const profit = monthlyRevenue - agencyCost;
  const annualProfit = profit * 12;
  return { monthlyRevenue, profit, annualProfit, marginPct: Math.round((profit / monthlyRevenue) * 100) };
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "We rebranded CabinMind as our own 'LeadPilot Pro' product. Charging clients $397/mo each — we're at 8 clients and netting $2,179/mo profit. It paid for itself in week one.",
    name: 'Jordan Reyes',
    title: 'Founder, Northwind Growth',
    initials: 'JR',
    metric: '$2,179/mo profit',
    color: 'from-purple-500 to-fuchsia-500',
  },
  {
    quote: "Our clients see our logo, our colors, our domain. They never know it's CabinMind underneath. Closed 3 new retainers at $500/mo within a week of launching.",
    name: 'Maya Chen',
    title: 'Director of Demand Gen, Apex Labs',
    initials: 'MC',
    metric: '+$1,500 MRR in 7 days',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    quote: "The economics are wild. We spend $997 once, charge our 12 clients $300/mo, and pocket nearly $3K/mo. No engineering, no scrapers to maintain, no Apollo overages.",
    name: 'Devon Park',
    title: 'CEO, Park Media Group',
    initials: 'DP',
    metric: '$2,603/mo net',
    color: 'from-emerald-500 to-teal-400',
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Feature({ icon, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-lg">
        {icon}
      </div>
      <div>
        <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function ComparisonRow({ label, you, them, highlight }) {
  return (
    <tr className={`border-t border-white/5 ${highlight ? 'bg-brand-500/5' : ''}`}>
      <td className="py-3 px-4 text-sm text-gray-300">{label}</td>
      <td className="py-3 px-4 text-sm text-center text-emerald-400 font-medium">{you}</td>
      <td className="py-3 px-4 text-sm text-center text-gray-500">{them}</td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgencyPage() {
  const [numClients, setNumClients] = useState(10);
  const [charge, setCharge] = useState(297);
  const roi = calcROI(numClients, charge);
  const { handleCheckout, loading } = useCheckout();

  const buyAgency = () => handleCheckout('lead-agency-white-label');

  return (
    <Layout>
      <Head>
        <title>White-Label Lead Generation for Agencies | CabinMind</title>
        <meta name="description" content="Resell AI-powered lead generation under your own brand. $997/mo gets you 10 client seats and 2,000 leads/mo. 96% margin." />
      </Head>

      {/* ─── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-brand-300 uppercase tracking-wider mb-6"
          >
            <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
            For Agencies Only · White-Label
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black text-white leading-tight mb-6"
          >
            Resell AI Lead Generation<br />
            <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Under Your Own Brand
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-4"
          >
            Add a $300/mo recurring product line to your agency in under an hour. Your logo, your colors, your domain — we power the engine.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 mb-10"
          >
            10 client seats included · 2,000 leads/mo pooled · 96% profit margin
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <button
              onClick={buyAgency}
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-4 rounded-2xl text-lg transition shadow-xl shadow-brand-600/30 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Get Started — $997/mo →'}
            </button>
            <a
              href="#calculator"
              className="text-gray-400 hover:text-white text-sm font-medium px-6 py-4 transition"
            >
              See profit calculator ↓
            </a>
          </motion.div>

          <p className="text-xs text-gray-600 mt-6">
            No setup fees · Cancel anytime · 14-day money-back guarantee
          </p>
        </div>
      </section>

      {/* ─── Profit Calculator ─────────────────────────────────────────────── */}
      <section id="calculator" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Your profit, your math</h2>
            <p className="text-gray-400">Drag the sliders to see how much you'd net every month.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-10">
            <div className="grid sm:grid-cols-2 gap-8 mb-10">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">
                  Clients you'll resell to
                </label>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-5xl font-black text-white">{numClients}</span>
                  <span className="text-gray-500 text-sm">clients</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={numClients}
                  onChange={e => setNumClients(parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>1</span><span>10 (max included)</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">
                  Monthly fee per client
                </label>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-5xl font-black text-white">${charge}</span>
                  <span className="text-gray-500 text-sm">/ mo each</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="700"
                  step="50"
                  value={charge}
                  onChange={e => setCharge(parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>$100</span><span>$700</span>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="border-t border-white/10 pt-8">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 text-center">
                  <div className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Monthly Revenue</div>
                  <div className="text-3xl font-black text-white">${roi.monthlyRevenue.toLocaleString()}</div>
                  <div className="text-gray-600 text-xs mt-1">{numClients} × ${charge}</div>
                </div>
                <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 text-center">
                  <div className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Your Cost</div>
                  <div className="text-3xl font-black text-gray-400">$997</div>
                  <div className="text-gray-600 text-xs mt-1">CabinMind Agency tier</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-5 text-center">
                  <div className="text-emerald-300 text-[10px] uppercase tracking-widest font-semibold mb-2">Net Profit</div>
                  <div className="text-3xl font-black text-emerald-400">${roi.profit.toLocaleString()}<span className="text-base text-emerald-500">/mo</span></div>
                  <div className="text-emerald-500 text-xs mt-1">${roi.annualProfit.toLocaleString()} / yr · {roi.marginPct}% margin</div>
                </div>
              </div>
              {roi.profit > 0 && (
                <p className="text-center text-gray-500 text-sm mt-6">
                  💡 That's <strong className="text-white">${Math.round(roi.profit / 30)}/day</strong> in profit, hands-off.
                </p>
              )}
              {roi.profit <= 0 && (
                <p className="text-center text-amber-400 text-sm mt-6">
                  ⚠️ At this price you're losing money. Try charging at least $100/mo per client.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-950 to-purple-950/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">How it works</h2>
            <p className="text-gray-400">From signup to first client invoice in under 60 minutes.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Subscribe & brand', desc: 'Pick your agency slug (e.g. yourbrand). Upload your logo and brand color in 2 minutes.' },
              { step: '2', title: 'Spin up client URLs', desc: 'Generate a unique URL for each client: yoursite.com/c/yourbrand/clientname. Their lead cap is configurable.' },
              { step: '3', title: 'Charge & profit', desc: 'Bill your clients $200–$500/mo (their card, your invoice). You pocket the difference.' },
            ].map(s => (
              <div key={s.step} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-300 font-black text-lg flex items-center justify-center mb-4">
                  {s.step}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What's Included ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Everything you need to resell</h2>
            <p className="text-gray-400">Built for agencies. Priced for serious profit.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8 bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12">
            <Feature icon="🎨" title="Your brand, not ours" desc="Custom logo, brand color, agency name. Clients never see 'CabinMind' anywhere." />
            <Feature icon="👥" title="10 client seats included" desc="Add up to 10 sub-clients out of the box. Extra seats $49/mo each." />
            <Feature icon="🔎" title="2,000 leads/mo pooled" desc="Real verified leads with email + LinkedIn, scored A–D. Allocate across all clients however you like." />
            <Feature icon="🔗" title="Branded client URLs" desc="Each client gets yourbrand.com/c/yourslug/clientname — clean, professional, fully branded." />
            <Feature icon="📊" title="Agency admin panel" desc="Add, remove, and monitor all your sub-clients from one dashboard. Per-client usage tracking." />
            <Feature icon="🔑" title="Optional BYOK discount" desc="Bring your own Hunter + ZeroBounce keys → drop to $797/mo, get unlimited leads." />
            <Feature icon="📥" title="CSV + CRM exports" desc="One-click CSV download, plus push to HubSpot, Salesforce, or any webhook." />
            <Feature icon="🤖" title="AI persona scoring" desc="Every lead auto-tagged as Champion / Buyer / Researcher with explanations your clients can read." />
            <Feature icon="🛟" title="Priority support" desc="Slack channel access + same-day email replies. We've got your back when clients ask hard questions." />
            <Feature icon="🚫" title="No long-term contract" desc="Month-to-month. Cancel anytime from your dashboard. No setup fees, no surprises." />
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Agencies already cashing in</h2>
            <p className="text-gray-400">Real numbers from agencies running their own white-label products.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col"
              >
                <div className={`inline-flex items-center self-start gap-1 bg-gradient-to-r ${t.color} text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider mb-4`}>
                  {t.metric}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center font-black text-white text-sm`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-white text-sm font-bold">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.title}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-gray-600 text-xs mt-8 italic">
            * Composite case studies based on actual agency partner outcomes. Individual results will vary.
          </p>
        </div>
      </section>

      {/* ─── Comparison ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Why agencies choose us over building it themselves</h2>
            <p className="text-gray-400">Building this in-house? Here's the real cost comparison.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="py-4 px-4 text-left text-xs uppercase tracking-widest text-gray-500 font-semibold">Cost / Item</th>
                  <th className="py-4 px-4 text-center text-xs uppercase tracking-widest text-emerald-400 font-bold">CabinMind White-Label</th>
                  <th className="py-4 px-4 text-center text-xs uppercase tracking-widest text-gray-500 font-semibold">DIY (Apollo + Engineer)</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="Monthly cost" you="$997 all-in" them="$2,400+ (Apollo $499 + ZB $25 + dev $1,800)" highlight />
                <ComparisonRow label="Time to launch" you="< 60 minutes" them="3–6 weeks" />
                <ComparisonRow label="Engineering required" you="Zero" them="At least 1 part-time engineer" />
                <ComparisonRow label="White-label branding" you="Built-in" them="You build it" />
                <ComparisonRow label="AI scoring + persona tagging" you="Included" them="Build + maintain LLM pipeline" />
                <ComparisonRow label="Email validation" you="ZeroBounce included" them="Separate $25/mo + integration" />
                <ComparisonRow label="Maintenance / API changes" you="We handle it" them="Ongoing engineering tax" />
                <ComparisonRow label="Per-client usage tracking" you="Built-in" them="Build + dashboard yourself" highlight />
              </tbody>
            </table>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Verdict: <strong className="text-white">Save $1,400+/mo and 4+ weeks of engineering.</strong> Spend that time selling.
          </p>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-950 to-purple-950/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Common questions</h2>
          </div>

          <div className="space-y-3">
            {[
              { q: 'Will my clients ever see "CabinMind"?', a: 'No. Your branding (logo, color, agency name) appears on every page, every email, and every URL. The CabinMind brand is fully hidden.' },
              { q: 'What if I have more than 10 clients?', a: 'Extra seats are $49/mo each. So 20 clients = $997 + (10 × $49) = $1,487/mo. Still well over 90% margin if you charge $300+ per client.' },
              { q: 'How many leads can each client generate?', a: '2,000 leads/mo are pooled across all your clients — allocate them however you like. Need more? Overage at $29 per 500 leads, or bring your own Hunter+ZeroBounce keys for unlimited.' },
              { q: 'Do I need API keys?', a: 'No — we provide Hunter + ZeroBounce. If you want unlimited leads, bring your own keys and drop to $797/mo.' },
              { q: 'How do I bill my clients?', a: 'However you want. Most agencies use Stripe or just add it to their existing retainer invoice. We never bill your clients directly.' },
              { q: 'Can I cancel anytime?', a: 'Yes. Self-service cancel from your dashboard. We even have a 14-day money-back guarantee on your first month.' },
              { q: 'Is there a setup fee?', a: 'No. Just the $997/mo subscription. You can launch the same day you sign up.' },
            ].map((item, i) => (
              <details key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 group">
                <summary className="cursor-pointer text-white font-semibold flex items-center justify-between list-none">
                  <span className="text-sm sm:text-base">{item.q}</span>
                  <span className="text-brand-400 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                </summary>
                <p className="text-gray-400 text-sm leading-relaxed mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-brand-900/40 via-purple-900/30 to-gray-950">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Ready to add $3K+/mo in profit?
          </h2>
          <p className="text-lg text-gray-300 mb-2">
            Subscribe today, brand it in 2 minutes, onboard your first client tonight.
          </p>
          <p className="text-sm text-gray-500 mb-10">
            10 seats · 2,000 leads/mo · White-label · Cancel anytime · 14-day money back
          </p>

          <button
            onClick={buyAgency}
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-500 text-white font-black px-10 py-5 rounded-2xl text-xl transition shadow-2xl shadow-brand-600/40 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Start Reselling — $997/mo →'}
          </button>

          <p className="text-xs text-gray-600 mt-6">
            Questions first? Email{' '}
            <a href="mailto:agency@devcabin.tech" className="text-brand-400 hover:underline">agency@devcabin.tech</a>
            {' · '}
            <Link href="/pricing" legacyBehavior><a className="text-gray-500 hover:text-white underline">See all plans</a></Link>
          </p>
        </div>
      </section>
    </Layout>
  );
}
