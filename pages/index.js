/**
 * / — CabinMind Homepage
 * Revenue-focused: leads with the AI Lead Researcher money product.
 */
import Layout from '../components/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STATS = [
  { value: '$0.97', label: 'Per verified lead · Starter' },
  { value: '2.5s',  label: 'Per batch of 5 leads'        },
  { value: '6',     label: 'Email validation layers'      },
  { value: '99%',   label: 'Inbox delivery rate'          },
];

const PIPELINE_STEPS = [
  { icon: '��', label: 'Describe your ICP',       time: '30 sec'  },
  { icon: '🤖', label: 'AI finds companies',      time: '1–2s'    },
  { icon: '🔍', label: 'Hunter fetches contacts', time: '2–4s'    },
  { icon: '🛡️', label: 'ZeroBounce validates',    time: '1–2s'    },
  { icon: '📊', label: 'Scored A–D & ranked',     time: 'instant' },
  { icon: '📤', label: 'Export to CRM',           time: 'instant' },
];

const SOCIAL_PROOF = [
  '"Replaced our entire SDR research stack in a week."',
  '"5 leads in 2.5 seconds. ZeroBounce-verified. Insane."',
  '"Our reply rate went from 4% to 11% after switching to CabinMind leads."',
  '"The ICP scoring alone saved us 3 hours a week."',
  '"We exported our first 100 leads before finishing our morning coffee."',
];

const SAMPLE_LEADS_PREVIEW = [
  { name: 'Sarah Chen',  title: 'VP of Sales',     company: 'Lattice',     score: 98, grade: 'A' },
  { name: 'Marcus Webb', title: 'Head of Revenue', company: 'Outreach.io', score: 96, grade: 'A' },
  { name: 'Priya Nair',  title: 'CRO',             company: 'ChartMogul',  score: 99, grade: 'A' },
];

function FloatingOrb({ className }) {
  return <div className={`absolute rounded-full blur-3xl opacity-20 animate-pulse-slow pointer-events-none ${className}`} />;
}

function SocialProofTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % SOCIAL_PROOF.length), 3800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="overflow-hidden h-6">
      <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="text-sm text-gray-400 italic text-center">
        {SOCIAL_PROOF[idx]}
      </motion.div>
    </div>
  );
}

