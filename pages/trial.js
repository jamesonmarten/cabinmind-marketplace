/**
 * /trial
 * Free 50-lead trial entry point
 * Explains the offer and directs users to a demo slug or allows them to request a trial
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { motion } from 'framer-motion';

export default function TrialPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDemoAccess = () => {
    router.push('/trial/demo-50-leads');
  };

  const handleRequestTrial = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'request' }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage(`✓ Trial request received! Check ${email} for your unique trial link within 24 hours.`);
        setEmail('');
      } else {
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setMessage('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Free 50-Lead Trial – CabinMind" fullBleed>
      <section className="relative min-h-screen flex items-center justify-center py-24 px-4">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent" />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-500 to-violet-500 blur-3xl opacity-15"
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-violet-500 to-purple-500 blur-3xl opacity-10"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="text-6xl mb-4">🎁</div>
            <h1 className="text-5xl font-black text-white mb-3">
              50 Verified B2B Leads
              <span className="gradient-text"> Free</span>
            </h1>
            <p className="text-xl text-gray-300 mb-2">No credit card. No commitment.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-10 backdrop-blur"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div>
                <div className="text-3xl font-black text-purple-400 mb-2">50</div>
                <p className="text-sm text-gray-400">Verified B2B leads from Apollo + Hunter</p>
              </div>
              <div>
                <div className="text-3xl font-black text-violet-400 mb-2">✓</div>
                <p className="text-sm text-gray-400">Email validated with ZeroBounce</p>
              </div>
              <div>
                <div className="text-3xl font-black text-indigo-400 mb-2">∞</div>
                <p className="text-sm text-gray-400">Scored by AI on 14 ICP signals</p>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Describe your ideal customer in one sentence. The AI Lead Researcher generates 50 fully-enriched, validated, and scored prospects in seconds — then you export to your CRM.
            </p>

            {/* Two CTA options */}
            <div className="space-y-4">
              <button
                onClick={handleDemoAccess}
                className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-purple-500/30"
              >
                Try Demo Now →
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-gradient-to-br from-gray-900 to-gray-950 text-sm text-gray-500">Or request your custom trial</span>
                </div>
              </div>

              <form onSubmit={handleRequestTrial} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@company.com"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!email.trim() || loading}
                    className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-sm transition disabled:opacity-50"
                  >
                    {loading ? 'Sending…' : 'Request'}
                  </button>
                </div>
                {message && (
                  <p className={`text-xs ${message.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {message}
                  </p>
                )}
              </form>
            </div>
          </motion.div>

          {/* Features breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-10"
          >
            <h2 className="text-2xl font-black text-white mb-6">What's included</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: '📧', title: 'Verified Email', desc: 'MX + ZeroBounce validated — inbox-deliverable.' },
                { icon: '🎯', title: 'AI Scoring', desc: 'Ranked by fit across company size, tech stack, buying signals.' },
                { icon: '🔗', title: 'LinkedIn URLs', desc: 'Direct links to decision-maker profiles.' },
                { icon: '💼', title: 'Job Title + Company', desc: 'Real names, titles, and verified company domains.' },
                { icon: '📊', title: 'Tech Stack', desc: 'What platforms they use — ideal for product fit.' },
                { icon: '📥', title: 'Export to CSV', desc: 'Download, import to HubSpot, Salesforce, or Instantly.ai.' },
              ].map((item, i) => (
                <div key={i} className="text-left p-4 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="font-semibold text-white text-sm mb-1">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-center"
          >
            <p className="text-gray-500 text-sm mb-4">
              No credit card required. Emails sent within 24 hours.
            </p>
            <p className="text-gray-600 text-xs">
              Questions? Email <a href="mailto:info@devcabin.tech" className="text-purple-400 hover:underline">info@devcabin.tech</a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
        <div className="max-w-6xl mx-auto px-4">
          <p>© 2026 Dev Cabin Technologies · <Link href="/" className="text-purple-400 hover:underline">Back to home</Link></p>
        </div>
      </footer>
    </Layout>
  );
}
