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
  "What are your business hours?",
  "I'd like to book a call",
  "Tell me about your pricing",
  "What services do you offer?",
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
    { role: 'assistant', content: `Hi! I'm Aria, your AI receptionist. I'm live and ready to help your visitors 24/7. How can I assist you today?` }
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
        body: JSON.stringify({ messages: newMessages.slice(-10) }),
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

function EmbedTab({ session }) {
  const [copied, setCopied] = useState('');
  const widgetId = `cm-${session?.sessionId?.slice(-8) || 'demo'}`;

  const scriptCode = `<!-- CabinMind AI Receptionist Widget -->
<script>
  window.CabinMindConfig = {
    widgetId: "${widgetId}",
    agentName: "Aria",
    primaryColor: "#6d28d9",
    position: "bottom-right",
    greeting: "Hi! How can I help you today?",
    apiEndpoint: "https://products.devcabin.tech/api/chat"
  };
</script>
<script src="https://products.devcabin.tech/widget.js" async></script>`;

  const iframeCode = `<iframe
  src="https://products.devcabin.tech/embed/chat?id=${widgetId}"
  width="400"
  height="600"
  frameborder="0"
  style="border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);"
></iframe>`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 text-sm">
        📌 Add the script tag below to your website's <code className="bg-white/10 px-1 rounded">&lt;/body&gt;</code> tag. Your widget ID is unique to your account.
      </div>

      {[
        { label: 'Script Tag (recommended)', key: 'script', code: scriptCode, desc: 'Floating chat bubble in the corner of your site' },
        { label: 'iFrame Embed', key: 'iframe', code: iframeCode, desc: 'Embed the chat directly in a page section' },
      ].map(({ label, key, code, desc }) => (
        <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-white font-semibold text-sm">{label}</h3>
              <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
            </div>
            <button onClick={() => copy(code, key)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-gray-300 hover:bg-white/20 transition-all">
              {copied === key ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          <pre className="bg-black/40 rounded-xl p-4 text-xs text-green-300 overflow-x-auto leading-relaxed border border-white/5">
            {code}
          </pre>
        </div>
      ))}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3 text-sm">🔑 Your Widget Credentials</h3>
        <div className="space-y-2 font-mono text-xs">
          {[
            ['Widget ID', widgetId],
            ['API Endpoint', 'https://products.devcabin.tech/api/chat'],
            ['Account', session?.customerEmail || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between bg-black/30 rounded-lg px-3 py-2">
              <span className="text-gray-500">{k}</span>
              <span className="text-gray-200">{v}</span>
            </div>
          ))}
        </div>
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
