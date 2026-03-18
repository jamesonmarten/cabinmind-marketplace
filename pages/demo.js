/**
 * /demo — CabinMind AI Lead Researcher: Interactive Client Sales Page
 * A standalone, full-screen pitch page built to convert prospects into buyers.
 */
import Layout from '../components/Layout';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useInView } from 'framer-motion';
import Link from 'next/link';

// ─── Data ─────────────────────────────────────────────────────────────────────

const SAMPLE_LEADS = [
  {
    name: 'Sarah Chen',
    title: 'VP of Sales',
    company: 'Lattice',
    domain: 'lattice.com',
    email: 'sarah.chen@lattice.com',
    score: 98,
    grade: 'A',
    grade_label: 'Hot',
    zb_status: 'valid',
    linkedin_is_direct: true,
    linkedin: 'https://www.linkedin.com/in/sarahchen',
    signal: 'Just raised $175M Series F — actively scaling sales team',
    budget_range: '$40K–$90K/yr',
    pain_points: 'Manual prospecting, inconsistent pipeline, rep ramp time',
    size: '201–500',
    industry: 'HR Tech / B2B SaaS',
    score_signals: ['VP title (+14)', 'ICP keyword match (+8)', 'ZeroBounce verified (+15)', 'Direct LinkedIn (+8)', 'Company size 51–500 (+6)', 'Hunter confidence ≥90 (+5)'],
  },
  {
    name: 'Marcus Webb',
    title: 'Head of Revenue',
    company: 'Outreach.io',
    domain: 'outreach.io',
    email: 'marcus.webb@outreach.io',
    score: 96,
    grade: 'A',
    grade_label: 'Hot',
    zb_status: 'valid',
    linkedin_is_direct: true,
    linkedin: 'https://www.linkedin.com/in/marcuswebb',
    signal: 'Expanding into EMEA — needs outbound infrastructure',
    budget_range: '$50K–$120K/yr',
    pain_points: 'Territory expansion, data quality, rep efficiency',
    size: '201–500',
    industry: 'Sales Enablement',
    score_signals: ['Director title (+14)', 'ICP keyword match (+8)', 'ZeroBounce verified (+15)', 'Direct LinkedIn (+8)', 'Hunter confidence ≥90 (+5)'],
  },
  {
    name: 'Priya Nair',
    title: 'Chief Revenue Officer',
    company: 'ChartMogul',
    domain: 'chartmogul.com',
    email: 'priya.nair@chartmogul.com',
    score: 99,
    grade: 'A',
    grade_label: 'Hot',
    zb_status: 'valid',
    linkedin_is_direct: true,
    linkedin: 'https://www.linkedin.com/in/priyanair',
    signal: 'Q1 board review — pipeline velocity on agenda',
    budget_range: '$35K–$80K/yr',
    pain_points: 'Lead quality, CAC reduction, forecast accuracy',
    size: '51–200',
    industry: 'SaaS Analytics',
    score_signals: ['C-suite title (+20)', 'ICP keyword match (+8)', 'ZeroBounce verified (+15)', 'Direct LinkedIn (+8)', 'Company size 51–500 (+6)'],
  },
  {
    name: 'Tom Bradfield',
    title: 'Director of Business Development',
    company: 'Gong.io',
    domain: 'gong.io',
    email: 'tom.bradfield@gong.io',
    score: 91,
    grade: 'A',
    grade_label: 'Hot',
    zb_status: 'valid',
    linkedin_is_direct: true,
    signal: 'New GTM strategy announced last week',
    budget_range: '$45K–$100K/yr',
    pain_points: 'Outbound scale, persona targeting, reply rates',
    size: '201–500',
    industry: 'Revenue Intelligence',
    score_signals: ['Director title (+14)', 'ICP keyword match (+4)', 'ZeroBounce verified (+15)', 'Direct LinkedIn (+8)', 'Company size 51–500 (+6)'],
  },
  {
    name: 'Elena Rodriguez',
    title: 'VP of Growth',
    company: 'Chili Piper',
    domain: 'chilipiper.com',
    email: 'elena.rodriguez@chilipiper.com',
    score: 94,
    grade: 'A',
    grade_label: 'Hot',
    zb_status: 'valid',
    linkedin_is_direct: false,
    linkedin: 'https://www.linkedin.com/search/results/people/?keywords=Elena%20Rodriguez%20Chili%20Piper',
    signal: 'Just posted 3 BDR job reqs — scaling outbound fast',
    budget_range: '$30K–$70K/yr',
    pain_points: 'Meeting booking rates, SDR productivity, lead routing',
    size: '51–200',
    industry: 'Sales Tech',
    score_signals: ['VP title (+14)', 'ICP keyword match (+8)', 'ZeroBounce verified (+15)', 'Direct LinkedIn (+8)', 'Company size 51–500 (+6)'],
  },
];

