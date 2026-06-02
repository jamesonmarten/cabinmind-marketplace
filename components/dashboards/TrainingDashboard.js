/**
 * TrainingDashboard — 1-on-1 AI Training product dashboard.
 * Shows session options, what to expect, and a contact/booking form.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SESSION_TYPES = [
  {
    id: 'hourly',
    icon: '⏱️',
    title: 'On-Demand Session',
    duration: '60 min',
    price: '$50/hr',
    desc: 'Book a single session anytime via Google Meet. Perfect for a specific question, one-off build, or trying before committing to the Lifetime Pass.',
    topics: ['1-on-1 Google Meet — 60 min', 'Tailored to whatever you need right now', 'Hands-on walkthrough of any CabinMind product', 'Live setup, prompt engineering, or workflow build', 'Session recording delivered within 24 hrs', 'Follow-up Q&A via email (48hr)'],
  },
  {
    id: 'lifetime',
    icon: '♾️',
    title: 'Lifetime Pass',
    duration: 'one-time payment',
    price: '$500',
    highlight: true,
    desc: 'Pay once, get unlimited 1-on-1 sessions forever — plus exclusive AI perks you can\'t get any other way.',
    topics: [
      'Unlimited 1-on-1 Google Meet sessions — no hourly fee ever',
      'Priority scheduling — first-available slots',
      'Private Slack/Discord channel with your trainer',
      'Custom AI prompt library built for your business',
      'Early access to every new CabinMind product',
      'Free monthly AI strategy review call',
      'Lifetime product update briefings',
      'Session recordings & 48hr email Q&A included',
    ],
  },
];

const FAQS = [
  { q: 'Do I need any technical knowledge?', a: 'None at all. Sessions are designed for business owners and their teams — no coding required.' },
  { q: 'What platform do we use?', a: 'All sessions are held via Google Meet. You\'ll receive a calendar invite with the link after booking.' },
  { q: 'What does the $500 Lifetime Pass include?', a: 'Unlimited 1-on-1 sessions forever, priority scheduling, a private Slack/Discord channel, a custom prompt library, early access to new products, a free monthly strategy call, and lifetime update briefings. It pays for itself in 10 hours.' },
  { q: 'Can I try a single session first?', a: 'Absolutely — book a $50/hr on-demand session to see if it\'s a good fit. You can upgrade to the Lifetime Pass at any time.' },
  { q: 'Will I get a recording?', a: 'Yes, every Google Meet session is recorded and sent to you within 24 hours so you can rewatch and share with your team.' },
  { q: 'What if I need help between sessions?', a: 'You get 48-hour follow-up Q&A via email after every session. Lifetime Pass holders also have access to a private Slack/Discord channel for ongoing support.' },
  { q: 'Can I get a custom session on a specific topic?', a: 'Absolutely — just describe what you need in the enquiry form and we\'ll tailor the session around it.' },
];

export default function TrainingDashboard({ session }) {
  const [selected, setSelected] = useState('lifetime');
  const [form, setForm]         = useState({ name: '', email: '', company: '', message: '' });
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const selectedSession = SESSION_TYPES.find(s => s.id === selected);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/demo-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    form.name,
          email:   form.email,
          company: form.company,
          message: `[1-on-1 AI Training Enquiry — ${selectedSession?.title}]\n\n${form.message}`,
          source:  'ai-training-dashboard',
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSent(true);
      setForm({ name: '', email: '', company: '', message: '' });
    } catch {
      setError('Something went wrong. Please email us directly at support@devcabin.tech');
    }
    setSending(false);
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">🎓 1-on-1 AI Training</h2>
        <p className="text-gray-400 text-sm mt-1">
          Private Google Meet sessions with a CabinMind specialist — $50/hr on-demand, or grab the <span className="text-brand-400 font-semibold">$500 Lifetime Pass</span> for unlimited sessions + exclusive AI perks.
        </p>
      </div>

      {/* Session picker */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Choose Your Plan</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {SESSION_TYPES.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`text-left p-4 rounded-2xl border transition-all ${
                selected === s.id
                  ? 'bg-brand-600/20 border-brand-500/60'
                  : s.highlight
                    ? 'bg-emerald-900/20 border-emerald-500/40 hover:border-emerald-400'
                    : 'bg-gray-900/60 border-gray-700/50 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className="font-bold text-white text-sm">{s.title}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-brand-400 font-black text-sm">{s.price}</div>
                  <div className="text-gray-500 text-[10px]">{s.duration}</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Value callout */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-start gap-3 bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-3">
          <span className="text-lg flex-shrink-0">💡</span>
          <div>
            <p className="text-white text-xs font-semibold">Lifetime Pass pays for itself fast</p>
            <p className="text-gray-500 text-xs mt-0.5">At $50/hr, just <span className="text-brand-400 font-semibold">10 hours</span> of sessions = $500. After that, every session is free — forever.</p>
          </div>
        </div>
        <div className="flex-1 flex items-start gap-3 bg-emerald-900/20 border border-emerald-500/30 rounded-xl px-4 py-3">
          <span className="text-lg flex-shrink-0">♾️</span>
          <div>
            <p className="text-white text-xs font-semibold">Lifetime Pass exclusive perks</p>
            <p className="text-gray-500 text-xs mt-0.5">Private Slack channel, custom prompt library, early product access, monthly strategy call, and more.</p>
          </div>
        </div>
      </div>

      {/* Selected session detail */}
      <AnimatePresence mode="wait">
        {selectedSession && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-brand-600/10 border border-brand-500/30 rounded-2xl p-5"
          >
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">
              {selectedSession.icon} {selectedSession.title} — What's Covered
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {selectedSession.topics.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-brand-400 flex-shrink-0">✓</span>
                  {t}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enquiry form */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-sm">📬 Book or Enquire</h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Tell us what you need and we'll get back to you within 24 hours to confirm your session.
          </p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-500/10 border border-brand-500/30 rounded-xl px-5 py-6 text-center"
          >
            <div className="text-4xl mb-3">🎉</div>
            <h4 className="text-white font-bold mb-1">Enquiry sent!</h4>
            <p className="text-gray-400 text-sm">We'll be in touch within 24 hours to confirm your session and send a calendar invite.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Your Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@yourcompany.com"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Company / Website <span className="text-gray-600">(optional)</span></label>
              <input
                type="text"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Acme Inc / acme.com"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                What do you want to achieve? *
              </label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder={`e.g. "I want to set up an AI receptionist for my dental practice and automate appointment booking. I have no tech background."`}
                rows={4}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            {/* Selected session summary */}
            <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-3">
              <span className="text-xl">{selectedSession?.icon}</span>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{selectedSession?.title}</p>
                <p className="text-xs text-gray-500">{selectedSession?.duration} · {selectedSession?.price}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-gray-300">change</button>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {sending ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
              ) : (
                '📬 Send Enquiry'
              )}
            </button>
            <p className="text-center text-xs text-gray-600">
              Or email us directly: <a href="mailto:support@devcabin.tech" className="text-gray-500 hover:text-gray-300 transition">support@devcabin.tech</a>
            </p>
          </form>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700/50">
          <h3 className="text-white font-bold text-sm">❓ Common Questions</h3>
        </div>
        <div className="divide-y divide-gray-700/30">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-3 hover:bg-white/5 transition"
              >
                <span className="text-sm text-white font-medium">{faq.q}</span>
                <span className={`text-gray-500 flex-shrink-0 transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`}>▾</span>
              </button>
              <AnimatePresence>
                {expandedFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
