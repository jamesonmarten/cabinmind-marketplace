/**
 * /pricing — CabinMind AI Agent Marketplace
 *
 * Pricing strategy (repositioned to market rate):
 *   Starter  $49/mo  — Platform keys, 100 leads/mo      (you pay ~$2/mo → 96% margin)
 *   Pro      $149/mo — Client brings Hunter key; platform ZB (99% margin)
 *   Scale    $299/mo — Full BYOK; unlimited              (100% margin)
 *   Agency   $599/mo — Full BYOK, 5 seats, white-label  (100% margin)
 *
 * Competitive context:
 *   Clay $149–800 · Apollo $99–199 · Seamless $147–397 · Instantly $97–358
 *
 * Other 4 agents — repriced to reflect value:
 *   Website Auditor $29 · Blog Writer $49 · Receptionist $79 · Sales Assistant $99
 */
import Layout from '../components/Layout';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useCheckout } from '../hooks/useCheckout';

// ─── Lead Researcher tiers ────────────────────────────────────────────────────

const LEAD_TIERS = [
  {
    id: 'lead-starter',
    name: 'Starter',
    price: 49,
    badge: null,
    color: 'border-white/10',
    btnClass: 'glass border border-white/10 text-white hover:border-brand-400/40 hover:text-brand-300',
    leadsPerMonth: 100,
    hunterPlan: 'Platform key (shared)',
    zbPlan: 'Platform key (shared)',
    byok: false,
    desc: 'Get started with AI prospecting — no API accounts needed. Cancel anytime.',
    features: [
      '100 verified leads / month',
      'ZeroBounce email validation ✅',
      'A–D ICP scoring on 8 signals',
      'Direct LinkedIn /in/ profiles',
      'CSV + HubSpot export',
      'Platform API keys included',
      'Email support',
    ],
    apiNote: null,
    costNote: 'All-inclusive. No Hunter or ZeroBounce account needed.',
  },
  {
    id: 'lead-pro',
    name: 'Pro',
    price: 149,
    badge: 'Most Popular',
    color: 'border-brand-500/50 shadow-2xl shadow-brand-500/20',
    btnClass: 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/30 hover:opacity-90',
    leadsPerMonth: 500,
    hunterPlan: 'Your Hunter.io Starter ($49/mo)',
    zbPlan: 'Platform ZeroBounce key',
    byok: 'hunter',
    desc: 'Serious outbound teams who need verified decision-makers at real scale.',
    features: [
      '500 verified leads / month',
      'Bring your own Hunter.io key 🔑',
      'ZeroBounce platform key included',
      'Full 6-layer email validation',
      'A–D ICP scoring on 8 signals',
      'Direct LinkedIn /in/ profiles',
      'Multi-ICP saved templates',
      'CSV + HubSpot + Airtable export',
      'Priority support',
    ],
    apiNote: 'Requires Hunter.io Starter ($49/mo). You own the quota.',
    costNote: 'CabinMind $149 + Hunter $49 = $198/mo for 500 leads — $0.40/lead vs $18.50 manual.',
  },
  {
    id: 'lead-scale',
    name: 'Scale',
    price: 299,
    badge: 'Best Value',
    color: 'border-purple-500/40',
    btnClass: 'glass border border-purple-500/40 text-purple-300 hover:bg-purple-500/10',
    leadsPerMonth: 'Unlimited',
    hunterPlan: 'Your Hunter.io key (any plan)',
    zbPlan: 'Your ZeroBounce key (any plan)',
    byok: 'both',
    desc: 'Unlimited generation — your quota, your spend, your pipeline velocity.',
    features: [
      'Unlimited lead batches',
      'Bring your own Hunter.io key 🔑',
      'Bring your own ZeroBounce key 🔑',
      'Full 6-layer email validation',
      'A–D ICP scoring on 8 signals',
      'Direct LinkedIn /in/ profiles',
      'Multi-ICP saved templates',
      'CSV + HubSpot + Airtable export',
      'Slack support + onboarding call',
    ],
    apiNote: 'Hunter Growth $99/mo (2K searches) + ZeroBounce $25/mo (5K) = $124/mo in APIs.',
    costNote: 'CabinMind $299 + ~$124 APIs = $423/mo unlimited — vs $18.50/lead manual.',
  },
  {
    id: 'lead-agency',
    name: 'Agency',
    price: 599,
    badge: 'White-Label',
    color: 'border-violet-500/40',
    btnClass: 'glass border border-violet-500/40 text-violet-300 hover:bg-violet-500/10',
    leadsPerMonth: 'Unlimited',
    hunterPlan: 'Your Hunter.io key (any plan)',
    zbPlan: 'Your ZeroBounce key (any plan)',
    byok: 'both',
    desc: 'Run AI lead gen as a productised service. Charge clients at any margin.',
    features: [
      'Everything in Scale',
      '5 sub-account seats',
      'White-label dashboard & reports',
      'Per-client ICP templates',
      'Client-facing PDF exports',
      'API access for custom integrations',
      'Dedicated onboarding call',
      'SLA-backed priority support',
    ],
    apiNote: 'Bring your own keys — or bill API costs directly to each client.',
    costNote: 'One subscription, unlimited client campaigns. Resell at any margin you choose.',
  },
];