export default function Home() {
  return (
    <Layout title="CabinMind — AI Lead Researcher · 100 Verified B2B Leads in Under 3 Minutes" fullBleed>

      {/* HERO */}
      <section className="relative min-h-screen grid-bg flex flex-col items-center justify-center overflow-hidden px-4 pt-16">
        <FloatingOrb className="w-96 h-96 bg-brand-500 top-20 -left-32" />
        <FloatingOrb className="w-80 h-80 bg-purple-500 bottom-32 right-0" />
        <FloatingOrb className="w-64 h-64 bg-violet-600 top-1/3 left-1/2 -translate-x-1/2" />

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="relative z-10 text-center max-w-5xl mx-auto">

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-gray-300 mb-6 border border-brand-400/30">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live · Hunter.io + ZeroBounce + Groq AI · No code required
          </motion.div>

          <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-[1.05] tracking-tight text-white">
            100 verified B2B leads
            <br />
            <span className="gradient-text">in under 3 minutes.</span>
          </h1>

          <p className="text-xl text-gray-400 mb-4 max-w-2xl mx-auto leading-relaxed">
            Describe your ideal customer. CabinMind finds real decision-makers, validates every email
            with ZeroBounce, scores them A–D on 8 signals, and exports to HubSpot or CSV — automatically.
          </p>

          <div className="mb-8 max-w-xl mx-auto">
            <SocialProofTicker />
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto mb-8">
            <Link href="/demo" className="block bg-white/5 border border-white/15 rounded-2xl p-4 text-left hover:border-brand-400/40 transition-all group">
              <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Try your ICP — click to run live</div>
              <div className="text-gray-300 text-sm font-mono group-hover:text-purple-300 transition-colors">
                &quot;VP of Sales at B2B SaaS, 50–200 employees, using HubSpot, scaling outbound&quot;
                <span className="inline-block w-0.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-5">
            <Link href="/demo"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-500/30 hover:scale-105">
              🔎 See Live Leads Free
            </Link>
            <Link href="/pricing"
              className="px-8 py-4 rounded-xl glass border border-white/10 text-white font-bold text-lg hover:border-brand-400/50 transition-all">
              💰 Plans from $97/mo →
            </Link>
          </motion.div>
          <p className="text-gray-600 text-sm">No credit card for demo · Cancel anytime · Real data, not scraped lists</p>
        </motion.div>

        {/* Sample lead cards */}
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.8 }}
          className="relative z-10 mt-14 w-full max-w-3xl mx-auto space-y-2 px-4">
          {SAMPLE_LEADS_PREVIEW.map((lead, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.75 + i * 0.15 }}
              className="glass rounded-xl px-4 py-3 flex items-center gap-4 border border-white/5 hover:border-brand-400/30 transition-all">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {lead.name.split(' ').map(p => p[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">
                  {lead.name} · <span className="text-gray-400 font-normal">{lead.title}, {lead.company}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-green-400">🛡️ ZB Verified</span>
                  <span className="text-xs text-blue-400">🔗 Direct LinkedIn</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-center">
                <div className="text-green-400 text-lg font-black">{lead.score}</div>
                <div className="text-xs text-green-400/70">{lead.grade} · Hot</div>
              </div>
            </motion.div>
          ))}
          <div className="text-center pt-2">
            <Link href="/demo" className="text-xs text-gray-500 hover:text-purple-400 transition-colors">
              + 97 more leads like these in your paid plan · See full demo →
            </Link>
          </div>
        </motion.div>

        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </section>

      {/* STATS */}
      <section className="py-16 px-4 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="text-4xl font-black gradient-text mb-1">{s.value}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PIPELINE */}
      <section className="py-24 px-4 relative overflow-hidden">
        <FloatingOrb className="w-96 h-96 bg-brand-600 -right-48 top-0" />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-14">
            <div className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">The Pipeline</div>
            <h2 className="text-4xl font-black text-white mb-3">
              From ICP to inbox in <span className="gradient-text">2.5 seconds</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Six automated stages. No manual work. Every lead ZeroBounce-validated before you see it.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-5 border border-white/5 hover:border-brand-400/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600/30 to-purple-600/20 border border-brand-500/30 flex items-center justify-center text-xl">
                    {step.icon}
                  </div>
                  <span className="text-xs text-brand-400 bg-brand-500/15 border border-brand-500/25 rounded-full px-2.5 py-1 font-mono">
                    ⚡ {step.time}
                  </span>
                </div>
                <div className="text-xs text-gray-600 font-bold mb-0.5">Step {i + 1}</div>
                <div className="text-white font-bold">{step.label}</div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-8 text-center">
            <Link href="/demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-500/25">
              Watch the pipeline run live →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="py-24 px-4" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-14">
            <div className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Simple Pricing</div>
            <h2 className="text-4xl font-black text-white mb-3">Start at <span className="gradient-text">$97/mo</span></h2>
            <p className="text-gray-400 text-lg">
              All plans include ZeroBounce validation, A–D scoring, LinkedIn profiles, and CSV export. Cancel anytime.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto mb-8">
            {[
              { name: 'Starter', price: '$97',  leads: '100 leads/mo', note: 'All keys included',            highlight: false },
              { name: 'Pro',     price: '$247', leads: '500 leads/mo', note: 'Bring your Hunter key',        highlight: true  },
              { name: 'Scale',   price: '$497', leads: 'Unlimited',    note: 'Full BYOK · Campaign Builder', highlight: false },
            ].map((tier, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative glass rounded-2xl p-6 text-center border transition-all ${
                  tier.highlight ? 'border-brand-500/50 shadow-xl shadow-brand-500/20' : 'border-white/8 hover:border-brand-400/30'
                }`}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <div className="text-gray-400 text-sm font-semibold mb-1">{tier.name}</div>
                <div className="text-4xl font-black text-white mb-1">{tier.price}<span className="text-lg text-gray-500">/mo</span></div>
                <div className="text-brand-300 font-bold text-sm mb-1">{tier.leads}</div>
                <div className="text-gray-500 text-xs mb-5">{tier.note}</div>
                <Link href="/pricing"
                  className={`block py-2.5 rounded-xl text-sm font-bold transition-all ${
                    tier.highlight
                      ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white hover:opacity-90 shadow-lg'
                      : 'bg-white/5 border border-white/10 text-gray-300 hover:border-brand-400/40'
                  }`}>
                  Get Started →
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/compare" className="text-sm text-gray-500 hover:text-brand-400 transition-colors underline underline-offset-2">
              See how we compare vs Apollo, Hunter, Clay, ZoomInfo →
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-4xl mx-auto glass rounded-3xl p-12 text-center relative overflow-hidden border border-brand-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-purple-600/20 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-4xl font-black text-white mb-4">Fill your pipeline — automatically.</h2>
            <p className="text-gray-300 mb-8 text-lg max-w-xl mx-auto leading-relaxed">
              5 free leads, no credit card. See exactly what CabinMind finds for your ICP in under 3 seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo"
                className="px-10 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-black text-xl hover:opacity-90 hover:scale-105 transition-all shadow-2xl shadow-brand-500/40">
                🔎 Try Free Demo
              </Link>
              <Link href="/pricing"
                className="px-10 py-4 rounded-xl bg-white/8 border border-white/15 text-white font-bold text-xl hover:bg-white/12 transition-all">
                See Pricing →
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 mt-6">
              {['✅ No credit card for demo', '✅ Cancel anytime', '✅ Results in 2.5 seconds', '✅ Real data, not scraped lists'].map((g, i) => (
                <span key={i}>{g}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">CM</span>
            </div>
            <span className="text-white font-semibold">Cabin<span className="gradient-text">Mind</span></span>
            <span className="text-gray-600 text-xs ml-2">by Dev Cabin Technologies</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <Link href="/demo"           className="hover:text-white transition-colors">Live Demo</Link>
            <Link href="/agents"         className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/pricing"        className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/compare"        className="hover:text-white transition-colors">Compare</Link>
            <Link href="/agents/builder" className="hover:text-white transition-colors">Build an Agent</Link>
            <a href="mailto:jameson@devcabin.tech" className="hover:text-white transition-colors">Support</a>
          </nav>
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Dev Cabin Technologies</p>
        </div>
      </footer>

    </Layout>
  );
}
