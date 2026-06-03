/**
 * /pricing — CabinMind AI Agent Marketplace
 *
 * Pricing strategy:
 *   Starter  $100/mo — Platform keys, 100 leads/mo
 *   Pro      $250/mo — Client brings Hunter key; platform ZB
 *   Scale    $500/mo — Full BYOK; unlimited
 *   Agency   $1000/mo — Full BYOK, 5 seats, white-label
 *
 * Other agents:
 *   Website Auditor $50 · Blog Writer $50 · Receptionist $80 · Sales Assistant $100
 */
import Layout from '../components/Layout';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useCheckout } from '../hooks/useCheckout';

// ─── Data ─────────────────────────────────────────────────────────────────────

const LEAD_TIERS = [
  {
    id: 'lead-starter',
    name: 'Starter',
    price: 100,
    badge: null,
    color: 'border-white/10',
    btnClass: 'glass border border-white/10 text-white hover:border-brand-400/40 hover:text-brand-300',
    leadsPerMonth: 100,
    byok: false,
    desc: 'Try AI prospecting with zero setup. No API accounts needed — just subscribe and run.',
    whoIsThis: 'Solo founders and small teams just getting started with outbound.',
    features: [
      '100 verified leads / month',
      'ZeroBounce email validation',
      'A–D ICP scoring on 8 signals',
      'Direct LinkedIn /in/ profiles',
      '📣 Campaign Builder — bulk list validation',
      '📣 AI 4-step cold email sequences',
      '📣 Instantly.ai CSV export',
      'CSV + HubSpot export',
      'Email support',
    ],
    costBreakdown: [
      { label: 'CabinMind subscription', amount: '$100', included: true, note: 'you → us' },
      { label: 'Hunter.io (email finder)', amount: 'Included', included: true, note: 'we cover it' },
      { label: 'ZeroBounce (validation)', amount: 'Included', included: true, note: 'we cover it' },
    ],
    totalCost: '$100 / mo — all in',
    perLead: '$1.00 / lead',
    setupNote: null,
  },
  {
    id: 'lead-pro',
    name: 'Pro',
    price: 250,
    badge: 'Most Popular',
    color: 'border-brand-500/50 shadow-2xl shadow-brand-500/20',
    btnClass: 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/30 hover:opacity-90',
    leadsPerMonth: 500,
    byok: 'hunter',
    desc: 'Scale to 500 leads/mo. You own your Hunter quota — we handle everything else.',
    whoIsThis: 'Sales teams running consistent outbound at real volume.',
    features: [
      '500 verified leads / month',
      'Your Hunter.io key (you own the quota)',
      'ZeroBounce platform key included',
      'Full 6-layer email validation',
      'A–D ICP scoring on 8 signals',
      'Direct LinkedIn /in/ profiles',
      '📣 Campaign Builder — bulk list validation',
      '📣 AI 4-step cold email sequences',
      '📣 Instantly.ai CSV export',
      'Multi-ICP saved templates',
      'CSV + HubSpot + Airtable export',
      'Priority support',
    ],
    costBreakdown: [
      { label: 'CabinMind subscription', amount: '$250', included: true, note: 'you → us' },
      { label: 'Hunter.io Starter (500 searches)', amount: '$49', included: false, note: 'you → Hunter.io' },
      { label: 'ZeroBounce (email validation)', amount: 'Included', included: true, note: 'we cover it' },
    ],
    totalCost: '~$299 / mo total',
    perLead: '$0.60 / lead',
    setupNote: 'You need a Hunter.io account. Sign up free at hunter.io, then upgrade to their Starter plan ($49/mo) for 500 searches. Takes 5 minutes — paste your API key into your CabinMind dashboard under API Keys.',
  },
  {
    id: 'lead-scale',
    name: 'Scale',
    price: 500,
    badge: 'Best Value',
    color: 'border-purple-500/40',
    btnClass: 'glass border border-purple-500/40 text-purple-300 hover:bg-purple-500/10',
    leadsPerMonth: 'Unlimited',
    byok: 'both',
    desc: 'Unlimited leads on your own API quota. You control the spend — we run the engine.',
    whoIsThis: 'High-volume teams who want full control and zero per-lead markup.',
    features: [
      'Unlimited lead batches',
      'Your Hunter.io key (any plan)',
      'Your ZeroBounce key (any plan)',
      'Full 6-layer email validation',
      'A–D ICP scoring on 8 signals',
      'Direct LinkedIn /in/ profiles',
      '📣 Campaign Builder — bulk list validation',
      '📣 AI 4-step cold email sequences',
      '📣 Instantly.ai CSV export',
      'Multi-ICP saved templates',
      'CSV + HubSpot + Airtable export',
      'Slack support + onboarding call',
    ],
    costBreakdown: [
      { label: 'CabinMind subscription', amount: '$500', included: true, note: 'you → us' },
      { label: 'Hunter.io Growth (2,000 searches)', amount: '$99', included: false, note: 'you → Hunter.io' },
      { label: 'ZeroBounce (5,000 validations)', amount: '$25', included: false, note: 'you → ZeroBounce' },
    ],
    totalCost: '~$621 / mo total',
    perLead: 'Unlimited — your quota',
    setupNote: 'You need a Hunter.io account (any paid plan) and a ZeroBounce account ($25/mo for 5K validations). Both have free tiers — test first, then upgrade. Paste both API keys into your CabinMind dashboard.',
  },
  {
    id: 'lead-agency',
    name: 'Agency',
    price: 1000,
    badge: 'White-Label',
    color: 'border-violet-500/40',
    btnClass: 'glass border border-violet-500/40 text-violet-300 hover:bg-violet-500/10',
    leadsPerMonth: 'Unlimited',
    byok: 'both',
    desc: 'Run AI lead gen as a service. One subscription, unlimited clients, any margin you set.',
    whoIsThis: 'Agencies and consultants who productise lead gen for multiple clients.',
    features: [
      'Everything in Scale',
      '📣 Campaign Builder — bulk list validation',
      '📣 AI 4-step cold email sequences',
      '📣 Instantly.ai CSV export',
      '5 sub-account seats',
      'White-label dashboard & reports',
      'Per-client ICP templates',
      'Client-facing PDF exports',
      'API access for custom integrations',
      'Dedicated onboarding call',
      'SLA-backed priority support',
    ],
    costBreakdown: [
      { label: 'CabinMind subscription', amount: '$1000', included: true, note: 'you → us' },
      { label: 'Hunter.io (any plan)', amount: 'Your key', included: false, note: 'you → Hunter.io' },
      { label: 'ZeroBounce (any plan)', amount: 'Your key', included: false, note: 'you → ZeroBounce' },
    ],
    totalCost: 'You control API spend',
    perLead: 'Bill clients at any rate',
    setupNote: 'Bring your own Hunter.io and ZeroBounce keys — or bill each client for their own API accounts. Paste keys into your CabinMind dashboard; each seat can use its own key.',
  },
];

