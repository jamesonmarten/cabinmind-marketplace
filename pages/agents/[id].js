import Layout from '../../components/Layout';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useCheckout } from '../../hooks/useCheckout';

// ─── Per-agent rich content ────────────────────────────────────────────────
const AGENT_CONTENT = {
  receptionist: {
    gradient: 'from-blue-500 via-cyan-400 to-teal-400',
    bg: 'from-blue-900/30 to-cyan-900/10',
    icon: '🤖',
    tagline: 'Your business never sleeps. Neither does your receptionist.',
    heroDesc: 'Answer every visitor, qualify every lead, and book every appointment — automatically, 24 hours a day.',
    benefits: [
      { icon: '⚡', title: 'Instant Response', desc: 'Replies to visitors in under a second, capturing leads before they bounce.' },
      { icon: '🎯', title: 'Smart Lead Scoring', desc: 'Asks the right questions and ranks leads by urgency and fit automatically.' },
      { icon: '📅', title: 'Appointment Booking', desc: 'Syncs with your calendar and books slots without any back-and-forth.' },
      { icon: '🔗', title: 'CRM Push', desc: 'Every qualified lead gets logged to your CRM the moment the chat ends.' },
    ],
    demoTitle: 'Try It Live — Real AI, Real Answers',
    demoDesc: 'This is a live GPT-4o mini conversation. Tap a quick reply or ask anything — see exactly what your visitors will experience.',
    showChat: true,
  },
  'website-audit': {
    gradient: 'from-green-500 via-emerald-400 to-lime-400',
    bg: 'from-green-900/30 to-emerald-900/10',
    icon: '📈',
    tagline: 'Find every SEO leak. Fix them before your competitors do.',
    heroDesc: 'Deep-crawl any website in seconds — surface broken SEO, slow pages, UX dead-ends, and accessibility gaps. Get a prioritised fix list with traffic-impact estimates.',
    benefits: [
      { icon: '🔍', title: 'Full Site Crawl', desc: 'Analyses every page for broken links, slow assets, and missing metadata.' },
      { icon: '📊', title: 'SEO Scorecard', desc: 'Keyword density, title tags, schema markup — graded and prioritised by impact.' },
      { icon: '🖥️', title: 'Core Web Vitals', desc: 'Flags LCP, CLS, and FID issues before Google penalises your rankings.' },
      { icon: '📧', title: 'Instant PDF Report', desc: 'Sends a branded, white-label audit report directly to your inbox.' },
    ],
    demoTitle: 'Audit Any Website — Live Demo',
    demoDesc: 'Enter any URL (or leave blank to use the demo site). See a real audit report with actionable fixes and traffic-impact estimates.',
    showChat: false,
  },
  'blog-writer': {
    gradient: 'from-yellow-500 via-orange-400 to-red-400',
    bg: 'from-yellow-900/30 to-orange-900/10',
    icon: '✍️',
    tagline: 'Publish 10× more content without hiring a writer.',
    heroDesc: 'Type a keyword and watch a full SEO-optimised article build itself — title, intro, structured sections, and word counts — then published directly to WordPress.',
    benefits: [
      { icon: '🔑', title: 'Keyword Research', desc: 'Finds high-traffic, low-competition keywords tailored to your niche.' },
      { icon: '📝', title: 'Live Article Generation', desc: 'Watch the article write itself in real time — intro, sections, keywords.' },
      { icon: '✅', title: '2,400-Word Output', desc: 'Produces full posts optimised for Google E-E-A-T, ready to publish.' },
      { icon: '🔄', title: 'WordPress Auto-Publish', desc: 'Pushes directly to your WordPress site as a draft on a scheduled date.' },
    ],
    demoTitle: 'Watch It Write an Article Live',
    demoDesc: 'Type any topic and the agent builds a full article in real time — title, intro, and every section with SEO keywords. Try one of the example topics.',
    showChat: false,
  },
  'sales-assistant': {
    gradient: 'from-pink-500 via-rose-400 to-red-400',
    bg: 'from-pink-900/30 to-rose-900/10',
    icon: '💼',
    tagline: 'Close more deals without adding headcount.',
    heroDesc: 'Enter any prospect\'s name, company, and pain point — get a personalised 3-email sequence with open-rate benchmarks. Simulate replies to see the agent auto-update your CRM.',
    benefits: [
      { icon: '✉️', title: 'Hyper-Personalised Outreach', desc: 'Uses prospect data to craft emails that feel hand-written, never templated.' },
      { icon: '🔁', title: 'Smart Follow-up Sequences', desc: 'Sends up to 5 follow-ups on an intelligent schedule — pauses the moment they reply.' },
      { icon: '📋', title: 'CRM Auto-Logging', desc: 'Every email, open, click, and reply is logged to your CRM automatically.' },
      { icon: '📈', title: 'Reply-Rate Analytics', desc: 'Tracks open rates, click-throughs, and replies so you constantly improve.' },
    ],
    demoTitle: 'Generate a Personalised Outreach Sequence',
    demoDesc: 'Pre-filled with a real example — just hit Generate. Edit the prospect details to make it yours, then click "Simulate Reply" to see the agent react in real time.',
    showChat: false,
  },
  'lead-researcher': {
    gradient: 'from-purple-500 via-violet-400 to-indigo-400',
    bg: 'from-purple-900/30 to-violet-900/10',
    icon: '🔎',
    tagline: 'Never run out of qualified prospects again.',
    heroDesc: 'Describe your ideal customer in plain English. The agent scrapes the web, enriches with contact data and tech-stack, scores every prospect by ICP fit, and pushes to your CRM.',
    benefits: [
      { icon: '🌐', title: 'Web Prospecting', desc: 'Searches LinkedIn, directories, and industry databases to find ideal customers.' },
      { icon: '⭐', title: 'AI Fit Scoring', desc: 'Ranks prospects 0–100 against your ICP across 14 signals.' },
      { icon: '📂', title: 'Full Data Enrichment', desc: 'Appends verified email, phone, company size, and tech-stack automatically.' },
      { icon: '📤', title: 'One-Click CRM Push', desc: 'Sends enriched leads to HubSpot, Salesforce, or a downloadable CSV.' },
    ],
    demoTitle: 'Find Real Leads — Live AI Demo',
    demoDesc: 'Describe your ideal customer and the agent generates 5 fully-enriched, scored prospects in seconds. Click any lead to save them to your CRM.',
    showChat: false,
  },
};

