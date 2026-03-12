import Layout from '../../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const AGENT_NAMES = {
  receptionist:      'AI Receptionist',
  'website-audit':   'AI Website Auditor',
  'blog-writer':     'AI Blog Writer',
  'sales-assistant': 'AI Sales Assistant',
  'lead-researcher': 'AI Lead Researcher',
};

const AGENT_ICONS = {
  receptionist:      '🤖',
  'website-audit':   '📈',
  'blog-writer':     '✍️',
  'sales-assistant': '💼',
  'lead-researcher': '🔎',
};

const NEXT_STEPS = [
  { icon: '📧', title: 'Check your email', desc: 'A receipt and setup instructions are on their way to your inbox.' },
  { icon: '⚙️', title: 'Configure your agent', desc: 'Follow the setup guide to connect your tools and go live.' },
  { icon: '🚀', title: 'Go live', desc: 'Your agent will start working within minutes of setup.' },
];

export default function CheckoutSuccess() {
  const router = useRouter();
  const { agent, session_id } = router.query;

  const [session, setSession]   = useState(null);
  const [loading, setLoading]   = useState(true);

  // Fetch real session details from Stripe to show customer name & email
  useEffect(() => {
    if (!router.isReady || !session_id) return;
    fetch(`/api/session?id=${session_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setSession(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router.isReady, session_id]);

  const agentId   = agent || session?.metadata?.agentId || '';
  const agentName = AGENT_NAMES[agentId] || 'Your Agent';
  const agentIcon = AGENT_ICONS[agentId] || '⚡';

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
                  A confirmation email with setup instructions is on its way to{' '}
                  <span className="text-white font-semibold">{customerEmail}</span>.
                </p>
              ) : (
                <p className="text-gray-400 text-base">
                  Your subscription is live. Here&apos;s what happens next:
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
        </div>
      </div>

      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm relative z-10">
        © {new Date().getFullYear()} Dev Cabin Technologies · CabinMind
      </footer>
    </Layout>
  );
}