const OTHER_PLANS = [
  {
    id: 'website-audit',
    icon: '📈',
    name: 'AI Website Auditor',
    price: 50,
    desc: 'Full SEO & Core Web Vitals audit on demand. Outrank competitors.',
    features: ['Unlimited audits', 'Core Web Vitals report', 'SEO scorecard + fixes', 'PDF export', 'Competitor comparison'],
    highlight: false,
  },
  {
    id: 'blog-writer',
    icon: '✍️',
    name: 'AI Blog Writer',
    price: 50,
    desc: 'SEO-optimised long-form articles published on autopilot every week.',
    features: ['20 articles / month', 'Keyword research included', 'WordPress auto-publish', '2,400-word output', 'SEO meta generation'],
    highlight: false,
  },
  {
    id: 'receptionist',
    icon: '🤖',
    name: 'AI Receptionist',
    price: 80,
    desc: 'Answers every visitor, qualifies every lead, books meetings 24/7.',
    features: ['Unlimited conversations', 'Lead qualification flows', 'Appointment booking', 'CRM push', 'Custom persona & tone'],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'sales-assistant',
    icon: '💼',
    name: 'AI Sales Assistant',
    price: 100,
    desc: 'Personalised multi-step outreach sequences that actually convert.',
    features: ['500 prospects / month', '5-step follow-up sequences', 'CRM auto-logging', 'Reply detection', 'Open-rate analytics'],
    highlight: false,
  },
  {
    id: 'automation-expert',
    icon: '⚡',
    name: 'AI Automation Expert',
    price: 197,
    desc: 'Describe any workflow → importable blueprints for Zapier, Make, and n8n. Replaces a $200/hr automation consultant.',
    features: [
      '25 workflow generations / month',
      'Importable Make.com & n8n JSON',
      'Zapier step-by-step setup guides',
      'Webhook (cURL) + Python snippets',
      'Cost estimates per platform',
      'Auth + gotcha warnings',
      'Generation history saved',
    ],
    highlight: false,
    badge: 'New',
  },
];

