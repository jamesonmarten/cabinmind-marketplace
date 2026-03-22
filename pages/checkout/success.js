import Layout from '../../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { gtmEvent, pixelEvent } from '../_app';

const AGENT_NAMES = {
  receptionist:      'AI Receptionist',
  'website-audit':   'AI Website Auditor',
  'blog-writer':     'AI Blog Writer',
  'sales-assistant': 'AI Sales Assistant',
  'lead-researcher': 'AI Lead Researcher',
  'lead-starter':    'AI Lead Researcher — Starter',
  'lead-pro':        'AI Lead Researcher — Pro',
  'lead-scale':      'AI Lead Researcher — Scale',
  'lead-agency':     'AI Lead Researcher — Agency',
};

const AGENT_ICONS = {
  receptionist:      '🤖',
  'website-audit':   '📈',
  'blog-writer':     '✍️',
  'sales-assistant': '💼',
  'lead-researcher': '🔎',
  'lead-starter':    '🔎',
  'lead-pro':        '🔎',
  'lead-scale':      '🔎',
  'lead-agency':     '🔎',
};

// Lead Researcher tiers need BYOK next-steps; others use default flow
const BYOK_TIERS = new Set(['lead-starter','lead-pro','lead-scale','lead-agency','lead-researcher']);
const BYOK_NOTES = {
  'lead-starter': 'Platform Hunter.io + ZeroBounce keys are pre-configured — you can start generating leads immediately from your dashboard.',
  'lead-pro':     'Add your Hunter.io API key in your dashboard under API Keys → your ZeroBounce is covered by the platform.',
  'lead-scale':   'Add your Hunter.io and ZeroBounce API keys in your dashboard under API Keys to unlock unlimited generation.',
  'lead-agency':  'Add your Hunter.io and ZeroBounce API keys in your dashboard under API Keys. You have 5 seats — invite your team from Settings.',
  'lead-researcher': 'Platform keys are pre-configured — click your dashboard link to start generating leads.',
};

const DEFAULT_NEXT_STEPS = [
  { icon: '📧', title: 'Check your email', desc: 'Your welcome email contains a personal dashboard link — bookmark it!' },
  { icon: '🚀', title: 'Open your dashboard', desc: 'Click the link in your email to access your full agent dashboard right now.' },
  { icon: '⚙️', title: 'Configure & go live', desc: 'Follow the in-dashboard setup guide to connect your tools and go live in minutes.' },
];

const BYOK_NEXT_STEPS = [
  { icon: '📧', title: 'Check your email', desc: 'Your personal dashboard link is in your welcome email — bookmark it for quick access.' },
  { icon: '🔑', title: 'Add your API keys', desc: 'Open your dashboard → API Keys tab and paste in your Hunter.io / ZeroBounce keys (see note above).' },
  { icon: '🔎', title: 'Research your first leads', desc: 'Paste your ICP, hit Research, and get fully-profiled prospects with verified emails in seconds.' },
];