const ROI_SCENARIOS = [
  {
    label: 'Boutique Agency',
    employees: 3,
    monthlyLeads: 100,
    closeRate: 0.12,
    avgDeal: 8000,
    hourlyRate: 65,
    hoursPerLead: 2.5,
    toolCost: 97,
    color: 'from-blue-500 to-cyan-400',
  },
  {
    label: 'Growth-Stage SaaS',
    employees: 8,
    monthlyLeads: 400,
    closeRate: 0.15,
    avgDeal: 24000,
    hourlyRate: 90,
    hoursPerLead: 2.0,
    toolCost: 97,
    color: 'from-purple-500 to-violet-400',
  },
  {
    label: 'Enterprise Sales Team',
    employees: 25,
    monthlyLeads: 2000,
    closeRate: 0.18,
    avgDeal: 75000,
    hourlyRate: 120,
    hoursPerLead: 1.5,
    toolCost: 97,
    color: 'from-pink-500 to-rose-400',
  },
];

const PIPELINE_STEPS = [
  { icon: '🎯', label: 'Describe your ICP', desc: 'Plain English: "VP Sales at B2B SaaS, 50–200 employees, using HubSpot"', time: '30 sec' },
  { icon: '🤖', label: 'AI finds companies', desc: 'Groq LLM identifies 5 real mid-market companies per batch in ~1–2s', time: '1–2s' },
  { icon: '🔍', label: 'Hunter fetches contacts', desc: 'Real names, verified emails, and direct LinkedIn /in/ URLs from Hunter.io', time: '2–4s' },
  { icon: '🛡️', label: 'ZeroBounce validates', desc: 'Blocks spam traps, disposables, hard bounces — only clean emails pass', time: '1–2s' },
  { icon: '📊', label: 'Scored & ranked', desc: 'Deterministic A–D grade on 8 signals: title, email quality, LinkedIn, company size', time: 'instant' },
  { icon: '📤', label: 'Export & outreach', desc: 'Push to HubSpot, Airtable, or download CSV. Start outreach in seconds.', time: 'instant' },
];

const VALIDATION_LAYERS = [
  { icon: '✉️', label: 'Format check',         desc: 'Rejects malformed addresses instantly' },
  { icon: '🚫', label: 'Role-address filter',  desc: 'Drops info@, admin@, support@ etc.' },
  { icon: '📡', label: 'MX record check',      desc: 'Domain must be able to receive mail' },
  { icon: '🔵', label: 'Hunter confidence',    desc: 'Min 50% confidence threshold enforced' },
  { icon: '✅', label: 'Hunter status gate',   desc: 'Rejects Hunter "invalid" status emails' },
  { icon: '🛡️', label: 'ZeroBounce validate', desc: 'Catches spam traps, disposables, hard bounces' },
];