const FAQ = [
  {
    q: 'What exactly is BYOK ("Bring Your Own Key")?',
    a: 'Two external services power the lead data: Hunter.io finds real email addresses at companies, and ZeroBounce checks those emails for spam traps, bounces, and invalid addresses. Both charge per search/validation. On Pro/Scale/Agency plans, you create your own account at those services, copy your API key, and paste it into your CabinMind dashboard under API Keys. CabinMind uses your key when running searches — so your quota and your spend are fully transparent. On Starter, we cover both for you (capped at 100 leads/mo).',
  },
  {
    q: 'Why not just bundle the API costs like Apollo or Clay?',
    a: "Apollo and Clay bundle API costs into their subscriptions and silently mark them up 3–10×. CabinMind keeps the charges separate so you see exactly what you pay for, can upgrade your API quota independently, and own your data. When you run more searches, we do not lose money — your quota is yours.",
  },
  {
    q: 'Which Hunter.io plan do I need?',
    a: "For Pro (500 leads/mo): Hunter Starter at $49/mo gives you exactly 500 domain searches. For Scale/Agency (unlimited runs): Hunter Growth at $99/mo gives 2,000 searches. Hunter free tier (25 searches/mo) is enough to test before committing.",
  },
  {
    q: 'Which ZeroBounce plan do I need?',
    a: "ZeroBounce charges per validation credit. For up to 500 leads/mo, the $16 pay-as-you-go pack (2,000 credits) is plenty. For high-volume: $25/mo (5,000 credits) or $49/mo (10,000 credits). Free tier = 100 credits/mo. On Starter and Pro plans we cover ZeroBounce for you.",
  },
  {
    q: 'What is the Campaign Builder?',
    a: "Campaign Builder is a built-in feature on all Lead Researcher plans. It has three parts: (1) ZeroBounce bulk validation — runs every email in your pipeline through ZeroBounce before you send, removing spam traps, bounces, and disposables to protect your sender reputation. (2) AI email sequences — picks any lead and generates a personalised 4-step cold email sequence (Day 0, 3, 7, 14) tailored to their pain points, buying signal, and ICP match. (3) Instantly.ai export — downloads a pre-formatted CSV with First Name, Last Name, Email, Company, Website, and a personalisation line ready to import directly into Instantly.ai campaigns.",
  },
  {
    q: 'Do I need an Instantly.ai account to use Campaign Builder?',
    a: "Instantly.ai ($37/mo) is the recommended cold email sending tool — it handles domain warmup, campaign scheduling, and reply detection. Campaign Builder exports the leads and writes the sequences; you import both into Instantly.ai to actually send. You can also paste the AI sequences into any other tool (Lemlist, Mailshake, Smartlead) — or even Gmail if you're just starting out.",
  },
  {
    a: "No — subscribe first, then add your keys in your dashboard under API Keys. Your welcome email includes step-by-step setup instructions. Hunter and ZeroBounce both have free tiers so you can test the keys before upgrading to a paid plan.",
  },
  {
    q: 'What happens if I hit my Hunter quota mid-month?',
    a: "The agent falls back to AI-synthesised contacts with pattern emails. Those leads are clearly labelled 'AI pattern' vs. 'Hunter verified' in your dashboard. ZeroBounce validation still runs on whatever email is found.",
  },
  {
    q: 'How does this compare to Apollo or Clay?',
    a: "Apollo charges $99-$199/mo for bundled, often stale data with no visibility into per-lead cost. Clay charges $149-$800/mo. CabinMind uses live Hunter.io data (updated daily) plus ZeroBounce validation on every email, and shows you the exact 8 signals driving each lead score. Higher quality, full auditability, and you own your quota.",
  },
  {
    q: 'Can I upgrade from Starter to Pro later?',
    a: 'Yes — upgrade anytime from your billing portal. Your saved ICP templates and lead history carry over to the new plan.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — all plans are month-to-month. Cancel from your billing portal with one click, no questions asked.',
  },
  {
    q: 'Do you offer agency or reseller pricing?',
    a: "The Agency plan ($1000/mo) is built for that — 5 seats, white-label reports, per-client ICP templates. Email support@devcabin.tech to discuss volume deals for higher seat counts.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function CostRow({ item }) {
  return (
    <div className={`flex items-center justify-between text-xs py-2 px-3 rounded-lg ${
      item.included
        ? 'bg-green-500/8 border border-green-500/15'
        : 'bg-amber-500/8 border border-amber-500/15'
    }`}>
      <span className={item.included ? 'text-gray-300' : 'text-gray-400'}>{item.label}</span>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span className={`font-bold ${item.included ? 'text-green-400' : 'text-amber-400'}`}>
          {item.amount}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          item.included
            ? 'bg-green-500/15 text-green-600'
            : 'bg-amber-500/15 text-amber-600'
        }`}>
          {item.included ? 'included' : 'you pay'}
        </span>
      </div>
    </div>
  );
}

function LeadTierCard({ tier, index, onCheckout, checkoutLoading }) {
  const [showSetup, setShowSetup] = useState(false);
  const isPopular = tier.badge === 'Most Popular';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative flex flex-col rounded-2xl border transition-all ${tier.color} ${
        isPopular ? 'bg-gradient-to-b from-brand-900/60 to-purple-900/40 scale-[1.03]' : 'glass'
      }`}
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

      {/* Header */}
      <div className="p-6 pb-0">
        <div className="text-2xl mb-2">🔎</div>
        <h3 className="text-white font-black text-xl mb-1">Lead Researcher — {tier.name}</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">{tier.desc}</p>
        <div className="flex items-end gap-1 mb-0.5">
          <span className="text-5xl font-black text-white">${tier.price}</span>
          <span className="text-gray-500 text-sm mb-1.5">/month</span>
        </div>
        <div className="text-xs text-gray-600 mb-2">CabinMind subscription · billed monthly</div>
        <div className="text-xs text-brand-300/80 italic mb-5">👤 {tier.whoIsThis}</div>
      </div>

      {/* Cost breakdown — always visible, not hidden in accordion */}
      <div className="px-6 mb-5">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
          What you pay each month
        </div>
        <div className="space-y-1.5">
          {tier.costBreakdown.map((item, i) => (
            <CostRow key={i} item={item} />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">Total</span>
          <div className="text-right">
            <span className="text-white font-black text-sm">{tier.totalCost}</span>
            <span className="text-gray-500 text-xs ml-2">· {tier.perLead}</span>
          </div>
        </div>
      </div>

      <div className="mx-6 border-t border-white/5 mb-5" />

      {/* Features */}
      <div className="px-6 mb-5 flex-1">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
          {"What's included"}
        </div>
        <ul className="space-y-2">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
              <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* API key setup accordion */}
      {tier.setupNote && (
        <div className="px-6 mb-4">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="w-full text-left text-xs text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2.5"
          >
            <span>🔑</span>
            <span className="flex-1 font-medium">How do I set up my API keys?</span>
            <span className="text-gray-500">{showSetup ? '▲' : '▼'}</span>
          </button>
          <AnimatePresence>
            {showSetup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-xl p-4 leading-relaxed space-y-3">
                  <p>{tier.setupNote}</p>
                  <div className="flex gap-2">
                    <a
                      href="https://hunter.io/users/sign_up"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-400 hover:bg-orange-500/25 transition-colors font-medium"
                    >
                      Sign up — Hunter.io →
                    </a>
                    {tier.byok === 'both' && (
                      <a
                        href="https://www.zerobounce.net/members/sign-up"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 transition-colors font-medium"
                      >
                        Sign up — ZeroBounce →
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 pb-6">
        <button
          onClick={() => onCheckout(tier.id)}
          disabled={checkoutLoading === tier.id}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${tier.btnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {checkoutLoading === tier.id ? 'Redirecting…' : `Get ${tier.name} — $${tier.price}/mo →`}
        </button>
        <Link
          href="/agents/lead-researcher"
          className="block text-center text-gray-600 hover:text-brand-300 text-xs mt-3 transition-colors"
        >
          Try free demo first — no account needed
        </Link>
      </div>
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
      <div className="flex items-end gap-1 mb-1">
        <span className="text-3xl font-black text-white">${plan.price}</span>
        <span className="text-gray-500 text-sm mb-0.5">/month</span>
      </div>
      <div className="text-xs text-green-400/70 mb-5">
        ✅ All-inclusive — no external API accounts needed
      </div>
      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
            <span className="text-green-400 text-xs flex-shrink-0">✓</span>
            {f}
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
      <Link
        href={`/agents/${plan.id}`}
        className="block text-center text-gray-500 hover:text-brand-300 text-xs mt-3 transition-colors"
      >
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

// Plain-English BYOK explainer — sits above the pricing cards
function HowByokWorks() {
  const steps = [
    {
      icon: '🤖',
      title: 'CabinMind AI',
      color: 'border-brand-500/30 bg-brand-500/5',
      titleColor: 'text-brand-400',
      covered: 'Always included in every plan',
      desc: 'Identifies target companies, generates lead lists, scores every contact on 8 signals, and orchestrates the full pipeline from ICP to export.',
    },
    {
      icon: '🎯',
      title: 'Hunter.io',
      color: 'border-orange-500/30 bg-orange-500/5',
      titleColor: 'text-orange-400',
      covered: 'Starter: included · Pro/Scale/Agency: your own key',
      desc: 'Searches company domains for real employee emails and LinkedIn profiles. Charges per domain search — your key means your quota, no hidden markup from us.',
    },
    {
      icon: '🛡️',
      title: 'ZeroBounce',
      color: 'border-green-500/30 bg-green-500/5',
      titleColor: 'text-green-400',
      covered: 'Starter + Pro: included · Scale/Agency: your own key',
      desc: 'Validates every email for spam traps, hard bounces, and disposables before it reaches you. No bad emails in your outreach list — ever.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12 max-w-4xl mx-auto"
    >
      <div className="bg-gradient-to-br from-amber-950/40 to-orange-950/20 border border-amber-500/20 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <div className="text-3xl flex-shrink-0 mt-0.5">💡</div>
          <div className="flex-1">
            <h3 className="text-white font-black text-lg mb-1">How CabinMind pricing works</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              CabinMind is the AI engine that builds your lead lists. Finding real emails and
              validating them requires two external data services. Rather than hiding their costs
              inside a bloated subscription, we let you pay them directly at their published rates.
              Complete transparency, no 5x markup.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {steps.map((s) => (
                <div key={s.title} className={`border rounded-xl p-4 ${s.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{s.icon}</span>
                    <span className={`font-black text-sm ${s.titleColor}`}>{s.title}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed mb-3">{s.desc}</p>
                  <p className={`text-[11px] font-semibold ${s.titleColor} opacity-80`}>{s.covered}</p>
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
  const hunterRows = [
    { plan: 'Free', detail: '25 searches/mo', price: '$0/mo', tag: '' },
    { plan: 'Starter', detail: '500 searches/mo', price: '$49/mo', tag: 'Pro plan' },
    { plan: 'Growth', detail: '2,000 searches/mo', price: '$99/mo', tag: 'Scale/Agency' },
    { plan: 'Business', detail: '5,000 searches/mo', price: '$199/mo', tag: '' },
  ];
  const zbRows = [
    { plan: 'Free', detail: '100 credits/mo', price: '$0', tag: '' },
    { plan: 'Pay-as-you-go', detail: '2,000 credits', price: '$16', tag: 'Pro users' },
    { plan: 'Monthly', detail: '5,000 credits', price: '$25/mo', tag: 'Scale/Agency' },
    { plan: 'Monthly', detail: '10,000 credits', price: '$49/mo', tag: '' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-10 max-w-4xl mx-auto"
    >
      <div className="glass border border-white/10 rounded-2xl p-8">
        <h3 className="text-white font-black text-lg mb-1 text-center">
          Get your API keys in 5 minutes
        </h3>
        <p className="text-gray-500 text-sm text-center mb-8">
          Both have generous free tiers — test before you pay a cent.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white/4 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl">🎯</div>
              <div>
                <div className="text-white font-bold">Hunter.io</div>
                <div className="text-gray-400 text-xs">Finds real emails at any company domain</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs mb-4">
              {hunterRows.map((r) => (
                <div key={r.plan + r.detail} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                  <span className="font-medium text-gray-300 w-16 flex-shrink-0">{r.plan}</span>
                  <span className="flex-1 text-gray-400">{r.detail}</span>
                  <span className="text-gray-500 w-14 text-right flex-shrink-0">{r.price}</span>
                  {r.tag && <span className="text-amber-400 text-[10px] font-bold flex-shrink-0">← {r.tag}</span>}
                </div>
              ))}
            </div>
            <a
              href="https://hunter.io/users/sign_up"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-semibold hover:bg-orange-500/25 transition-colors"
            >
              Create free Hunter account →
            </a>
          </div>

          <div className="bg-white/4 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl">🛡️</div>
              <div>
                <div className="text-white font-bold">ZeroBounce</div>
                <div className="text-gray-400 text-xs">Validates emails, blocks spam traps</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs mb-4">
              {zbRows.map((r, i) => (
                <div key={i} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                  <span className="font-medium text-gray-300 w-20 flex-shrink-0">{r.plan}</span>
                  <span className="flex-1 text-gray-400">{r.detail}</span>
                  <span className="text-gray-500 w-10 text-right flex-shrink-0">{r.price}</span>
                  {r.tag && <span className="text-green-400 text-[10px] font-bold flex-shrink-0">← {r.tag}</span>}
                </div>
              ))}
            </div>
            <a
              href="https://www.zerobounce.net/members/sign-up"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/25 transition-colors"
            >
              Create free ZeroBounce account →
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
            CabinMind is the AI engine. For lead generation, you choose how much data quota you
            need and pay the API providers directly — no markups, no hidden costs, no bill shock.
          </p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

        <div className="flex justify-center mb-12">
          <div className="glass border border-white/10 rounded-2xl p-1.5 flex gap-1">
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'leads'
                  ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🔎 AI Lead Researcher
            </button>
            <button
              onClick={() => setActiveTab('other')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'other'
                  ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
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
                  and how many leads you need each month.
                </p>
              </div>
              <HowByokWorks />
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 items-start">
                {LEAD_TIERS.map((tier, i) => (
                  <LeadTierCard key={tier.id} tier={tier} index={i} onCheckout={handleCheckout} checkoutLoading={checkoutLoading} />
                ))}
              </div>
              <ApiAccountsSection />
            </motion.div>
          )}

          {activeTab === 'other' && (
            <motion.div key="other" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-10">
                <div className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Other AI Agents</div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Flat-rate agents</h2>
                <p className="text-gray-400 max-w-xl mx-auto text-sm">
                  These agents run entirely on CabinMind infrastructure — no external API accounts required, ever.
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
            {FAQ.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center"
        >
          <h2 className="text-3xl font-black text-white mb-4">Not sure which plan is right?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Try the live demo — no account required. See real leads generated from your ICP
            in under 30 seconds, then pick a plan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-500/30"
            >
              🔎 Try Free Demo →
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl glass border border-white/15 text-white font-bold text-lg hover:border-brand-400/40 transition-all"
            >
              vs. Apollo & Others →
            </Link>
            <Link
              href="/agents"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl glass border border-white/15 text-white font-bold text-lg hover:border-brand-400/40 transition-all"
            >
              Browse All Agents →
            </Link>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