export default function CheckoutSuccess() {
  const router = useRouter();
  const { agent, session_id } = router.query;

  const [session, setSession]   = useState(null);
  const [loading, setLoading]   = useState(true);

  // Fetch real session details from Stripe to show customer name & email
  // and fire conversion events once (guarded by sessionStorage dedup key)
  useEffect(() => {
    if (!router.isReady || !session_id) return;
    fetch(`/api/session?id=${session_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setSession(data);
        setLoading(false);

        // ── Fire conversion events once per session_id ──────────────────
        const dedupKey = `cm_conv_${session_id}`;
        if (typeof window !== 'undefined' && !sessionStorage.getItem(dedupKey)) {
          sessionStorage.setItem(dedupKey, '1');

          const agentId   = agent || data?.metadata?.agentId || 'unknown';
          const amountUSD = data?.amount_total ? data.amount_total / 100 : 49;
          const email     = data?.customer_details?.email || '';

          // Google Tag Manager → GA4 purchase + Google Ads conversion
          gtmEvent('purchase', {
            transaction_id: session_id,
            value:          amountUSD,
            currency:       'USD',
            items: [{
              item_id:   agentId,
              item_name: AGENT_NAMES[agentId] || agentId,
              price:     amountUSD,
              quantity:  1,
            }],
          });

          // Meta Pixel — Purchase event
          pixelEvent('Purchase', {
            value:        amountUSD,
            currency:     'USD',
            content_ids:  [agentId],
            content_type: 'product',
          });
        }
      })
      .catch(() => setLoading(false));
  }, [router.isReady, session_id, agent]);

  const agentId   = agent || session?.metadata?.agentId || '';
  const agentName = AGENT_NAMES[agentId] || 'Your Agent';
  const agentIcon = AGENT_ICONS[agentId] || '⚡';
  const isByok    = BYOK_TIERS.has(agentId);
  const byokNote  = BYOK_NOTES[agentId] || '';
  const NEXT_STEPS = isByok ? BYOK_NEXT_STEPS : DEFAULT_NEXT_STEPS;

  const customerName  = session?.customer_details?.name  || '';
  const customerEmail = session?.customer_details?.email || '';
  const firstName     = customerName?.split(' ')[0] || '';

  return (
    <Layout title="Welcome to CabinMind! – Purchase Successful" fullBleed>
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-24">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-600 blur-3xl opacity-10 pointer-events-none animate-pulse-slow" />

        <div className="relative z-10 max-w-2xl w-full mx-auto text-center">

          {/* Animated success icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-2xl shadow-green-500/30 mb-6 text-5xl"
          >
            ✓
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl sm:text-5xl font-black text-white mb-3"
          >
            {firstName ? `You're all set, ${firstName}! 🎉` : "You're all set! 🎉"}
          </motion.h1>

          {/* Agent badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl px-6 py-4 border border-green-400/20 inline-flex items-center gap-3 mb-4"
          >
            <span className="text-3xl">{agentIcon}</span>
            <div className="text-left">
              <div className="text-white font-bold">{agentName}</div>
              <div className="text-green-400 text-sm font-medium">Subscription activated</div>
            </div>
          </motion.div>

          {/* BYOK setup note for Lead Researcher tiers */}
          {isByok && byokNote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mb-5 glass rounded-xl border border-purple-500/30 px-5 py-4 text-left max-w-lg mx-auto"
            >
              <div className="text-purple-400 font-semibold text-sm mb-1">🔑 Your API key setup</div>
              <div className="text-gray-300 text-sm leading-relaxed">{byokNote}</div>
            </motion.div>
          )}

          {/* Email confirmation notice */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              {customerEmail ? (
                <p className="text-gray-400 text-base">
                  Your personal dashboard link is on its way to{' '}
                  <span className="text-white font-semibold">{customerEmail}</span>.
                  <br />
                  <span className="text-gray-500 text-sm">It may take a minute — check your spam folder too.</span>
                </p>
              ) : (
                <p className="text-gray-400 text-base">
                  Your subscription is live. Check your email for your personal dashboard link.
                </p>
              )}
            </motion.div>
          )}

          {/* Next steps */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {NEXT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.15 }}
                className="glass rounded-2xl p-5 border border-white/10 text-left"
              >
                <div className="text-3xl mb-3">{step.icon}</div>
                <div className="text-white font-semibold text-sm mb-1">{step.title}</div>
                <div className="text-gray-400 text-xs leading-relaxed">{step.desc}</div>
              </motion.div>
            ))}
          </div>

          {/* Order ref */}
          {session_id && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-gray-600 text-xs mb-8 font-mono"
            >
              Order ref: {session_id}
            </motion.p>
          )}

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/agents"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 hover:scale-105 transition-all shadow-xl shadow-brand-500/30"
            >
              Browse More Agents
            </Link>
            <Link
              href="/"
              className="px-8 py-4 rounded-xl glass border border-white/10 text-white font-semibold hover:border-white/20 transition-all"
            >
              Back to Home
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 text-gray-500 text-sm"
          >
            Questions? Email us at{' '}
            <a href="mailto:support@devcabin.tech" className="text-brand-400 hover:underline">
              support@devcabin.tech
            </a>
          </motion.p>
        </div>
      </div>

      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm relative z-10">
        © {new Date().getFullYear()} Dev Cabin Technologies · CabinMind
      </footer>
    </Layout>
  );
}