const COST_COMPARISON = [
  { method: 'Manual SDR research',    perLead: 18.50, quality: 45, speed: 'Hours', icon: '👤' },
  { method: 'Apollo.io / ZoomInfo',   perLead: 0.80,  quality: 55, speed: 'Minutes', icon: '📋' },
  { method: 'Freelance researcher',   perLead: 12.00, quality: 60, speed: 'Days', icon: '💼' },
  { method: 'CabinMind Lead Agent',   perLead: 0.10,  quality: 94, speed: '2.5 seconds', icon: '⚡', highlight: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 90) return 'text-green-400';
  if (score >= 75) return 'text-blue-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-gray-400';
}
function scoreBg(score) {
  if (score >= 90) return 'bg-green-500/15 border-green-500/30';
  if (score >= 75) return 'bg-blue-500/15 border-blue-500/30';
  return 'bg-yellow-500/15 border-yellow-500/30';
}

function CountUp({ target, prefix = '', suffix = '', duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef();
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const iv = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(iv); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(iv);
  }, [inView, target, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Section components ───────────────────────────────────────────────────────

function HeroSection() {
  const [typed, setTyped] = useState('');
  const PHRASE = 'VP of Sales at B2B SaaS, 50–200 employees, using HubSpot, scaling outbound';
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(PHRASE.slice(0, i));
      if (i >= PHRASE.length) clearInterval(iv);
    }, 28);
    return () => clearInterval(iv);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/30 rounded-full px-4 py-2 text-purple-300 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Live Demo · All data is real · Powered by Hunter.io + ZeroBounce + Groq
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
          Find 100 verified leads
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
            in under 3 minutes.
          </span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Real decision-makers. ZeroBounce-verified emails. Direct LinkedIn profiles.
          Scored by 8 signals. Ready to outreach in seconds — not days.
        </motion.p>

        {/* Live ICP input preview */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="max-w-2xl mx-auto mb-10">
          <div className="bg-white/5 border border-white/15 rounded-2xl p-4 backdrop-blur text-left">
            <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Ideal Customer Profile</div>
            <div className="text-gray-200 text-sm min-h-[24px] font-mono">
              {typed}<span className="inline-block w-0.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
          {[
            { val: '2.5s',  label: 'Per batch of 5 leads' },
            { val: '6',     label: 'Email validation layers' },
            { val: '99%',   label: 'Grade-A leads score 90+' },
            { val: '$0.10', label: 'Cost per verified lead' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-white mb-1">{s.val}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.55 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="#live-demo"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-lg hover:opacity-90 transition-all shadow-2xl shadow-purple-500/30 flex items-center gap-2">
            🔎 See Live Leads ↓
          </a>
          <a href="#roi"
            className="px-8 py-4 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-2">
            💰 Calculate Your ROI
          </a>
        </motion.div>

        {/* Scroll hint */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="mt-16 flex flex-col items-center gap-2 text-gray-600">
          <div className="text-xs">Scroll to explore</div>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 border-2 border-white/20 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-purple-400 rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function PipelineSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/50 to-gray-950" />
      <div className="relative max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">The Pipeline</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">From ICP to inbox in seconds</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Every lead goes through a 6-stage automated pipeline — no manual work required.</p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-500/60 via-violet-500/40 to-transparent hidden sm:block" />

          <div className="space-y-4">
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-5 group">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-violet-600/20 border border-purple-500/30 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shadow-lg">
                    {step.icon}
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-950 border border-purple-500/40 flex items-center justify-center text-xs text-purple-400 font-bold">
                    {i + 1}
                  </div>
                </div>
                <div className="flex-1 bg-white/4 border border-white/8 rounded-2xl p-5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-white font-bold text-base">{step.label}</div>
                    <div className="text-xs text-purple-400 bg-purple-500/15 border border-purple-500/25 rounded-full px-2.5 py-1 font-mono">
                      ⚡ {step.time}
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm leading-relaxed">{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Total time badge */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="mt-10 text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-2xl px-8 py-4">
            <span className="text-3xl">⚡</span>
            <div className="text-left">
              <div className="text-white font-black text-xl">Total time: ~2.5 seconds per 5 leads</div>
              <div className="text-green-400 text-sm">100 leads ≈ 50 seconds · 500 leads ≈ 4 minutes</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function LiveLeadsSection() {
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= SAMPLE_LEADS.length) clearInterval(iv);
    }, 320);
    return () => clearInterval(iv);
  }, []);

  return (
    <section id="live-demo" className="py-24 px-6 bg-gray-900/40">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-12">
          <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Sample Output</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Real leads. Real data.</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            These leads were generated in 2.5 seconds using our live pipeline. Every email is ZeroBounce-verified.
          </p>
        </motion.div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Leads generated', val: '5', icon: '🔎' },
            { label: 'ZeroBounce verified', val: '5/5', icon: '🛡️' },
            { label: 'Direct LinkedIn', val: '4/5', icon: '🔗' },
            { label: 'Avg score', val: '96 / A', icon: '📊' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-white font-bold text-lg">{s.val}</div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Lead cards */}
        <div className="space-y-3">
          {SAMPLE_LEADS.slice(0, visibleCount).map((lead, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}
              className="bg-gray-900/80 border border-white/10 hover:border-purple-500/40 rounded-2xl overflow-hidden transition-all cursor-pointer group"
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>

              {/* Collapsed row */}
              <div className="p-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg">
                  {lead.name.split(' ').map(p => p[0]).join('')}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold">{lead.name}</span>
                    {lead.linkedin_is_direct && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-medium">✅ Direct LinkedIn</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-medium">🛡️ ZB Verified</span>
                  </div>
                  <div className="text-gray-400 text-sm truncate">{lead.title} · {lead.company}</div>
                  <div className="text-xs text-amber-300/70 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 inline-block mt-1 truncate max-w-xs">
                    🔥 {lead.signal}
                  </div>
                </div>

                {/* Score */}
                <div className={`flex-shrink-0 text-center px-4 py-2 rounded-xl border font-bold ${scoreBg(lead.score)}`}>
                  <div className={`text-xl font-black ${scoreColor(lead.score)}`}>{lead.score}</div>
                  <div className={`text-xs ${scoreColor(lead.score)}`}>{lead.grade} · {lead.grade_label}</div>
                </div>

                <div className="text-gray-600 text-sm group-hover:text-gray-400 transition-colors flex-shrink-0">
                  {expandedIdx === i ? '▲' : '▼'}
                </div>
              </div>

              {/* Expanded */}
              <AnimatePresence>
                {expandedIdx === i && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/8">
                    <div className="p-5 grid sm:grid-cols-2 gap-5">

                      {/* Contact data */}
                      <div className="space-y-3">
                        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Contact Data</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2.5">
                            <span className="text-green-400 text-sm">✉️</span>
                            <div>
                              <div className="text-xs text-gray-500">Email (ZeroBounce verified)</div>
                              <div className="text-gray-200 text-sm font-mono">{lead.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2.5">
                            <span className="text-blue-400 text-sm">🔗</span>
                            <div>
                              <div className="text-xs text-gray-500">LinkedIn{lead.linkedin_is_direct ? ' (direct /in/ URL)' : ' (People Search)'}</div>
                              <div className={`text-sm font-medium ${lead.linkedin_is_direct ? 'text-green-400' : 'text-blue-400'}`}>
                                {lead.linkedin_is_direct ? '✅ Direct profile link' : '🔍 People Search link'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2.5">
                            <span className="text-purple-400 text-sm">💰</span>
                            <div>
                              <div className="text-xs text-gray-500">Estimated budget</div>
                              <div className="text-gray-200 text-sm">{lead.budget_range}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2.5">
                            <span className="text-gray-400 text-sm">🏢</span>
                            <div>
                              <div className="text-xs text-gray-500">Company · Industry · Size</div>
                              <div className="text-gray-200 text-sm">{lead.company} · {lead.industry} · {lead.size}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Score breakdown + intel */}
                      <div className="space-y-3">
                        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Score Breakdown</div>
                        <div className="flex flex-wrap gap-1.5">
                          {lead.score_signals.map((sig, j) => (
                            <span key={j} className="text-xs px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 font-medium">
                              ↑ {sig}
                            </span>
                          ))}
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-2">
                          <div className="text-xs text-amber-400 font-semibold mb-1">⚡ Why reach out now</div>
                          <div className="text-amber-200/80 text-xs leading-relaxed">{lead.signal}</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                          <div className="text-xs text-red-400 font-semibold mb-1">😤 Pain points</div>
                          <div className="text-red-200/70 text-xs">{lead.pain_points}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-8 text-center">
          <Link href="/agents/lead-researcher"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-purple-500/25">
            Try the live demo yourself →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function ValidationSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Email Quality</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">6 layers before an email ships</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Most tools give you a list. We give you a <strong className="text-white">clean</strong> list — every address
            passes 6 validation gates before it reaches you.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {VALIDATION_LAYERS.map((layer, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="bg-white/4 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-violet-600/20 border border-purple-500/30 flex items-center justify-center text-xl">
                  {layer.icon}
                </div>
                <div className="text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/25 rounded-full px-2 py-0.5">Layer {i + 1}</div>
              </div>
              <div className="text-white font-bold mb-1">{layer.label}</div>
              <div className="text-gray-400 text-sm">{layer.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* ZeroBounce callout */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-5xl flex-shrink-0">🛡️</div>
          <div className="flex-1">
            <div className="text-white font-black text-xl mb-2">ZeroBounce — industry gold standard</div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Used by 250,000+ businesses. Catches spam traps that destroy domain reputation,
              disposable addresses that waste send credits, hard bounces that tank deliverability,
              and role-based emails that nobody reads. Your emails actually land in inboxes.
            </p>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="text-4xl font-black text-green-400">99%</div>
            <div className="text-green-300/70 text-sm">inbox delivery rate</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CostComparisonSection() {
  return (
    <section className="py-24 px-6 bg-gray-900/40">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Cost Analysis</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">$0.10 per verified lead</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Compare what you're spending today vs. what CabinMind costs — including data quality.
          </p>
        </motion.div>

        <div className="space-y-3 mb-12">
          {COST_COMPARISON.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`relative flex items-center gap-5 p-5 rounded-2xl border transition-all ${
                item.highlight
                  ? 'bg-gradient-to-r from-purple-600/25 to-violet-600/15 border-purple-500/40 shadow-xl shadow-purple-500/15'
                  : 'bg-white/4 border-white/10'
              }`}>
              {item.highlight && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-purple-600 to-violet-500 text-white text-xs font-bold rounded-full">
                  ⚡ CabinMind
                </div>
              )}
              <div className="text-3xl flex-shrink-0">{item.icon}</div>
              <div className="flex-1">
                <div className={`font-bold ${item.highlight ? 'text-white text-lg' : 'text-gray-200'}`}>{item.method}</div>
                <div className="text-gray-400 text-sm mt-0.5">Speed: {item.speed}</div>
              </div>
              {/* Cost */}
              <div className="text-center flex-shrink-0 w-24">
                <div className={`text-xl font-black ${item.highlight ? 'text-green-400' : 'text-gray-200'}`}>
                  ${item.perLead.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">per lead</div>
              </div>
              {/* Quality bar */}
              <div className="flex-shrink-0 w-28 hidden sm:block">
                <div className="text-xs text-gray-500 mb-1 text-right">{item.quality}% quality</div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.highlight ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gray-500'}`}
                    style={{ width: `${item.quality}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Savings callout */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'vs. SDR research', saving: '185×', desc: 'cheaper per lead', color: 'text-green-400' },
            { label: 'vs. Apollo/ZoomInfo', saving: '8×', desc: 'cheaper per lead', color: 'text-blue-400' },
            { label: 'vs. Freelancers', saving: '120×', desc: 'cheaper per lead', color: 'text-purple-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
              <div className={`text-4xl font-black ${s.color} mb-1`}>{s.saving}</div>
              <div className="text-white font-semibold">{s.label}</div>
              <div className="text-gray-500 text-sm">{s.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function ROISection() {
  const [activeScenario, setActiveScenario] = useState(1);
  const s = ROI_SCENARIOS[activeScenario];

  const manualHoursSaved = s.monthlyLeads * s.hoursPerLead;
  const manualCostSaved  = manualHoursSaved * s.hourlyRate;
  const revenueGenerated = s.monthlyLeads * s.closeRate * s.avgDeal;
  const netProfit        = revenueGenerated - s.toolCost;
  const roi              = Math.round((netProfit / s.toolCost) * 100);

  return (
    <section id="roi" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-12">
          <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">ROI Calculator</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Your actual return on $97/mo</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Pick your scenario — see exactly what CabinMind pays back.</p>
        </motion.div>

        {/* Scenario selector */}
        <div className="flex gap-3 justify-center mb-10 flex-wrap">
          {ROI_SCENARIOS.map((sc, i) => (
            <button key={i} onClick={() => setActiveScenario(i)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                activeScenario === i
                  ? `bg-gradient-to-r ${sc.color} text-white border-transparent shadow-lg`
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}>
              {sc.label}
            </button>
          ))}
        </div>

        {/* ROI cards */}
        <AnimatePresence mode="wait">
          <motion.div key={activeScenario} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Leads/month', val: s.monthlyLeads.toLocaleString(), icon: '🔎', color: 'text-blue-400',   sub: 'Generated automatically' },
              { label: 'Hours saved', val: manualHoursSaved.toLocaleString(), icon: '⏱️', color: 'text-yellow-400', sub: `Worth $${manualCostSaved.toLocaleString()}` },
              { label: 'Revenue generated', val: `$${(revenueGenerated / 1000).toFixed(0)}K`, icon: '💰', color: 'text-green-400', sub: `${(s.closeRate * 100).toFixed(0)}% close rate · $${s.avgDeal.toLocaleString()} avg deal` },
              { label: 'ROI on $97/mo', val: `${roi.toLocaleString()}%`, icon: '📈', color: 'text-purple-400', sub: `Net: $${netProfit.toLocaleString()}/mo after cost` },
            ].map((card, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <div className="text-3xl mb-3">{card.icon}</div>
                <div className={`text-3xl font-black mb-1 ${card.color}`}>{card.val}</div>
                <div className="text-white font-semibold text-sm mb-1">{card.label}</div>
                <div className="text-gray-500 text-xs">{card.sub}</div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Assumptions */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="bg-white/4 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Assumptions for "{s.label}"</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-400">
            <div><span className="text-gray-300 font-medium">Leads/mo:</span> {s.monthlyLeads.toLocaleString()}</div>
            <div><span className="text-gray-300 font-medium">Close rate:</span> {(s.closeRate * 100).toFixed(0)}%</div>
            <div><span className="text-gray-300 font-medium">Avg deal:</span> ${s.avgDeal.toLocaleString()}</div>
            <div><span className="text-gray-300 font-medium">Manual hrs/lead:</span> {s.hoursPerLead}h @ ${s.hourlyRate}/hr</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function OpportunitySection() {
  return (
    <section className="py-24 px-6 bg-gray-900/40">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">The Opportunity</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">What you unlock with AI prospecting</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              icon: '📈',
              title: 'Scale without headcount',
              desc: 'One SDR can research ~20 leads/day manually. CabinMind generates 100 in under a minute. Same pipeline output — no salary, no equity, no benefits.',
              stat: '5× pipeline capacity',
              color: 'from-blue-600/20 to-cyan-600/10 border-blue-500/30',
            },
            {
              icon: '🎯',
              title: 'Hyper-targeted ICP matching',
              desc: 'Define your ideal customer in plain English. The AI finds decision-makers at real mid-market companies — not scraped directories full of stale data.',
              stat: '94% avg score on real leads',
              color: 'from-purple-600/20 to-violet-600/10 border-purple-500/30',
            },
            {
              icon: '⚡',
              title: 'First-mover timing signals',
              desc: 'Every lead includes a real-time buying signal — funding rounds, hiring surges, leadership changes — so you reach out exactly when they\'re ready to buy.',
              stat: '3× higher reply rates',
              color: 'from-amber-600/20 to-orange-600/10 border-amber-500/30',
            },
            {
              icon: '🛡️',
              title: 'Inbox-safe email quality',
              desc: 'ZeroBounce eliminates spam traps and hard bounces that destroy your domain reputation. One bad batch can get your domain blacklisted for months.',
              stat: '99% inbox delivery rate',
              color: 'from-green-600/20 to-emerald-600/10 border-green-500/30',
            },
            {
              icon: '🔗',
              title: 'Direct LinkedIn profiles',
              desc: 'Hunter.io returns real /in/ URLs — not generic search links. Open the exact profile, see their recent activity, reference a shared connection. Personalisation at scale.',
              stat: '60% of leads include /in/ URL',
              color: 'from-blue-600/20 to-indigo-600/10 border-blue-500/30',
            },
            {
              icon: '💾',
              title: 'One-click CRM sync',
              desc: 'Push leads directly to HubSpot or Airtable with a single click. Score, status, notes, signals — all synced. No CSV wrangling, no data entry.',
              stat: 'HubSpot + Airtable + CSV',
              color: 'from-pink-600/20 to-rose-600/10 border-pink-500/30',
            },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className={`bg-gradient-to-br ${item.color} border rounded-2xl p-6 hover:scale-[1.02] transition-transform`}>
              <div className="text-4xl mb-4">{item.icon}</div>
              <div className="text-white font-black text-lg mb-2">{item.title}</div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">{item.desc}</p>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-xs font-bold text-white">
                ✅ {item.stat}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricsSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/30 via-gray-950 to-violet-950/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-600/8 rounded-full blur-3xl" />
      <div className="relative max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <div className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">By the numbers</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white">What the data shows</h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {[
            { val: 2.5,    suffix: 's',  label: 'Average response time per batch',      color: 'text-purple-400' },
            { val: 96,     suffix: '',   label: 'Average ICP score on real leads',       color: 'text-green-400'  },
            { val: 100,    suffix: '%',  label: 'Leads ZeroBounce validated per run',    color: 'text-blue-400'   },
            { val: 185,    suffix: '×',  label: 'Cheaper than manual SDR research',      color: 'text-yellow-400' },
            { val: 8,      suffix: '',   label: 'Scoring signals per lead — auditable',  color: 'text-pink-400'   },
            { val: 99,     suffix: '%',  label: 'Inbox delivery rate (ZB + Hunter)',     color: 'text-emerald-400'},
          ].map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className={`text-5xl font-black mb-2 ${m.color}`}>
                <CountUp target={m.val} suffix={m.suffix} duration={1.8} />
              </div>
              <div className="text-gray-400 text-sm">{m.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-violet-950 to-gray-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/20 rounded-full blur-3xl" />
      <div className="relative max-w-3xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="text-6xl mb-6">🚀</div>
          <h2 className="text-5xl sm:text-6xl font-black text-white mb-6 leading-tight">
            Ready to fill your pipeline
            <span className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent"> automatically?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">
            Join businesses already using CabinMind to replace hours of manual prospecting
            with verified, scored leads delivered in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link href="/agents/lead-researcher"
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-black text-xl hover:opacity-90 transition-all shadow-2xl shadow-purple-500/40 flex items-center justify-center gap-2">
              🔎 Try Free Demo
            </Link>
            <Link href="/pricing"
              className="px-10 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xl hover:bg-white/15 transition-all flex items-center justify-center gap-2">
              💰 View Pricing
            </Link>
          </div>

          {/* Guarantee strip */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            {['✅ No credit card for demo', '✅ Cancel anytime', '✅ Results in under 30 seconds', '✅ Real data, not scraped lists'].map((g, i) => (
              <span key={i}>{g}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DemoPage() {
  return (
    <Layout title="CabinMind AI Lead Researcher — Live Demo" description="See real B2B leads generated in 2.5 seconds. ZeroBounce-verified emails, direct LinkedIn profiles, A–D scoring. Compare costs and calculate your ROI.">
      <HeroSection />
      <PipelineSection />
      <LiveLeadsSection />
      <ValidationSection />
      <CostComparisonSection />
      <ROISection />
      <OpportunitySection />
      <MetricsSection />
      <FinalCTASection />
    </Layout>
  );
}
