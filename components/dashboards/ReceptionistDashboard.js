/**
 * ReceptionistDashboard — full product for AI Receptionist subscribers.
 * Features:
 *  - Live chat powered by /api/chat (GPT-4o mini)
 *  - Embeddable widget script tag with config
 *  - Conversation log / export
 *  - Custom persona settings
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_STARTERS = [
  "I'd like to book an appointment",
  "Can I get a quote?",
  "What are your opening hours?",
  "I need to speak to someone urgently",
];

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm mr-2 flex-shrink-0 mt-0.5">
          🤖
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-tr-sm'
            : 'bg-white/10 text-gray-200 rounded-tl-sm border border-white/10'
        }`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

function LiveChatTab({ session }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi there! I'm Aria, your AI receptionist. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState({ name: 'Aria', business: 'My Business', tone: 'professional' });
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-10),
          agentName: persona.name,
          businessName: persona.business,
        }),
      });
      const data = await r.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I had trouble responding.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }
    setLoading(false);
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === 'user' ? 'Visitor' : 'Aria'}: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `chat-log-${Date.now()}.txt`; a.click();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Chat window */}
      <div className="lg:col-span-2 flex flex-col">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ height: '520px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/30 to-cyan-500/20 px-4 py-3 flex items-center gap-3 border-b border-white/10">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white font-semibold text-sm">{persona.name} · Live Chat</span>
            <span className="ml-auto text-xs text-gray-400">GPT-4o mini</span>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
            {loading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm ml-10">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
                Aria is typing…
              </div>
            )}
            <div ref={endRef} />
          </div>
          {/* Quick starters */}
          <div className="px-4 pt-2 flex flex-wrap gap-2">
            {QUICK_STARTERS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                {q}
              </button>
            ))}
          </div>
          {/* Input */}
          <div className="p-3 flex gap-2">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
            <button onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-all">
              Send
            </button>
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          <button onClick={() => setMessages([{ role: 'assistant', content: `Hi! I'm ${persona.name}, your AI receptionist. How can I help?` }])}
            className="text-sm px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
            🔄 Reset Chat
          </button>
          <button onClick={exportChat}
            className="text-sm px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
            ⬇️ Export Log
          </button>
        </div>
      </div>

      {/* Settings panel */}
      <div className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">⚙️ Agent Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Agent Name</label>
              <input value={persona.name} onChange={e => setPersona(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Your Business Name</label>
              <input value={persona.business} onChange={e => setPersona(p => ({ ...p, business: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Tone</label>
              <select value={persona.tone} onChange={e => setPersona(p => ({ ...p, tone: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
                {['professional', 'friendly', 'casual', 'formal'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 text-sm">📊 Session Stats</h3>
          <div className="space-y-2">
            {[
              ['Messages sent', messages.filter(m => m.role === 'user').length],
              ['Replies received', messages.filter(m => m.role === 'assistant').length],
              ['Avg reply length', `${Math.round(messages.filter(m=>m.role==='assistant').reduce((a,m)=>a+m.content.length,0) / Math.max(1, messages.filter(m=>m.role==='assistant').length))} chars`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const THEME_PRESETS = [
  { label: 'Violet',    color: '#6d28d9', bg: '#0f172a' },
  { label: 'Ocean',     color: '#0284c7', bg: '#0c1a2e' },
  { label: 'Forest',    color: '#16a34a', bg: '#0d1f14' },
  { label: 'Rose',      color: '#e11d48', bg: '#1c0a10' },
  { label: 'Amber',     color: '#d97706', bg: '#1c1208' },
  { label: 'Slate',     color: '#475569', bg: '#0f172a' },
  { label: 'Light',     color: '#6d28d9', bg: '#f8fafc' },
];

function EmbedTab({ session }) {
  const [copied, setCopied]         = useState('');
  const [agentName, setAgentName]   = useState('Aria');
  const [bizName, setBizName]       = useState('');
  const [greeting, setGreeting]     = useState('Hi! How can I help you today?');
  const [context, setContext]       = useState('');
  const [color, setColor]           = useState('#6d28d9');
  const [bg, setBg]                 = useState('#0f172a');
  const [position, setPosition]     = useState('bottom-right');
  const [embedType, setEmbedType]   = useState('iframe');
  const iframeRef = useRef(null);

  const BASE = 'https://products.devcabin.tech';

  const params = new URLSearchParams({
    name:     agentName,
    color:    color,
    bg:       bg,
    greeting: greeting,
    ...(bizName  && { business: bizName }),
    ...(context  && { context  }),
  }).toString();

  const previewSrc = `${BASE}/embed/chat?${params}`;

  const iframeCode =
`<iframe
  src="${previewSrc}"
  width="380"
  height="580"
  frameborder="0"
  allow="clipboard-write"
  style="border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.25);"
></iframe>`;

  const scriptCode =
`<!-- CabinMind AI Receptionist -->
<script>
  window.CabinMindConfig = {
    agentName: "${agentName}",
    primaryColor: "${color}",
    bgColor: "${bg}",
    position: "${position}",
    greeting: "${greeting}",
    businessName: "${bizName}",
    businessContext: \`${context.replace(/`/g, "'")}\`,
    apiBase: "${BASE}",
  };
</script>
<script src="${BASE}/widget.js" async defer></script>`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  // Reload iframe when settings change
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = previewSrc;
    }
  }, [previewSrc]);

  return (
    <div className="grid xl:grid-cols-2 gap-6">

      {/* ── Left: Settings ──────────────────────────────────────────── */}
      <div className="space-y-5">

        {/* Identity */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">🤖 Agent Identity</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Agent Name</label>
              <input value={agentName} onChange={e => setAgentName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Your Business Name</label>
              <input value={bizName} onChange={e => setBizName(e.target.value)}
                placeholder="e.g. Oakwood Plumbing"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Opening Greeting</label>
            <input value={greeting} onChange={e => setGreeting(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">
              Business Context <span className="text-gray-600 font-normal">(optional — helps Aria answer specific questions)</span>
            </label>
            <textarea value={context} onChange={e => setContext(e.target.value)}
              rows={3}
              placeholder="e.g. We are a plumbing company in Austin, TX. We offer emergency callouts 24/7, boiler servicing, and bathroom installations. Our phone number is 512-555-0100."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">🎨 Theme</h3>

          {/* Presets */}
          <div>
            <label className="text-gray-400 text-xs block mb-2">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => { setColor(p.color); setBg(p.bg); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
                  style={{ borderColor: color === p.color ? p.color : undefined }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:p.color, display:'inline-block', flexShrink:0 }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Primary Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                <input value={color} onChange={e => setColor(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Background Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bg} onChange={e => setBg(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                <input value={bg} onChange={e => setBg(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs block mb-1">Widget Position (script tag)</label>
            <div className="flex gap-2">
              {['bottom-right','bottom-left'].map(p => (
                <button key={p} onClick={() => setPosition(p)}
                  className={`flex-1 text-xs py-2 rounded-lg border transition-all ${position === p ? 'border-blue-500/60 bg-blue-500/10 text-blue-300' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>
                  {p === 'bottom-right' ? '↘ Bottom Right' : '↙ Bottom Left'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Embed code */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">📋 Embed Code</h3>
          <div className="flex gap-2">
            {[['iframe','iFrame (inline)'],['script','Script tag (floating bubble)']].map(([k,l]) => (
              <button key={k} onClick={() => setEmbedType(k)}
                className={`flex-1 text-xs py-2 rounded-lg border transition-all ${embedType===k ? 'border-blue-500/60 bg-blue-500/10 text-blue-300' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre className="bg-black/40 rounded-xl p-4 text-xs text-green-300 overflow-x-auto leading-relaxed border border-white/5 pr-20">
              {embedType === 'iframe' ? iframeCode : scriptCode}
            </pre>
            <button
              onClick={() => copy(embedType === 'iframe' ? iframeCode : scriptCode, 'code')}
              className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-gray-300 hover:bg-white/20 transition-all">
              {copied === 'code' ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          {embedType === 'script' && (
            <p className="text-xs text-gray-500">Paste this one snippet before <code className="text-gray-400">&lt;/body&gt;</code>. The floating bubble will appear on your site immediately — no other changes needed.</p>
          )}
        </div>
      </div>

      {/* ── Right: Live Preview ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">👁️ Live Preview</h3>
          <span className="text-xs text-gray-500">Updates as you type</span>
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: 560 }}>
          <iframe
            ref={iframeRef}
            src={previewSrc}
            width="100%"
            height="100%"
            frameBorder="0"
            title="Widget Preview"
          />
        </div>
        <p className="text-xs text-gray-600 text-center">This is a live conversation — try it!</p>
      </div>

    </div>
  );
}

export default function ReceptionistDashboard({ session }) {
  const [tab, setTab] = useState('chat');
  const tabs = [
    { id: 'chat', label: '💬 Live Chat' },
    { id: 'embed', label: '🔌 Embed Widget' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab === 'chat' && <LiveChatTab session={session} />}
          {tab === 'embed' && <EmbedTab session={session} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