// ─── Other agents (flat, no external API cost) ────────────────────────────────

const OTHER_PLANS = [
  {
    id: 'website-audit',
    icon: '📈',
    name: 'AI Website Auditor',
    price: 29,
    desc: 'Full SEO & Core Web Vitals audit on demand. Outrank competitors.',
    features: ['Unlimited audits', 'Core Web Vitals report', 'SEO scorecard + fixes', 'PDF export', 'Competitor comparison'],
    highlight: false,
  },
  {
    id: 'blog-writer',
    icon: '✍️',
    name: 'AI Blog Writer',
    price: 49,
    desc: 'SEO-optimised long-form articles published on autopilot every week.',
    features: ['20 articles / month', 'Keyword research included', 'WordPress auto-publish', '2,400-word output', 'SEO meta generation'],
    highlight: false,
  },
  {
    id: 'receptionist',
    icon: '🤖',
    name: 'AI Receptionist',
    price: 79,
    desc: 'Answers every visitor, qualifies every lead, books meetings — 24/7.',
    features: ['Unlimited conversations', 'Lead qualification flows', 'Appointment booking', 'CRM push', 'Custom persona & tone'],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'sales-assistant',
    icon: '💼',
    name: 'AI Sales Assistant',
    price: 99,
    desc: 'Personalised multi-step outreach sequences that actually convert.',
    features: ['500 prospects / month', '5-step follow-up sequences', 'CRM auto-logging', 'Reply detection', 'Open-rate analytics'],
    highlight: false,
  },
];

const FAQ = [
  {
    q: 'Why do some plans require my own API keys?',
    a: "Hunter.io and ZeroBounce charge per search/validation. Rather than marking up those costs and burying them in your subscription, we let you control your own quota directly — you pay the API providers at their published rates, and CabinMind charges only for the AI orchestration layer. It's transparent, scalable, and typically 3–5× cheaper than bundled alternatives like Apollo or Seamless.",
  },
  {
    q: 'What does BYOK (Bring Your Own Key) mean in practice?',
    a: "You create a free Hunter.io and/or ZeroBounce account, copy your API key, and paste it into your CabinMind dashboard under the API Keys tab. We store it in your browser session and use it only when you run lead searches — never shared, never used for other customers.",
  },
  {
    q: 'Which Hunter.io plan do I need?',
    a: "For Pro (500 leads/mo): Hunter Starter at $49/mo gives you 500 domain searches. For Scale/Agency (unlimited): Hunter Growth at $99/mo gives 2,000 searches. Hunter's free tier (25 searches/mo) covers testing only.",
  },
  {
    q: 'Which ZeroBounce plan do I need?',
    a: "ZeroBounce charges per validation credit. For 500 leads/mo the $16 pay-as-you-go pack (2,000 credits) covers it. For unlimited runs: $25/mo (5,000 credits) or $49/mo (10,000 credits). Free tier = 100 credits/mo — enough for testing.",
  },
  {
    q: 'How does this compare to Apollo or Clay?',
    a: "Apollo charges $99–$199/mo for bundled, often stale data with no transparency. Clay charges $149–$800/mo. CabinMind uses live Hunter.io data (updated daily) + ZeroBounce validation on every email — and shows you exactly which 8 signals drove each score. You get higher quality, full auditability, and you own your own API quota.",
  },
  {
    q: 'Can I start on Starter and upgrade later?',
    a: 'Yes — upgrade anytime from your billing portal. Your saved ICP templates and lead history carry over.',
  },
  {
    q: 'What happens if I hit my Hunter quota mid-month?',
    a: "The agent automatically falls back to AI-synthesised contacts with pattern emails. Those leads are clearly labelled 'AI pattern' vs. 'Hunter verified' in your dashboard. ZeroBounce validation still runs as normal.",
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — all plans are month-to-month. Cancel from your billing portal with one click, no questions asked.',
  },
  {
    q: 'Do you offer agency or reseller pricing?',
    a: "The Agency plan ($599/mo) is built for exactly that — 5 seats, white-label reports, per-client ICP templates. Email support@devcabin.tech to discuss volume deals for high-seat counts.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function BYOKBadge({ type }) {
  if (!type) return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-medium">
      ✅ All keys included
    </span>
  );
  if (type === 'hunter') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-medium">
      🔑 Bring Hunter key
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-medium">
      🔑 Bring Hunter + ZeroBounce keys
    </span>
  );
}

