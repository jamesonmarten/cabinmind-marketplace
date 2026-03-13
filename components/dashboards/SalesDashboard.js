/**
 * SalesDashboard — full product for AI Sales Assistant subscribers.
 * Features:
 *  - Outreach sequence generator (cold email → follow-up 1 → follow-up 2 → breakup)
 *  - Persona configuration (your product, ICP, tone, value prop)
 *  - Per-email copy + full sequence export
 *  - Objection handler
 *  - Sequence history (in-session)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEQUENCE_STEPS = [
  { id: 'cold', label: 'Cold Email', icon: '📧', desc: 'First touch — introduce & hook' },
  { id: 'follow1', label: 'Follow-Up 1', icon: '🔄', desc: 'Day 3 — add value' },
  { id: 'follow2', label: 'Follow-Up 2', icon: '💡', desc: 'Day 7 — different angle' },
  { id: 'breakup', label: 'Break-Up', icon: '👋', desc: 'Day 14 — last touch' },
];

const OBJECTIONS = [
  'Not interested right now',
  "We already have a solution",
  "Too expensive",
  "Send me more info",
  "Talk to my colleague",
  "No budget this quarter",
];

function EmailCard({ step, email, onCopy, copied }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 bg-white/5 border-b border-white/10">
        <span className="text-lg">{step.icon}</span>
        <div className="flex-1">
          <div className="text-white font-semibold text-sm">{step.label}</div>
          <div className="text-gray-500 text-xs">{step.desc}</div>
        </div>
        <button onClick={onCopy} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
      </div>
      <div className="px-5 py-4">
        {email ? (
          <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{email}</pre>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
            <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            Generating…
          </div>
        )}
      </div>
    </div>
  );
}

function ObjectionHandler() {
  const [objection, setObjection] = useState('');
  const [product, setProduct] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleObjection = async () => {
    if (!objection) return;
    setLoading(true); setResponse('');
    const prompt = `You are an elite sales coach. A prospect said: "${objection}". ${product ? `The product being sold: ${product}.` : ''}

Write a short, natural, non-pushy sales response that:
1. Acknowledges their concern with empathy
2. Reframes the objection with a compelling counter-point
3. Ends with a low-pressure next step (not a hard close)

Keep it under 4 sentences. Sound human, not scripted.`;

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await r.json();
      setResponse(data.reply || '');
    } catch { setResponse('Error generating response.'); }
    setLoading(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-1 text-sm">🛡️ Objection Handler</h3>
      <p className="text-gray-500 text-xs mb-4">Get an AI-crafted response to any sales objection instantly.</p>
      <div className="space-y-3">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Prospect said…</label>
          <select value={objection} onChange={e => setObjection(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50">
            <option value="">Select an objection…</option>
            {OBJECTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="custom">Custom (type below)</option>
          </select>
        </div>
        {objection === 'custom' && (
          <input value={product} onChange={e => setProduct(e.target.value)}
            placeholder="Type the objection here…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50" />
        )}
        <button onClick={handleObjection} disabled={loading || !objection}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-all">
          {loading ? 'Generating…' : '⚡ Get Response'}
        </button>
        {response && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-300 text-sm leading-relaxed">
            {response}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function SalesDashboard({ session }) {
  const [yourProduct, setYourProduct] = useState('');
  const [yourName, setYourName] = useState('');
  const [yourCompany, setYourCompany] = useState('');
  const [icpRole, setIcpRole] = useState('');
  const [icpIndustry, setIcpIndustry] = useState('');
  const [valueProp, setValueProp] = useState('');
  const [tone, setTone] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [sequence, setSequence] = useState({});
  const [copied, setCopied] = useState({});
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const generateSequence = async () => {
    if (!yourProduct || !icpRole) return;
    setLoading(true); setError(''); setSequence({});

    const signoff = yourName
      ? `${yourName}${yourCompany ? `\n${yourCompany}` : ''}`
      : '[Your Name]';
    const context = `Product/Service: ${yourProduct}\nTarget Role: ${icpRole}\nIndustry: ${icpIndustry || 'any'}\nKey Value Proposition: ${valueProp || 'saves time and money'}\nTone: ${tone}\nSender: ${signoff}`;

    const prompts = {
      cold: `Write a cold outreach email for the following context:\n${context}\n\nRequirements:\n- Subject line on the first line (prefix with "Subject: ")\n- 3–4 short paragraphs max\n- Lead with a personalised observation or pain point, not a company pitch\n- One clear CTA (book a 15-min call or reply with interest)\n- ${tone} tone\n- DO NOT use clichés like "I hope this email finds you well"\n- Sign off EXACTLY as: ${signoff}\n- NEVER invent or substitute a different sender name or company\n\nWrite the full email:`,
      follow1: `Write Follow-Up Email #1 (sent Day 3 after no reply) for:\n${context}\n\nRequirements:\n- Subject line on line 1 (prefix "Subject: ")\n- Reference the previous email briefly\n- Lead with a piece of genuine value (stat, insight, or quick tip relevant to their role)\n- Soft CTA — don't pressure\n- Keep it under 100 words in the body\n- ${tone} tone\n- Sign off EXACTLY as: ${signoff}\n- NEVER invent or substitute a different sender name or company\n\nWrite the email:`,
      follow2: `Write Follow-Up Email #2 (sent Day 7, still no reply) for:\n${context}\n\nRequirements:\n- Subject line on line 1 (prefix "Subject: ")\n- Try a completely different angle from the first two emails (e.g. a customer story, a question, a short video offer)\n- 2–3 sentences max\n- ${tone} tone\n- Sign off EXACTLY as: ${signoff}\n- NEVER invent or substitute a different sender name or company\n\nWrite the email:`,
      breakup: `Write a Break-Up Email (sent Day 14, final attempt) for:\n${context}\n\nRequirements:\n- Subject line on line 1 (prefix "Subject: ")\n- Keep it very short (2 sentences max in body)\n- Be warm and leave the door open — this is NOT aggressive\n- Classic break-up format: "I'll stop reaching out unless…"\n- ${tone} tone\n- Sign off EXACTLY as: ${signoff}\n- NEVER invent or substitute a different sender name or company\n\nWrite the email:`,
    };

    try {
      // Generate all 4 emails in parallel
      const results = await Promise.all(
        Object.entries(prompts).map(async ([key, prompt]) => {
          const r = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
          });
          const data = await r.json();
          return [key, data.reply || 'Could not generate this email.'];
        })
      );
      const seq = Object.fromEntries(results);
      setSequence(seq);
      setHistory(prev => [{ product: yourProduct, role: icpRole, ts: new Date().toLocaleTimeString(), seq }, ...prev.slice(0, 4)]);
    } catch (e) {
      setError('Generation failed. Please try again.');
    }
    setLoading(false);
  };

  const copyEmail = (key) => {
    navigator.clipboard.writeText(sequence[key] || '');
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  };

  const exportAll = () => {
    const text = SEQUENCE_STEPS.map(s => `=== ${s.label.toUpperCase()} ===\n\n${sequence[s.id] || ''}`).join('\n\n\n');
    const senderLine = [yourName, yourCompany].filter(Boolean).join(' · ');
    const header = `AI Sales Sequence${senderLine ? ` — ${senderLine}` : ''}\nProduct: ${yourProduct} | Target: ${icpRole}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    const blob = new Blob([header + text], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `sales-sequence-${Date.now()}.txt`; a.click();
  };

  const hasSequence = Object.keys(sequence).length === 4;

  return (
    <div className="space-y-6">
      {/* Config */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-bold text-lg mb-1">Build a Sales Sequence</h2>
        <p className="text-gray-400 text-sm mb-5">Generate a complete 4-email outreach sequence in seconds. Fully personalised to your product and ICP.</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Your Name *</label>
            <input value={yourName} onChange={e => setYourName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Your Company (optional)</label>
            <input value={yourCompany} onChange={e => setYourCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Your Product / Service *</label>
            <input value={yourProduct} onChange={e => setYourProduct(e.target.value)}
              placeholder="e.g. AI chatbot for e-commerce customer support"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Target Job Title / Role *</label>
            <input value={icpRole} onChange={e => setIcpRole(e.target.value)}
              placeholder="e.g. Head of Customer Success, SaaS companies"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Target Industry (optional)</label>
            <input value={icpIndustry} onChange={e => setIcpIndustry(e.target.value)}
              placeholder="e.g. B2B SaaS, Healthcare, E-commerce"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Key Value Proposition</label>
            <input value={valueProp} onChange={e => setValueProp(e.target.value)}
              placeholder="e.g. Reduces support tickets by 40% in 30 days"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50" />
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50">
              {['Professional', 'Friendly', 'Direct', 'Consultative'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={generateSequence} disabled={loading || !yourProduct || !icpRole || !yourName}
            className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2 justify-center">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating 4 emails…</> : '💌 Generate Sequence'}
          </button>
          {hasSequence && (
            <button onClick={exportAll} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all">
              ⬇️ Export All
            </button>
          )}
        </div>
        {error && <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
      </div>

      {/* Sequence output */}
      <AnimatePresence>
        {(hasSequence || loading) && (
          <motion.div key="seq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {SEQUENCE_STEPS.map(step => (
              <EmailCard key={step.id} step={step} email={sequence[step.id]} onCopy={() => copyEmail(step.id)} copied={copied[step.id]} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Objection handler */}
      <ObjectionHandler />

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-white font-semibold text-sm">📜 Recent Sequences</h3>
          </div>
          <div className="divide-y divide-white/5">
            {history.map((h, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{h.product}</div>
                  <div className="text-gray-500 text-xs">Target: {h.role} · {h.ts}</div>
                </div>
                <button onClick={() => { setYourProduct(h.product); setIcpRole(h.role); setSequence(h.seq); }}
                  className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
