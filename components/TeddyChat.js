import { useState, useRef, useEffect } from 'react';

const SYSTEM_CONTEXT = {
  agentName: 'Teddy',
  businessName: 'CabinMind',
  businessContext: `CabinMind is an AI agent marketplace built by Dev Cabin Technologies. It offers AI agents for lead generation, social media, sales, blog writing, audits, automation, and WordPress workflows. Visitors can try agents for free at /trial or /demo. Pricing includes freemium options for selected WordPress tools, paid plans from $19/mo on those tools, and marketplace subscriptions starting from $50/mo depending on product. Key pages: /agents (browse agents), /pricing, /demo, /agency.`,
  salesMode: true,
};

export default function TeddyChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: "Hey! I'm Teddy 🧸 — your CabinMind guide. Ask me anything about our AI agents, pricing, or how to get started!",
        },
      ]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          ...SYSTEM_CONTEXT,
        }),
      });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Network error — please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start">
      {/* Chat window */}
      {open && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 flex flex-col"
          style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', maxHeight: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"
            style={{ background: 'linear-gradient(90deg, #7c3aed22, #06b6d422)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none">🧸</span>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Teddy AI</p>
                <p className="text-green-400 text-[10px] flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: '280px', maxHeight: '320px' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <span className="text-lg mr-1.5 self-end mb-0.5 leading-none shrink-0">🧸</span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-white/10 text-gray-200 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start items-end gap-1.5">
                <span className="text-lg leading-none">🧸</span>
                <div className="bg-white/10 rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/10">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10 focus-within:border-purple-500/50 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Message Teddy..."
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 resize-none outline-none leading-snug"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="shrink-0 w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                aria-label="Send"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-center text-gray-600 text-[10px] mt-1.5">Powered by CabinMind AI</p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-14 h-14 rounded-full shadow-xl shadow-black/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
        aria-label={open ? 'Close Teddy chat' : 'Chat with Teddy'}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <span className="text-2xl leading-none select-none">🧸</span>
        )}
        {/* Notification dot when closed */}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#0f0f1a] animate-pulse" />
        )}
      </button>
    </div>
  );
}
