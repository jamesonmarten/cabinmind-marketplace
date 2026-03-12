import Layout from '../components/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

const AGENTS_PREVIEW = [
  { icon: '🤖', name: 'AI Receptionist',  desc: 'Answers chats, qualifies leads 24/7' },
  { icon: '📈', name: 'Website Auditor',  desc: 'SEO & UX analysis on demand'         },
  { icon: '✍️', name: 'Blog Writer',      desc: 'Publish SEO content automatically'   },
  { icon: '💼', name: 'Sales Assistant',  desc: 'Outreach & follow-ups on autopilot'  },
];

const STATS = [
  { value: '10k+', label: 'Tasks automated' },
  { value: '98%',  label: 'Uptime SLA'      },
  { value: '5min', label: 'Setup time'      },
  { value: '24/7', label: 'Always on'       },
];

function FloatingOrb({ className }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-20 animate-pulse-slow pointer-events-none ${className}`} />
  );
}

function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129,140,248,${p.alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

export default function Home() {
  return (
    <Layout title="CabinMind – AI Agent Marketplace" fullBleed>
      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative min-h-screen grid-bg flex flex-col items-center justify-center overflow-hidden px-4">
        <ParticleCanvas />
        <FloatingOrb className="w-96 h-96 bg-brand-500 top-20 -left-32" />
        <FloatingOrb className="w-80 h-80 bg-purple-500 bottom-32 right-0" />
        <FloatingOrb className="w-64 h-64 bg-pink-500 top-1/2 left-1/2 -translate-x-1/2" />

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-gray-300 mb-8 border border-brand-400/30"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Agents live & running — no code required
          </motion.div>

          <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-none tracking-tight text-white">
            AI Agents that{' '}
            <span className="gradient-text">Work For You</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Deploy powerful AI agents in minutes. Automate customer support, marketing, content, and sales — no engineering team needed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/agents"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-500/30 hover:scale-105"
            >
              Browse Agents →
            </Link>
            <Link
              href="/agents/builder"
              className="px-8 py-4 rounded-xl glass border border-white/10 text-white font-bold text-lg hover:border-brand-400/50 transition-all"
            >
              Build Your Own
            </Link>
          </div>
        </motion.div>

        {/* Floating agent cards preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative z-10 mt-20 w-full max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 px-4"
        >
          {AGENTS_PREVIEW.map((a, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              className="glass rounded-2xl p-4 text-center border border-white/5 hover:border-brand-400/30 transition-colors"
            >
              <div className="text-3xl mb-2">{a.icon}</div>
              <div className="text-white text-sm font-semibold mb-1">{a.name}</div>
              <div className="text-gray-400 text-xs">{a.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-black gradient-text mb-1">{s.value}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section className="py-24 px-4 relative overflow-hidden">
        <FloatingOrb className="w-96 h-96 bg-brand-600 -right-48 top-0" />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-black text-white mb-4">
              Deploy in <span className="gradient-text">3 Steps</span>
            </h2>
            <p className="text-gray-400 text-lg">No code, no complexity. Just results.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Pick an Agent',    desc: 'Browse our marketplace and choose the AI agent that fits your workflow.', icon: '🛍️' },
              { step: '02', title: 'Configure & Deploy', desc: 'Set your preferences, connect your tools, and go live in minutes.',  icon: '⚙️' },
              { step: '03', title: 'Watch It Work',    desc: 'Your agent starts working 24/7 — you stay focused on what matters.',   icon: '🚀' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass rounded-2xl p-8 relative overflow-hidden group hover:border-brand-400/30 border border-transparent transition-all"
              >
                <div className="absolute top-4 right-4 text-6xl font-black text-white/5 group-hover:text-white/10 transition-colors">
                  {item.step}
                </div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────── */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto glass rounded-3xl p-12 text-center relative overflow-hidden border border-brand-400/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-purple-600/20 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-white mb-4">
              Ready to automate your business?
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Join hundreds of businesses running on CabinMind agents.
            </p>
            <Link
              href="/agents"
              className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-xl shadow-brand-500/30"
            >
              Start Free Today →
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} Dev Cabin Technologies · CabinMind
      </footer>
    </Layout>
  );
}