function LeadTierCard({ tier, index, onCheckout, checkoutLoading }) {
  const [showApiNote, setShowApiNote] = useState(false);
  const isPopular = tier.badge === 'Most Popular';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative flex flex-col rounded-2xl p-7 border transition-all ${tier.color} ${isPopular ? 'bg-gradient-to-b from-brand-900/60 to-purple-900/40 scale-[1.03]' : 'glass'}`}
    >
      {tier.badge && (
        <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg whitespace-nowrap ${
          tier.badge === 'Most Popular' ? 'bg-gradient-to-r from-brand-500 to-purple-600' :
          tier.badge === 'Best Value'   ? 'bg-gradient-to-r from-purple-600 to-violet-500' :
                                         'bg-gradient-to-r from-violet-600 to-fuchsia-500'
        }`}>
          {tier.badge}
        </div>
      )}

      <div className="mb-5">
        <div className="text-2xl mb-1">🔎</div>
        <h3 className="text-white font-black text-xl">Lead Researcher — {tier.name}</h3>
        <p className="text-gray-400 text-sm mt-1 leading-relaxed">{tier.desc}</p>
      </div>

      <div className="flex items-end gap-1 mb-1">
        <span className="text-5xl font-black text-white">${tier.price}</span>
        <span className="text-gray-500 text-sm mb-1">/month</span>
      </div>
      <div className="text-xs text-gray-500 mb-5">CabinMind subscription only</div>

      <div className="mb-5">
        <BYOKBadge type={tier.byok} />
      </div>

      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5">
        <span className="text-gray-400 text-sm">Leads / month</span>
        <span className={`font-black text-lg ${tier.leadsPerMonth === 'Unlimited' ? 'text-green-400' : 'text-white'}`}>
          {tier.leadsPerMonth === 'Unlimited' ? '♾ Unlimited' : tier.leadsPerMonth.toLocaleString()}
        </span>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
            <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {tier.apiNote && (
        <div className="mb-4">
          <button
            onClick={() => setShowApiNote(!showApiNote)}
            className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors flex items-center gap-1"
          >
            {showApiNote ? '▲' : '▼'} What does this cost in total?
          </button>
          <AnimatePresence>
            {showApiNote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-xl p-3 leading-relaxed"
              >
                <div className="text-amber-400 font-semibold mb-1">🔑 Required API accounts:</div>
                <div className="mb-1"><span className="text-gray-300">Hunter.io:</span> {tier.hunterPlan}</div>
                <div className="mb-2"><span className="text-gray-300">ZeroBounce:</span> {tier.zbPlan}</div>
                <div className="border-t border-white/10 pt-2 text-gray-300">{tier.costNote}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!tier.apiNote && (
        <div className="mb-4 text-xs text-green-400/70">{tier.costNote}</div>
      )}

      <button
        onClick={() => onCheckout(tier.id)}
        disabled={checkoutLoading === tier.id}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${tier.btnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {checkoutLoading === tier.id ? 'Redirecting…' : `Get ${tier.name} →`}
      </button>
      <Link href="/agents/lead-researcher" className="block text-center text-gray-500 hover:text-brand-300 text-xs mt-3 transition-colors">
        Try free demo first
      </Link>
    </motion.div>
  );
}

function OtherPlanCard({ plan, index, onCheckout, checkoutLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className={`relative flex flex-col rounded-2xl p-6 border transition-all group ${
        plan.highlight
          ? 'bg-gradient-to-b from-brand-900/60 to-purple-900/40 border-brand-500/50 shadow-2xl shadow-brand-500/20 scale-[1.02]'
          : 'glass border-white/10 hover:border-brand-400/30'
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
          {plan.badge}
        </div>
      )}
      <div className="text-3xl mb-3">{plan.icon}</div>
      <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">{plan.desc}</p>
      <div className="flex items-end gap-1 mb-5">
        <span className="text-3xl font-black text-white">${plan.price}</span>
        <span className="text-gray-500 text-sm mb-0.5">/month</span>
      </div>
      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
            <span className="text-green-400 text-xs">✓</span> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onCheckout(plan.id)}
        disabled={checkoutLoading === plan.id}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
          plan.highlight
            ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/30 hover:opacity-90'
            : 'glass border border-white/10 text-white hover:border-brand-400/40 hover:text-brand-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {checkoutLoading === plan.id ? 'Redirecting…' : 'Subscribe →'}
      </button>
      <Link href={`/agents/${plan.id}`} className="block text-center text-gray-500 hover:text-brand-300 text-xs mt-3 transition-colors">
        See live demo first
      </Link>
    </motion.div>
  );
}

function FaqItem({ q, a, index }) {
  return (
    <motion.details
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group glass border border-white/10 rounded-xl p-5 cursor-pointer hover:border-brand-400/30 transition-all"
    >
      <summary className="flex justify-between items-center text-white font-semibold text-sm list-none select-none">
        {q}
        <span className="text-brand-400 text-lg ml-4 group-open:rotate-45 transition-transform duration-200 flex-shrink-0">+</span>
      </summary>
      <p className="mt-3 text-gray-400 text-sm leading-relaxed">{a}</p>
    </motion.details>
  );
}

function CostTransparencySection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12 max-w-4xl mx-auto"
    >
      <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-500/25 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <div className="text-3xl flex-shrink-0">💡</div>
          <div className="flex-1">
            <h3 className="text-white font-black text-lg mb-2">Why BYOK? Full transparency on API costs.</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-5">
              Hunter.io and ZeroBounce charge per search/validation. Rather than hiding those costs
              in an inflated subscription, we let you control your own quota — you pay the API
              providers directly at their published rates. CabinMind charges only for the AI
              orchestration engine that ties it all together.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  icon: '🟢',
                  label: 'Starter $49/mo',
                  sub: 'Platform keys included',
                  detail: '100 leads/mo · ~$2 in API costs absorbed by us',
                  color: 'border-green-500/30 bg-green-500/5',
                },
                {
                  icon: '🔵',
                  label: 'Pro $149/mo',
                  sub: 'Bring your Hunter key',
                  detail: '500 leads/mo · You pay Hunter $49/mo directly',
                  color: 'border-blue-500/30 bg-blue-500/5',
                },
                {
                  icon: '🟣',
                  label: 'Scale/Agency',
                  sub: 'Bring Hunter + ZeroBounce',
                  detail: 'Unlimited · You control your quota and spend',
                  color: 'border-purple-500/30 bg-purple-500/5',
                },
              ].map((item, i) => (
                <div key={i} className={`border rounded-xl p-4 ${item.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{item.icon}</span>
                    <span className="text-white font-bold text-sm">{item.label}</span>
                  </div>
                  <div className="text-gray-300 text-xs font-semibold mb-1">{item.sub}</div>
                  <div className="text-gray-500 text-xs">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ApiAccountsSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-8 max-w-4xl mx-auto"
    >
      <div className="glass border border-white/10 rounded-2xl p-8">
        <h3 className="text-white font-black text-lg mb-2 text-center">Get your API keys in 5 minutes</h3>
        <p className="text-gray-400 text-sm text-center mb-8">Both services have generous free tiers — test before you pay.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Hunter */}
          <div className="bg-white/4 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl">🎯</div>
              <div>
                <div className="text-white font-bold">Hunter.io</div>
                <div className="text-gray-400 text-xs">Email finder & verifier</div>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-400 mb-4">
              <div className="flex justify-between"><span>Free tier</span><span className="text-gray-200">25 searches/mo</span></div>
              <div className="flex justify-between"><span>Starter</span><span className="text-gray-200">$49/mo — 500 searches</span></div>
              <div className="flex justify-between"><span>Growth</span><span className="text-gray-200">$99/mo — 2,000 searches</span></div>
              <div className="flex justify-between"><span>Business</span><span className="text-gray-200">$199/mo — 5,000 searches</span></div>
            </div>
            <a href="https://hunter.io/users/sign_up" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-semibold hover:bg-orange-500/25 transition-colors">
              Create Hunter account →
            </a>
          </div>

          {/* ZeroBounce */}
          <div className="bg-white/4 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl">🛡️</div>
              <div>
                <div className="text-white font-bold">ZeroBounce</div>
                <div className="text-gray-400 text-xs">Email validation & spam-trap detection</div>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-400 mb-4">
              <div className="flex justify-between"><span>Free tier</span><span className="text-gray-200">100 validations/mo</span></div>
              <div className="flex justify-between"><span>Pay-as-you-go</span><span className="text-gray-200">$16 / 2,000 credits</span></div>
              <div className="flex justify-between"><span>Monthly</span><span className="text-gray-200">$25/mo — 5,000 credits</span></div>
              <div className="flex justify-between"><span>Monthly</span><span className="text-gray-200">$49/mo — 10,000 credits</span></div>
            </div>
            <a href="https://www.zerobounce.net/members/sign-up" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/25 transition-colors">
              Create ZeroBounce account →
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { handleCheckout, loading: checkoutLoading } = useCheckout();
  const [activeTab, setActiveTab] = useState('leads');

  return (
    <Layout title="Pricing – CabinMind AI Agents">
      {/* Hero */}
      <div className="relative overflow-hidden pt-32 pb-16 px-4">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-600 rounded-full blur-3xl opacity-10 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-gray-300 mb-6 border border-brand-400/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Month-to-month · Cancel anytime · No hidden API markups
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-4">
            Transparent, <span className="gradient-text">honest</span> pricing
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            You pay CabinMind for AI orchestration. For lead generation, you control your own
            Hunter.io and ZeroBounce accounts — no markups, no hidden quotas, no bill shock.
          </p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

        {/* Tab switcher */}
        <div className="flex justify-center mb-12">
          <div className="glass border border-white/10 rounded-2xl p-1.5 flex gap-1">
            <button onClick={() => setActiveTab('leads')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'leads' ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}>
              🔎 AI Lead Researcher
            </button>
            <button onClick={() => setActiveTab('other')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'other' ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}>
              🤖 Other AI Agents
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'leads' && (
            <motion.div key="leads" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-10">
                <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">AI Lead Researcher</div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Choose your scale</h2>
                <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
                  Same AI pipeline on every plan. The difference is whose API quota powers it
                  and how many leads you generate per month.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 items-start">
                {LEAD_TIERS.map((tier, i) => (
                  <LeadTierCard key={tier.id} tier={tier} index={i} onCheckout={handleCheckout} checkoutLoading={checkoutLoading} />
                ))}
              </div>
              <CostTransparencySection />
              <ApiAccountsSection />
            </motion.div>
          )}

          {activeTab === 'other' && (
            <motion.div key="other" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-10">
                <div className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Other AI Agents</div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Flat-rate agents</h2>
                <p className="text-gray-400 max-w-xl mx-auto text-sm">
                  These agents run entirely on CabinMind infrastructure — no external API accounts required.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-start max-w-5xl mx-auto">
                {OTHER_PLANS.map((plan, i) => (
                  <OtherPlanCard key={plan.id} plan={plan} index={i} onCheckout={handleCheckout} checkoutLoading={checkoutLoading} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Money-back guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 glass border border-green-400/20 rounded-2xl p-8 text-center max-w-2xl mx-auto"
        >
          <div className="text-4xl mb-3">🛡️</div>
          <h3 className="text-white font-bold text-xl mb-2">14-Day Money-Back Guarantee</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Not satisfied in your first 14 days? Email us for a full refund on your CabinMind
            subscription — no questions asked. API costs paid directly to Hunter/ZeroBounce
            are refunded per their own policies.
          </p>
        </motion.div>

        {/* FAQ */}
        <div className="mt-24 max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-black text-white text-center mb-10"
          >
            Frequently asked questions
          </motion.h2>
          <div className="space-y-3">
            {FAQ.map((faq, i) => <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />)}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center"
        >
          <h2 className="text-3xl font-black text-white mb-4">Not sure which plan is right?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Try the live demo — no account required. See real leads generated from your ICP
            in under 30 seconds before you commit to anything.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-500/30">
              🔎 Try Free Demo →
            </Link>
            <Link href="/agents"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl glass border border-white/15 text-white font-bold text-lg hover:border-brand-400/40 transition-all">
              Browse All Agents →
            </Link>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
