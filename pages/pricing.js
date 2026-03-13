import Layout from '../components/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCheckout } from '../hooks/useCheckout';

const PLANS = [
  {
    id: 'website-audit',
    icon: '📈',
    name: 'AI Website Auditor',
    price: 19,
    desc: 'Full SEO & Core Web Vitals analysis on demand.',
    features: [
      'Unlimited audits',
      'Core Web Vitals report',
      'SEO scorecard',
      'PDF export',
      'Competitor comparison',
    ],
    highlight: false,
  },
  {
    id: 'blog-writer',
    icon: '✍️',
    name: 'AI Blog Writer',
    price: 29,
    desc: 'SEO-optimised articles published on autopilot.',
    features: [
      '20 articles / month',
      'Keyword research',
      'WordPress auto-publish',
      '2,400-word output',
      'SEO meta generation',
    ],
    highlight: false,
  },
  {
    id: 'receptionist',
    icon: '🤖',
    name: 'AI Receptionist',
    price: 39,
    desc: 'Answer every visitor and qualify every lead, 24/7.',
    features: [
      'Unlimited conversations',
      'Lead qualification',
      'Appointment booking',
      'CRM push',
      'Custom persona',
    ],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'sales-assistant',
    icon: '💼',
    name: 'AI Sales Assistant',
    price: 49,
    desc: 'Personalised outreach sequences that actually convert.',
    features: [
      '500 prospects / month',
      '5-step follow-up sequences',
      'CRM auto-logging',
      'Reply detection',
      'Open-rate analytics',
    ],
    highlight: false,
  },
  {
    id: 'lead-researcher',
    icon: '🔎',
    name: 'AI Lead Researcher',
    price: 59,
    desc: 'Qualified prospects sourced, enriched, and scored for you.',
    features: [
      '200 leads / month',
      'ICP scoring',
      'Tech-stack enrichment',
      'Contact data included',
      'CRM export',
    ],
    highlight: false,
  },
];

const FAQ = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — all plans are month-to-month. Cancel from your billing portal with one click, no questions asked.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Every agent page has a live interactive demo you can use for free, no account needed. Paid plans unlock unlimited usage.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards via Stripe. We never store your card details.',
  },
  {
    q: 'Can I run multiple agents?',
    a: 'Absolutely — subscribe to as many agents as you need. Each is billed separately so you only pay for what you use.',
  },
  {
    q: 'Do agents work with my existing tools?',
    a: 'Yes. Agents connect to popular CRMs (HubSpot, Salesforce), calendars (Google, Outlook), WordPress, and more via API.',
  },
  {
    q: 'Do you offer agency or reseller pricing?',
    a: "Yes — email us at support@devcabin.tech and we'll set up a custom plan for your client volume.",
  },
];

function PlanCard({ plan, index, onCheckout, checkoutLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`relative flex flex-col rounded-2xl p-7 border transition-all group ${
        plan.highlight
          ? 'bg-gradient-to-b from-brand-900/60 to-purple-900/40 border-brand-500/50 shadow-2xl shadow-brand-500/20 scale-105'
          : 'glass border-white/10 hover:border-brand-400/30'
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
          {plan.badge}
        </div>
      )}
      <div className="text-4xl mb-4">{plan.icon}</div>
      <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
      <p className="text-gray-400 text-sm mb-5 leading-relaxed">{plan.desc}</p>
      <div className="flex items-end gap-1 mb-6">
        <span className="text-4xl font-black text-white">${plan.price}</span>
        <span className="text-gray-500 text-sm mb-1">/month</span>
      </div>
      <ul className="space-y-2.5 mb-8 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
            <span className="text-green-400 text-xs">✓</span> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onCheckout(plan.id)}
        disabled={checkoutLoading === plan.id}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
          plan.highlight
            ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/30 hover:opacity-90 hover:scale-[1.02]'
            : 'glass border border-white/10 text-white hover:border-brand-400/40 hover:text-brand-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {checkoutLoading === plan.id ? 'Redirecting…' : 'Subscribe Now →'}
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
      transition={{ delay: index * 0.06 }}
      className="group glass border border-white/10 rounded-xl p-5 cursor-pointer hover:border-brand-400/30 transition-all"
    >
      <summary className="flex justify-between items-center text-white font-semibold text-sm list-none select-none">
        {q}
        <span className="text-brand-400 text-lg ml-4 group-open:rotate-45 transition-transform duration-200">+</span>
      </summary>
      <p className="mt-3 text-gray-400 text-sm leading-relaxed">{a}</p>
    </motion.details>
  );
}

export default function PricingPage() {
  const { handleCheckout, loading: checkoutLoading } = useCheckout();

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
            Month-to-month · Cancel anytime
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-4">
            Simple, <span className="gradient-text">transparent</span> pricing
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            One flat monthly rate per agent. No setup fees, no usage caps, no surprises.
          </p>
        </motion.div>
      </div>

      {/* Plan grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-start">
          {PLANS.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={i}
              onCheckout={handleCheckout}
              checkoutLoading={checkoutLoading}
            />
          ))}
        </div>

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
            Not satisfied in your first 14 days? Email us and we'll issue a full refund — no questions, no hassle.
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
            {FAQ.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center"
        >
          <h2 className="text-3xl font-black text-white mb-4">Still not sure?</h2>
          <p className="text-gray-400 mb-8">Try any agent free with our interactive demos — no account required.</p>
          <Link
            href="/agents"
            className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-500/30 hover:scale-105"
          >
            Explore All Agents →
          </Link>
        </motion.div>
      </div>
    </Layout>
  );
}