const CATEGORY_GRADIENT = {
  'Customer Support': 'from-blue-500 to-cyan-400',
  'Marketing':        'from-green-500 to-emerald-400',
  'Content':          'from-yellow-500 to-orange-400',
  'Sales':            'from-pink-500 to-rose-400',
};

// ─── Receptionist live chat component ─────────────────────────────────────
const QUICK_REPLIES = [
  "What services do you offer?",
  "How much does it cost?",
  "Can I book a demo?",
  "Do you integrate with my CRM?",
];

function ReceptionistChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi there! 👋 I'm your AI receptionist — available 24/7 to answer questions, qualify leads, and book appointments.\n\nWhat brings you here today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('timeout');
      }
      const data = await res.json();
      const reply = data.reply || data.error || '⚠️ No response.';
      setMessages([...next, { role: 'assistant', content: reply }]);
      if (reply.toLowerCase().includes('reach out') || reply.toLowerCase().includes("noted your")) {
        setLeadCaptured(true);
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  const showQuickReplies = messages.length <= 2 && !loading;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/10 flex flex-col" style={{ height: 560 }}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xl shadow-lg">🤖</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-gray-900 rounded-full" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">AI Receptionist</div>
            <div className="text-xs text-green-400 font-medium">● Online · responds instantly</div>
          </div>
        </div>
        {leadCaptured && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="text-xs bg-green-500/20 border border-green-500/30 text-green-300 rounded-full px-3 py-1 font-medium">
            ✓ Lead captured
          </motion.div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs flex-shrink-0 mb-0.5">🤖</div>
            )}
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                m.role === 'user'
                  ? 'chat-bubble-user text-white rounded-br-sm'
                  : 'chat-bubble-agent text-gray-200 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
            <div className="chat-bubble-agent px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 bg-gray-400 rounded-full block"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick reply chips */}
      {showQuickReplies && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap flex-shrink-0">
          {QUICK_REPLIES.map((q, i) => (
            <motion.button
              key={q}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              onClick={() => sendMessage(q)}
              className="text-xs bg-blue-500/10 border border-blue-400/30 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400/60 rounded-full px-3 py-1.5 transition-all"
            >
              {q}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="px-4 py-3 border-t border-white/10 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything a visitor might ask…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-1.5"
        >
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '↑'}
        </button>
      </form>
    </div>
  );
}

// ─── Interactive demo panels ───────────────────────────────────────────────

// WEBSITE AUDITOR
function AuditDemo() {
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState('idle'); // idle | scanning | done | error
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('seo');
  const [checked, setChecked] = useState({});
  const [results, setResults] = useState(null);
  const [trafficGain, setTrafficGain] = useState(0);
  const [auditedUrl, setAuditedUrl] = useState('');
  const [auditSource, setAuditSource] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanStep, setScanStep] = useState(0);

  const SEV_COLOR = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-blue-400' };
  const SEV_BG    = { high: 'bg-red-400/10 border-red-400/20', medium: 'bg-yellow-400/10 border-yellow-400/20', low: 'bg-blue-400/10 border-blue-400/20' };
  const SEV_ICON  = { high: '🔴', medium: '🟡', low: '🔵' };

  const SCAN_STEPS = [
    '› Fetching sitemap and crawling pages…',
    '› Checking meta tags, Open Graph, and schema…',
    '› Running Lighthouse performance audit…',
    '› Analysing mobile UX and Core Web Vitals…',
    '› Checking accessibility with axe-core…',
    '› Compiling prioritised action plan…',
  ];

  async function runAudit(e) {
    e.preventDefault();
    const target = url.trim() || 'example.com';
    if (!url.trim()) setUrl('example.com');
    setStage('scanning');
    setProgress(0);
    setScanStep(0);
    setChecked({});
    setResults(null);
    setErrorMsg('');

    // Animate the progress bar while the real API call runs in parallel
    let p = 0;
    let step = 0;
    const iv = setInterval(() => {
      // Slow down near 90% — wait for real data
      const increment = p < 80 ? Math.random() * 12 + 4 : Math.random() * 2 + 0.5;
      p = Math.min(p + increment, 92);
      const newStep = Math.min(Math.floor((p / 100) * SCAN_STEPS.length), SCAN_STEPS.length - 1);
      if (newStep !== step) { step = newStep; setScanStep(newStep); }
      setProgress(p);
    }, 300);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      clearInterval(iv);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setErrorMsg('Audit timed out — please try again.');
        setStage('error');
        return;
      }
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Audit failed. Please try a different URL.');
        setStage('error');
        return;
      }

      // Finish the bar
      setProgress(100);
      setScanStep(SCAN_STEPS.length - 1);
      setResults(data.results);
      setTrafficGain(data.trafficGain);
      setAuditedUrl(data.audited);
      setAuditSource(data.source || '');
      setTimeout(() => setStage('done'), 400);
    } catch (err) {
      clearInterval(iv);
      setErrorMsg('Network error — please check your connection and try again.');
      setStage('error');
    }
  }

  const tabs    = results ? Object.entries(results) : [];
  const active  = results ? results[activeTab] : null;
  const overallScore = results
    ? Math.round(Object.values(results).reduce((s, r) => s + r.score, 0) / tabs.length)
    : 0;
  const totalIssues = results
    ? Object.values(results).reduce((s, r) => s + r.issues.length, 0)
    : 0;
  const fixedCount = Object.keys(checked).filter(k => checked[k]).length;

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-green-600/20 to-emerald-600/20">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-xl shadow-lg">📈</div>
        <div>
          <div className="text-white font-semibold text-sm">AI Website Auditor</div>
          <div className="text-xs text-gray-400">Real Lighthouse scores · Powered by Google PageSpeed</div>
        </div>
      </div>

      <div className="p-5">
        {/* URL input */}
        <form onSubmit={runAudit} className="flex gap-2 mb-5">
          <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-green-400/50 transition-colors">
            <span className="pl-3 text-gray-500 text-sm select-none">https://</span>
            <input
              type="text" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="yoursite.com"
              className="flex-1 bg-transparent px-2 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
          <button type="submit" disabled={stage === 'scanning'}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all whitespace-nowrap flex items-center gap-2">
            {stage === 'scanning' && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {stage === 'scanning' ? 'Scanning…' : 'Audit Now →'}
          </button>
        </form>

        {/* Scanning progress */}
        {stage === 'scanning' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Running real Lighthouse audit…</span>
              <span className="font-mono font-bold text-green-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                style={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-300"
              />
            </div>
            <div className="text-xs text-emerald-400/80 font-mono animate-pulse">{SCAN_STEPS[scanStep]}</div>
          </motion.div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>
            <div>
              <div className="font-semibold mb-0.5">Audit failed</div>
              <div>{errorMsg}</div>
              <div className="text-gray-500 mt-1">Try a publicly accessible URL like <button className="text-green-400 underline" onClick={() => { setUrl('web.dev'); setErrorMsg(''); setStage('idle'); }}>web.dev</button> or <button className="text-green-400 underline" onClick={() => { setUrl('example.com'); setErrorMsg(''); setStage('idle'); }}>example.com</button></div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {stage === 'done' && results && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score cards row */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {tabs.map(([key, r]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`rounded-xl p-2.5 text-center border transition-all ${
                    activeTab === key ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:border-white/15'
                  }`}>
                  <div className={`text-xl font-black ${r.score >= 90 ? 'text-green-400' : r.score >= 70 ? 'text-yellow-400' : r.score >= 50 ? 'text-orange-400' : 'text-red-400'}`}>{r.score}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{r.label}</div>
                </button>
              ))}
            </div>

            {/* Overall banner */}
            <div className="flex items-center gap-4 mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"/>
                  <motion.circle cx="24" cy="24" r="20" fill="none"
                    stroke={overallScore >= 90 ? '#4ade80' : overallScore >= 70 ? '#facc15' : overallScore >= 50 ? '#fb923c' : '#f87171'}
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - overallScore / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-black text-base">{overallScore}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm truncate">
                  <span className="text-green-400 break-all">{auditedUrl}</span>
                </div>
                <div className="text-gray-400 text-xs mt-0.5">{totalIssues} issues found · {fixedCount} marked resolved</div>
                <div className="mt-1.5 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-green-400 rounded-full transition-all duration-500"
                    style={{ width: totalIssues > 0 ? `${(fixedCount / totalIssues) * 100}%` : '0%' }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-green-400 font-bold text-sm">+{trafficGain.toLocaleString()}</div>
                <div className="text-xs text-gray-500">visits/mo potential</div>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {tabs.map(([key, r]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === key
                      ? `bg-gradient-to-r ${r.color} text-white`
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                  }`}>
                  {r.label} · {r.score}
                </button>
              ))}
            </div>

            {/* Issues with checkboxes */}
            {active && (
              <div className="space-y-2">
                {active.issues.map((issue, i) => {
                  const key = `${activeTab}-${i}`;
                  const isDone = checked[key];
                  return (
                    <motion.div key={`${activeTab}-${i}`}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`rounded-xl border transition-all ${SEV_BG[issue.sev]} ${isDone ? 'opacity-50' : ''}`}>
                      <div className="px-3 py-2.5 flex items-start gap-2.5">
                        <button onClick={() => setChecked(c => ({ ...c, [key]: !c[key] }))}
                          className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                            isDone ? 'bg-green-500 border-green-500' : 'border-white/20 hover:border-white/40'
                          }`}>
                          {isDone && <span className="text-white text-xs leading-none">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="text-xs">{SEV_ICON[issue.sev]}</span>
                            <span className={`text-xs font-bold uppercase tracking-wide ${SEV_COLOR[issue.sev]}`}>{issue.sev}</span>
                            <span className="text-xs text-emerald-400 font-medium ml-auto">{issue.impact}</span>
                          </div>
                          <div className={`text-xs leading-snug ${isDone ? 'line-through text-gray-500' : 'text-gray-300'}`}>{issue.text}</div>
                          {!isDone && <div className="text-xs text-gray-500 mt-0.5">Fix: {issue.fix}</div>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
              auditSource === 'ai'
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                : 'bg-green-500/10 border border-green-500/20 text-green-300'
            }`}>
              <span>
                {auditSource === 'ai'
                  ? '🤖 AI-generated analysis (PageSpeed quota reached) · Fix items above'
                  : '✅ Real Lighthouse data · Fix items above · Full PDF report on deploy'}
              </span>
              <span className={`font-bold flex-shrink-0 ${auditSource === 'ai' ? 'text-purple-400' : 'text-green-400'}`}>
                {auditSource === 'ai' ? 'AI audit' : 'Live scores'}
              </span>
            </div>
          </motion.div>
        )}

        {stage === 'idle' && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-3xl mb-3">🔍</div>
            <div>Enter any public website URL above and click <span className="text-white font-medium">Audit Now</span></div>
            <div className="text-xs text-gray-600 mt-1">Google PageSpeed Insights · AI fallback if quota reached · Takes 10–20s</div>
          </div>
        )}
      </div>
    </div>
  );
}

// BLOG WRITER
function BlogDemo() {
  const [topic, setTopic] = useState('');
  const [stage, setStage] = useState('idle');
  const [visibleSections, setVisibleSections] = useState(0);
  const [typedIntro, setTypedIntro] = useState('');
  const [wordCount, setWordCount] = useState(0);

  function buildArticle(t) {
    const kw = t || 'growing your business';
    return {
      title: `The Complete Guide to ${t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Growing Your Business'} in 2026`,
      intro: `Every day without a solid ${kw} strategy is a day your competitors pull further ahead. We analysed 1,200 businesses and distilled what the top 5% do differently — and it comes down to 6 repeatable steps anyone can implement starting this week.`,
      sections: [
        { h2: `Why Most ${t ? t.split(' ').slice(-1)[0] : 'Business'} Strategies Fail in Year One`, words: 380, keywords: ['mistakes', 'pitfalls', kw] },
        { h2: 'The Framework That 3× Revenue Without Extra Headcount', words: 520, keywords: ['framework', 'ROI', 'automation'] },
        { h2: 'Step-by-Step: Implementing in 30 Days', words: 640, keywords: ['how to', 'tutorial', 'checklist'] },
        { h2: `${t ? t.split(' ').slice(-1)[0] : 'Growth'} Case Studies: Real Businesses, Real Numbers`, words: 410, keywords: ['case study', 'proof', 'results'] },
        { h2: 'The 7 Tools We Recommend (3 Are Free)', words: 290, keywords: ['tools', 'software', 'stack'] },
        { h2: 'Your Week-by-Week 30-Day Action Plan', words: 320, keywords: ['action plan', '30 days', 'quick wins'] },
      ],
    };
  }

  function generate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    const article = buildArticle(topic);
    setStage('writing');
    setVisibleSections(0);
    setTypedIntro('');
    setWordCount(0);

    // Type out intro
    let charIdx = 0;
    const introIv = setInterval(() => {
      charIdx += 3;
      setTypedIntro(article.intro.slice(0, charIdx));
      setWordCount(w => w + 2);
      if (charIdx >= article.intro.length) {
        clearInterval(introIv);
        // Then drip sections
        let sec = 0;
        const secIv = setInterval(() => {
          sec++;
          setVisibleSections(sec);
          setWordCount(w => w + (article.sections[sec - 1]?.words || 0));
          if (sec >= article.sections.length) { clearInterval(secIv); setStage('done'); }
        }, 420);
      }
    }, 18);
  }

  const article = buildArticle(topic);
  const EXAMPLE_TOPICS = ['AI automation for small business', 'email marketing that converts', 'SaaS churn reduction'];

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-yellow-600/20 to-orange-600/20">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-400 flex items-center justify-center text-xl shadow-lg">✍️</div>
        <div>
          <div className="text-white font-semibold text-sm">AI Blog Writer</div>
          <div className="text-xs text-gray-400">Full SEO-optimised articles, generated live</div>
        </div>
        {wordCount > 0 && (
          <div className="ml-auto text-right">
            <div className="text-yellow-400 font-bold text-sm">{wordCount.toLocaleString()}</div>
            <div className="text-xs text-gray-500">words</div>
          </div>
        )}
      </div>

      <div className="p-5">
        <form onSubmit={generate} className="mb-4">
          <div className="flex gap-2 mb-2">
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Enter a keyword or topic…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
            />
            <button type="submit" disabled={stage === 'writing' || !topic.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all whitespace-nowrap flex items-center gap-2">
              {stage === 'writing' && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {stage === 'writing' ? 'Writing…' : 'Generate →'}
            </button>
          </div>
          {stage === 'idle' && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Try:</span>
              {EXAMPLE_TOPICS.map(t => (
                <button key={t} type="button" onClick={() => setTopic(t)}
                  className="text-xs text-yellow-300/70 bg-yellow-400/10 hover:bg-yellow-400/20 rounded-full px-2.5 py-1 transition-colors border border-yellow-400/20">
                  {t}
                </button>
              ))}
            </div>
          )}
        </form>

        {(stage === 'writing' || stage === 'done') && (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {/* Metadata pills */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 flex-wrap">
              <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 rounded-full px-2.5 py-0.5">✓ SEO Score: 94/100</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-2.5 py-0.5">Readability: Grade 8</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full px-2.5 py-0.5">E-E-A-T Optimised</span>
              {stage === 'done' && <span className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full px-2.5 py-0.5">Ready to publish</span>}
            </motion.div>

            {/* Title */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5 font-semibold">Article Title</div>
              <div className="text-white font-bold text-base leading-snug">{article.title}</div>
            </motion.div>

            {/* Intro with typewriter */}
            {typedIntro && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5 font-semibold">Introduction</div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {typedIntro}
                  {stage === 'writing' && typedIntro.length < article.intro.length && (
                    <span className="inline-block w-0.5 h-4 bg-yellow-400 ml-0.5 align-middle animate-pulse" />
                  )}
                </p>
              </motion.div>
            )}

            {/* Sections */}
            {article.sections.slice(0, visibleSections).map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="text-white text-sm font-bold">{s.h2}</div>
                  <span className="text-xs text-gray-500 flex-shrink-0">~{s.words} words</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {s.keywords.map((k, j) => (
                    <span key={j} className="text-xs text-yellow-300/70 bg-yellow-400/10 rounded-full px-2 py-0.5 border border-yellow-400/10">#{k}</span>
                  ))}
                </div>
              </motion.div>
            ))}

            {stage === 'done' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300 flex items-center justify-between">
                <span>✅ Sent to WordPress as draft · Scheduled: tomorrow 9am</span>
                <span className="font-bold text-yellow-400">~{wordCount.toLocaleString()} words</span>
              </motion.div>
            )}
          </div>
        )}

        {stage === 'idle' && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-3xl mb-3">✍️</div>
            <div>Type a topic above and click <span className="text-white font-medium">Generate</span></div>
            <div className="text-xs text-gray-600 mt-1">Full 2,400-word article with SEO optimisation</div>
          </div>
        )}
      </div>
    </div>
  );
}

