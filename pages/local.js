/**
 * /local — Landing page for local businesses (contractors, dentists, salons,
 * restaurants, law firms, real estate, etc.) Distinct from the B2B SaaS
 * "Lead Researcher" pitch: local businesses care about never missing a call,
 * ranking on Google, and looking active online — not outbound prospecting.
 */
import Layout from '../components/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';
import LaunchOfferBanner from '../components/LaunchOfferBanner';
import { useCheckout } from '../hooks/useCheckout';

const BUNDLE = [
  {
    id: 'receptionist',
    icon: '🤖',
    name: 'AI Receptionist',
    price: 80,
    tagline: 'Never miss another call or lead again — day or night.',
    features: ['Answers every call & web chat 24/7', 'Books appointments straight to your calendar', 'Qualifies leads before they reach you', 'Sends you a summary text after every conversation'],
  },
  {
    id: 'website-audit',
    icon: '📈',
    name: 'AI Website Auditor',
    price: 50,
    tagline: 'Find out why competitors outrank you on Google — in one click.',
    features: ['Full SEO + Core Web Vitals report', 'Local-search ranking checklist', 'Plain-English fixes, no jargon', 'PDF report you can hand to your web person'],
  },
  {
    id: 'blog-writer',
    icon: '✍️',
    name: 'AI Blog Writer',
    price: 50,
    tagline: 'Fresh, SEO-friendly content published on autopilot every week.',
    features: ['4–20 articles / month, auto-published', 'Written for your city + service area', 'Keeps your site "active" in Google\'s eyes', 'No writing, no editing, no scheduling'],
  },
  {
    id: 'social-hub',
    icon: '📱',
    name: 'AI Social Media Hub',
    price: 50,
    tagline: 'Look active on Instagram/Facebook without touching a phone.',
    features: ['Auto-generates posts from your business info', 'Consistent posting schedule', 'Local, on-brand captions & hashtags', 'One dashboard for every platform'],
  },
];

const WHO_ITS_FOR = ['Contractors & home services', 'Dentists & medical practices', 'Salons & spas', 'Restaurants & cafes', 'Law firms', 'Real estate agents'];

const FAQ = [
  { q: 'I\u2019m not technical — is this hard to set up?', a: 'No. Subscribe, and we walk you through a 10-minute setup in your dashboard. No code, no developer needed.' },
  { q: 'Do I need all four agents?', a: 'No — pick whichever solves your biggest pain point first. Most local businesses start with the AI Receptionist since missed calls are lost revenue. Add more later, anytime.' },
  { q: 'What\u2019s the launch offer?', a: '50% off your first month on any agent, automatically applied at checkout. Refer another local business and you both get a free month.' },
  { q: 'Can I cancel anytime?', a: 'Yes — month-to-month, cancel anytime from your billing portal, no contracts.' },
];

export default function LocalBusinessPage() {
  const { handleCheckout, loading: checkoutLoading } = useCheckout();

  return (
    <Layout
      title="AI Tools for Local Businesses | CabinMind"
      description="AI Receptionist, Website Auditor, Blog Writer, and Social Media Hub built for local businesses — never miss a call, rank higher, stay active online."
      canonicalPath="/local"
    >
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
            🏪 Built for local, owner-operated businesses
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-4">
            Stop losing customers to <span className="gradient-text">missed calls</span> and slow Google rankings
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto mb-8">
            Four AI agents built for local businesses — answer every call, fix your website, publish fresh
            content, and stay active on social. Set up once, runs forever.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {WHO_ITS_FOR.map((w) => (
              <span key={w} className="text-xs text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">{w}</span>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <LaunchOfferBanner />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 items-stretch mb-16">
          {BUNDLE.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl border border-white/10 flex flex-col p-6"
            >
              <div className="text-3xl mb-3">{a.icon}</div>
              <h3 className="text-white font-black text-lg mb-1">{a.name}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{a.tagline}</p>
              <ul className="space-y-2 mb-5 flex-1">
                {a.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-3xl font-black text-white">${a.price}</span>
                <span className="text-gray-500 text-xs mb-1">/month</span>
              </div>
              <button
                onClick={() => handleCheckout(a.id)}
                disabled={checkoutLoading === a.id}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {checkoutLoading === a.id ? 'Redirecting…' : 'Get Started →'}
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-white text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="glass rounded-xl border border-white/10 p-5">
                <div className="text-white font-semibold text-sm mb-1">{f.q}</div>
                <div className="text-gray-400 text-sm leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <Link href="/pricing" className="text-brand-400 hover:underline text-sm">
            See full pricing & other agents →
          </Link>
        </div>
      </div>
    </Layout>
  );
}