// SALES ASSISTANT
function SalesDemo() {
  const [form, setForm] = useState({ name: 'Sarah Chen', company: 'Growthly SaaS', pain: 'losing deals to slow follow-up' });
  const [stage, setStage] = useState('idle');
  const [visibleEmails, setVisibleEmails] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [replying, setReplying] = useState(null);
  const [replied, setReplied] = useState({});

  function buildEmails(name, company, pain) {
    const first = name.split(' ')[0] || 'there';
    return [
      {
        day: 'Day 1', time: '9:00am',
        subject: `Quick question, ${first} — re: ${company || 'your pipeline'}`,
        body: `Hi ${first},\n\nI noticed ${company || 'your team'} is ${pain || 'scaling fast'} — we've helped 40+ similar companies cut response time from hours to seconds using AI agents.\n\nOne of our clients (B2B SaaS, 80 employees) went from 12% to 34% close rate in 6 weeks.\n\nWorth a 15-min call this week?\n\nBest,\nAlex @ CabinMind`,
        open: '84%', reply: '26%', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20',
      },
      {
        day: 'Day 3', time: '10:30am',
        subject: `One idea specific to ${company || 'your situation'}`,
        body: `${first},\n\nFollowing up with one concrete idea:\n\nFor teams ${pain || 'dealing with slow follow-up'}, we auto-enrol every lead into a personalised 5-touch sequence the moment they fill out a form — no manual work.\n\nAverage result: 3× more replies, 40% less time spent on outreach.\n\nHappy to show you a live demo — takes 10 minutes. Does Thursday 2pm work?\n\nAlex`,
        open: '71%', reply: '22%', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20',
      },
      {
        day: 'Day 7', time: '2:00pm',
        subject: `Last one from me, ${first}`,
        body: `${first} — keeping this short.\n\nIf ${pain || 'this challenge'} isn't a priority right now, no worries — just reply "not now" and I'll give you space.\n\nBut if your team is still ${pain || 'leaving money on the table'} and wants to fix it this quarter, we can have you live in under 5 minutes.\n\nAlex\n\nP.S. — we're offering free setup this month only.`,
        open: '55%', reply: '18%', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20',
      },
    ];
  }

  function generate(e) {
    e.preventDefault();
    setStage('generating');
    setVisibleEmails(0);
    setExpanded(null);
    setReplied({});
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisibleEmails(i);
      if (i === 1) setExpanded(0); // auto-expand first email
      if (i >= 3) { clearInterval(iv); setStage('done'); }
    }, 700);
  }

  function simulateReply(i) {
    setReplying(i);
    setTimeout(() => {
      setReplying(null);
      setReplied(r => ({ ...r, [i]: true }));
    }, 1800);
  }

  const emails = buildEmails(form.name, form.company, form.pain);
  const EXAMPLES = [
    { name: 'Sarah Chen', company: 'Growthly SaaS', pain: 'losing deals to slow follow-up' },
    { name: 'Marcus Reid', company: 'TechBuild Co', pain: 'reps wasting time on manual data entry' },
    { name: 'Priya Kapoor', company: 'Scaleup Agency', pain: 'no system for nurturing cold leads' },
  ];

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-pink-600/20 to-rose-600/20">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-xl shadow-lg">💼</div>
        <div>
          <div className="text-white font-semibold text-sm">AI Sales Assistant</div>
          <div className="text-xs text-gray-400">Personalised outreach sequences that convert</div>
        </div>
      </div>

      <div className="p-5">
        <form onSubmit={generate} className="space-y-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prospect name</label>
              <input type="text" value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-400/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Company</label>
              <input type="text" value={form.company}
                onChange={e => setForm(f => ({...f, company: e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-400/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Their biggest pain point</label>
            <input type="text" value={form.pain}
              onChange={e => setForm(f => ({...f, pain: e.target.value}))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-400/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 items-center">
            <button type="submit" disabled={stage === 'generating'}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-2">
              {stage === 'generating' && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {stage === 'generating' ? 'Generating…' : '✉️ Generate 3-Email Sequence →'}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-gray-500">Examples:</span>
            {EXAMPLES.map((ex, i) => (
              <button key={i} type="button" onClick={() => setForm(ex)}
                className="text-xs text-pink-300/70 bg-pink-400/10 hover:bg-pink-400/20 rounded-full px-2.5 py-1 border border-pink-400/20 transition-colors">
                {ex.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </form>

        {(stage === 'generating' || stage === 'done') && (
          <div className="space-y-2">
            {emails.slice(0, visibleEmails).map((email, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`border rounded-xl overflow-hidden ${replied[i] ? 'bg-green-500/5 border-green-500/20' : email.bg}`}>
                <button onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 flex-shrink-0 ${email.color} bg-current/10`}
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      {email.day} · {email.time}
                    </span>
                    <span className="text-white text-xs font-medium truncate">{email.subject}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    {replied[i] ? (
                      <span className="text-xs text-green-400 font-bold">✓ Replied</span>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500">Open <span className={`font-bold ${email.color}`}>{email.open}</span></span>
                        <span className="text-xs text-gray-500">Reply <span className="font-bold text-white">{email.reply}</span></span>
                      </>
                    )}
                    <span className="text-gray-500 text-xs">{expanded === i ? '▲' : '▼'}</span>
                  </div>
                </button>
                {expanded === i && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-sans mt-3 bg-black/20 rounded-lg p-3">{email.body}</pre>
                    {!replied[i] && (
                      <div className="mt-2.5 flex gap-2">
                        <button onClick={() => simulateReply(i)} disabled={replying !== null}
                          className="text-xs bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5">
                          {replying === i ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : '↩'}
                          {replying === i ? 'Sending reply…' : 'Simulate Reply'}
                        </button>
                        <span className="text-xs text-gray-500 flex items-center">← See how the agent auto-logs this</span>
                      </div>
                    )}
                    {replied[i] && (
                      <div className="mt-2.5 text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2 border border-green-500/20">
                        ✅ Reply detected · Sequence paused · Lead moved to "Hot" in CRM · Task created for Alex
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {stage === 'done' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-xs text-pink-300 flex items-center justify-between">
                <span>✅ Logged to CRM · Sending starts 9am tomorrow · Auto-pauses on reply</span>
                <span className="font-bold text-pink-400 flex-shrink-0">84% avg open rate</span>
              </motion.div>
            )}
          </div>
        )}

        {stage === 'idle' && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-3xl mb-3">💼</div>
            <div>Fill in a prospect above and click <span className="text-white font-medium">Generate</span></div>
            <div className="text-xs text-gray-600 mt-1">Pre-filled with an example — just hit Generate to see it work</div>
          </div>
        )}
      </div>
    </div>
  );
}

// LEAD RESEARCHER
function LeadDemo() {
  const [icp, setIcp] = useState('');
  const [stage, setStage] = useState('idle');
  const [leads, setLeads] = useState([]);
  const [visibleLeads, setVisibleLeads] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedLead, setExpandedLead] = useState(null);
  const [savedLeads, setSavedLeads] = useState({});

  const SCORE_COLOR = s => s >= 90 ? 'text-green-400' : s >= 75 ? 'text-blue-400' : s >= 60 ? 'text-yellow-400' : 'text-gray-400';
  const SCORE_BG    = s => s >= 90 ? 'bg-green-400/20 border-green-400/30' : s >= 75 ? 'bg-blue-400/20 border-blue-400/30' : s >= 60 ? 'bg-yellow-400/20 border-yellow-400/30' : 'bg-gray-400/20 border-gray-400/30';
  const SCORE_LABEL = s => s >= 90 ? 'Hot · A' : s >= 75 ? 'Warm · B' : s >= 60 ? 'Cool · C' : 'Cold · D';

  const STATUS_MSGS = [
    '› Scanning LinkedIn profiles and company directories…',
    '› Searching GitHub, AngelList, and Crunchbase…',
    '› Enriching with email, phone, and tech-stack data…',
    '› Running ICP fit-score model against 14 signals…',
    '› Sorting by predicted conversion likelihood…',
  ];

  const EXAMPLE_ICPS = [
    'SaaS COOs at 10–200 person B2B companies using HubSpot',
    'E-commerce founders with $500K–$5M revenue struggling with customer retention',
    'Marketing directors at US law firms with 50–200 employees',
  ];

  async function research(e) {
    e.preventDefault();
    if (!icp.trim()) return;
    setStage('researching');
    setLeads([]);
    setVisibleLeads(0);
    setErrorMsg('');
    setExpandedLead(null);
    setSavedLeads({});

    let msgIdx = 0;
    setStatusMsg(STATUS_MSGS[0]);
    const msgIv = setInterval(() => {
      msgIdx = (msgIdx + 1) % STATUS_MSGS.length;
      setStatusMsg(STATUS_MSGS[msgIdx]);
    }, 1100);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icp, isDemo: true, batchNum: 1 }),
      });
      clearInterval(msgIv);
      // Guard against non-JSON responses (e.g. Vercel HTML error pages on timeout)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Lead generation timed out — please try again.');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate leads');
      if (!Array.isArray(data.leads)) throw new Error('Unexpected response — please try again.');
      setLeads(data.leads);
      let i = 0;
      const drip = setInterval(() => {
        i++;
        setVisibleLeads(i);
        if (i >= data.leads.length) { clearInterval(drip); setStage('done'); }
      }, 380);
    } catch (err) {
      clearInterval(msgIv);
      setErrorMsg(err.message);
      setStage('error');
    }
  }

  const visLeads = leads.slice(0, visibleLeads);
  const avgScore = visLeads.length > 0 ? Math.round(visLeads.reduce((s, l) => s + l.score, 0) / visLeads.length) : 0;
  const estPipeline = visLeads.length > 0 ? (visLeads.reduce((s, l) => s + l.score, 0) * 520) : 0;

  const AVATAR_COLORS = [
    'from-purple-500 to-violet-400',
    'from-pink-500 to-rose-400',
    'from-blue-500 to-cyan-400',
    'from-green-500 to-emerald-400',
    'from-orange-500 to-amber-400',
  ];

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-violet-600/20">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-400 flex items-center justify-center text-xl shadow-lg">🔎</div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm">AI Lead Researcher</div>
          <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live · GPT-4o mini
          </div>
        </div>
        {visLeads.length > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-purple-400 font-bold text-sm">${(estPipeline).toLocaleString()}</div>
            <div className="text-xs text-gray-500">est. pipeline</div>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* ICP input */}
        <form onSubmit={research} className="mb-4">
          <div className="flex gap-2 mb-2">
            <input
              type="text" value={icp} onChange={e => setIcp(e.target.value)}
              placeholder="Describe your ideal customer…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50 transition-colors"
            />
            <button type="submit" disabled={stage === 'researching' || !icp.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all whitespace-nowrap flex items-center gap-2">
              {stage === 'researching' && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {stage === 'researching' ? 'Searching…' : 'Find Leads →'}
            </button>
          </div>
          {stage === 'idle' && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-gray-500">Try:</span>
              {EXAMPLE_ICPS.map((ex, i) => (
                <button key={i} type="button" onClick={() => setIcp(ex)}
                  className="text-xs text-purple-300/70 bg-purple-400/10 hover:bg-purple-400/20 rounded-full px-2.5 py-1 border border-purple-400/20 transition-colors">
                  {ex.split(' ').slice(0, 3).join(' ')}…
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Scanning status */}
        {stage === 'researching' && (
          <div className="mb-4 space-y-2">
            <div className="text-xs text-purple-300 font-mono animate-pulse">{statusMsg}</div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-purple-400 to-violet-400 rounded-full"
                animate={{ width: ['15%', '85%'] }} transition={{ duration: 8, ease: 'linear' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 mb-3">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Stats row */}
        {visLeads.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Leads found', val: `${visLeads.length}/${leads.length}` },
              { label: 'Avg fit score', val: avgScore },
              { label: 'Saved to CRM', val: Object.values(savedLeads).filter(Boolean).length },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                <div className="text-white font-bold text-base">{s.val}</div>
                <div className="text-gray-500 text-xs">{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Lead cards */}
        {visLeads.length > 0 && (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {visLeads.map((l, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-all">
                <div className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedLead(expandedLead === i ? null : i)}>
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {(l.name || '?')[0]}{(l.name || '?').split(' ')[1]?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{l.name}</div>
                    <div className="text-gray-400 text-xs truncate">{l.title} · {l.company}</div>
                    <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                      {(l.tech || '').split(',').slice(0, 2).map((t, j) => (
                        <span key={j} className="text-xs text-purple-300/60 bg-purple-400/10 rounded-full px-1.5 py-0.5">{t.trim()}</span>
                      ))}
                      {l.signal && (
                        <span className="text-xs text-amber-300/70 bg-amber-400/10 rounded-full px-1.5 py-0.5 truncate max-w-[140px]">🔥 {l.signal}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className={`text-lg font-black ${SCORE_COLOR(l.score)}`}>{l.score}</div>
                    <div className={`text-xs rounded-full px-2 py-0.5 border font-medium ${SCORE_BG(l.score)} ${SCORE_COLOR(l.score)}`}>
                      {SCORE_LABEL(l.score)}
                    </div>
                  </div>
                </div>

                {expandedLead === i && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="px-3 pb-3 border-t border-white/5 space-y-2 pt-2.5">
                    {l.signal && (
                      <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 text-xs text-amber-300">
                        <span className="font-semibold">🔥 Buying signal:</span> {l.signal}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-black/20 rounded-lg p-2">
                        <div className="text-gray-500 mb-0.5">Email</div>
                        <div className={`truncate font-mono ${l._demo_masked ? 'text-gray-600 italic' : 'text-gray-300'}`}>
                          {l.email || 'Not found'}
                          {l._demo_masked && <span className="ml-1 text-purple-500 not-italic">🔒 Unlock</span>}
                        </div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2">
                        <div className="text-gray-500 mb-0.5">LinkedIn</div>
                        <div className="text-gray-300">
                          {l.linkedin_is_direct
                            ? <span className="text-gray-600 italic">🔒 Unlock direct link</span>
                            : l.linkedin
                              ? <a href={l.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Search →</a>
                              : '—'}
                        </div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2">
                        <div className="text-gray-500 mb-0.5">Score</div>
                        <div className={`font-bold ${SCORE_COLOR(l.score)}`}>{l.score} · {l.grade || '—'}</div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2">
                        <div className="text-gray-500 mb-0.5">Company size</div>
                        <div className="text-gray-300">{l.size || '—'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSavedLeads(s => ({ ...s, [i]: true }))}
                        disabled={savedLeads[i]}
                        className={`flex-1 text-xs py-1.5 rounded-lg transition-all font-medium ${
                          savedLeads[i]
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-400/30 hover:bg-purple-500/30'
                        }`}>
                        {savedLeads[i] ? '✓ Saved to CRM' : '+ Save to CRM'}
                      </button>
                      <button className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-all font-medium">
                        ✉ Start Outreach
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}

            {stage === 'done' && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 flex items-center justify-between gap-2">
                  <span>✅ {leads.length} leads scored · Emails &amp; LinkedIn locked in demo</span>
                  <span className={`font-bold flex-shrink-0 ${SCORE_COLOR(avgScore)}`}>Avg {avgScore} pts</span>
                </motion.div>
                {/* Upgrade wall */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="mt-3 bg-gradient-to-br from-purple-900/60 to-violet-900/40 border border-purple-500/30 rounded-xl p-5 text-center">
                  <div className="text-2xl mb-2">🔒</div>
                  <div className="text-white font-bold text-sm mb-1">Full emails, LinkedIn profiles &amp; unlimited leads</div>
                  <div className="text-gray-400 text-xs mb-3 leading-relaxed">
                    Purchase to unlock verified emails, direct LinkedIn /in/ profiles,
                    ZeroBounce validation, score breakdown, pipeline CRM, and HubSpot/Airtable export.
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 mb-4 text-xs">
                    {['✅ Real emails','🔗 LinkedIn /in/','🛡️ ZeroBounce','📊 Score audit','♾️ 100 leads/run','💾 Pipeline CRM'].map(f => (
                      <span key={f} className="px-2 py-1 bg-white/10 rounded-full text-gray-200">{f}</span>
                    ))}
                  </div>
                  <a href="/agents/lead-researcher#pricing"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-purple-500/30">
                    Unlock Full Access →
                  </a>
                </motion.div>
              </>
            )}
          </div>
        )}

        {stage === 'idle' && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-3xl mb-3">🔎</div>
            <div>Describe your ideal customer above and click <span className="text-white font-medium">Find Leads</span></div>
            <div className="text-xs text-gray-600 mt-1">AI generates 5 real, enriched prospects with contact data</div>
          </div>
        )}
      </div>
    </div>
  );
}

const DEMO_COMPONENTS = {
  receptionist: ReceptionistChat,
  'website-audit': AuditDemo,
  'blog-writer': BlogDemo,
  'sales-assistant': SalesDemo,
  'lead-researcher': LeadDemo,
};

// ─── Main page ─────────────────────────────────────────────────────────────
export default function AgentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [agent, setAgent] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Must be called before any early returns — Rules of Hooks
  const { startCheckout, loading: checkoutLoading, error: checkoutError } = useCheckout();

  // Parallax motion values — driven by window scroll, fully client-side
  const scrollY = useMotionValue(0);
  const heroY = useTransform(scrollY, [0, 600], ['0%', '30%']);
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0]);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => scrollY.set(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollY]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agents?id=${id}`)
      .then((r) => r.json())
      .then(setAgent);
  }, [id]);

  if (!agent) {
    return (
      <Layout fullBleed>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full border-2 border-brand-400 border-t-transparent"
          />
        </div>
      </Layout>
    );
  }

  const content = AGENT_CONTENT[id] || {};
  const gradient = content.gradient || 'from-brand-400 to-purple-500';
  const DemoComponent = DEMO_COMPONENTS[id];
  const catGradient = CATEGORY_GRADIENT[agent.category] || gradient;

  return (
    <Layout title={`${agent.name} – CabinMind`} fullBleed>

      {/* ── PARALLAX HERO ─────────────────────────────── */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Parallax background layer */}
        <motion.div style={mounted ? { y: heroY } : {}} className="absolute inset-0 pointer-events-none">
          <div className={`absolute inset-0 bg-gradient-to-br ${content.bg || 'from-brand-900/40 to-purple-900/10'}`} />
          <div className="absolute inset-0 grid-bg opacity-40" />
          {/* Animated orbs */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br ${gradient} blur-3xl opacity-15`}
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className={`absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr ${gradient} blur-3xl opacity-10`}
          />
        </motion.div>

        <motion.div
          style={mounted ? { opacity: heroOpacity } : {}}
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16 text-center"
        >
          {/* Back link */}
          <Link href="/agents" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-10 transition-colors group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Marketplace
          </Link>

          {/* Category pill + icon */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-4xl shadow-2xl`}>
              {content.icon || '⚡'}
            </div>
          </motion.div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-block text-xs font-semibold uppercase tracking-widest text-gray-400 bg-white/5 border border-white/10 rounded-full px-4 py-1 mb-4"
          >
            {agent.category}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl sm:text-6xl font-black text-white mb-4 leading-tight"
          >
            {agent.name}
          </motion.h1>

          {content.tagline && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl gradient-text font-semibold mb-4"
            >
              {content.tagline}
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {content.heroDesc || agent.description}
          </motion.p>

          {/* Price + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {agent.price && (
              <div className="glass border border-white/10 rounded-2xl px-6 py-3 text-center">
                <div className="text-3xl font-black text-white">${agent.price}<span className="text-lg text-gray-400 font-normal">/mo</span></div>
                <div className="text-xs text-gray-500 mt-0.5">Cancel anytime</div>
              </div>
            )}
            <button
              onClick={() => startCheckout(id)}
              disabled={checkoutLoading}
              className={`px-8 py-4 rounded-xl bg-gradient-to-r ${gradient} text-white font-bold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-xl disabled:opacity-60 disabled:scale-100 flex items-center gap-2`}
            >
              {checkoutLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redirecting…
                </>
              ) : (
                'Deploy This Agent →'
              )}
            </button>
          </motion.div>
          {checkoutError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-red-400 text-sm">
              ⚠️ {checkoutError}
            </motion.p>
          )}
        </motion.div>
      </section>

      {/* ── BENEFITS GRID ─────────────────────────────── */}
      {content.benefits && (
        <section className="py-20 px-4 relative">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-black text-white text-center mb-12"
            >
              What it <span className="gradient-text">does for you</span>
            </motion.h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {content.benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-6 border border-white/5 hover:border-white/15 transition-all group"
                >
                  <div className="text-3xl mb-3">{b.icon}</div>
                  <h3 className="text-white font-bold text-lg mb-2">{b.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── LIVE DEMO / SHOWCASE ───────────────────────── */}
      {DemoComponent && (
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-3xl font-black text-white mb-3">{content.demoTitle}</h2>
              <p className="text-gray-400">{content.demoDesc}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <DemoComponent />
            </motion.div>
          </div>
        </section>
      )}

      {/* ── FEATURES / TOOLS / ACTIONS ────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-black text-white text-center mb-12"
          >
            Technical <span className="gradient-text">Capabilities</span>
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'Features', items: agent.features, icon: '✨', color: 'border-brand-400/30 hover:border-brand-400/60' },
              { label: 'Tools',    items: agent.tools,    icon: '🔧', color: 'border-purple-400/30 hover:border-purple-400/60' },
              { label: 'Actions',  items: agent.actions,  icon: '⚡', color: 'border-pink-400/30 hover:border-pink-400/60' },
            ].map((col, ci) => (
              <motion.div
                key={ci}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: ci * 0.15 }}
                className={`glass rounded-2xl p-6 border ${col.color} transition-all`}
              >
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-2xl">{col.icon}</span>
                  <h3 className="text-white font-bold text-lg">{col.label}</h3>
                </div>
                <ul className="space-y-3">
                  {col.items.map((item, ii) => (
                    <li key={ii} className="flex items-start gap-2.5 text-gray-300 text-sm">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br ${catGradient} flex-shrink-0`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────────── */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto glass rounded-3xl p-12 text-center relative overflow-hidden border border-white/10"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${content.bg || 'from-brand-900/40 to-purple-900/10'} pointer-events-none`} />
          <div className="relative z-10">
            <div className="text-5xl mb-4">{content.icon || '⚡'}</div>
            <h2 className="text-3xl font-black text-white mb-3">Ready to deploy {agent.name}?</h2>
            <p className="text-gray-400 mb-8">Set up in 5 minutes. Cancel anytime. No engineering required.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => startCheckout(id)}
                disabled={checkoutLoading}
                className={`px-8 py-4 rounded-xl bg-gradient-to-r ${gradient} text-white font-bold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-xl disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2`}
              >
                {checkoutLoading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  `Get Started — $${agent.price}/mo`
                )}
              </button>
              <Link href="/agents" className="px-8 py-4 rounded-xl glass border border-white/10 text-white font-semibold hover:border-white/20 transition-all">
                Browse More Agents
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} Dev Cabin Technologies · CabinMind
      </footer>
    </Layout>
  );
}