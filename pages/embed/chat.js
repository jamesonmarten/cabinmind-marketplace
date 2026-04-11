/**
 * /embed/chat — Embeddable AI Receptionist widget page
 *
 * Designed to be loaded in an <iframe> on any client website.
 * All config comes from URL query params so one hosted page serves every client.
 *
 * Params:
 *   name        — agent name          (default: "Aria")
 *   color       — primary hex color   (default: "#6d28d9")
 *   bg          — background hex      (default: "#0f172a")
 *   greeting    — opening message     (default: "Hi! How can I help you today?")
 *   business    — business name       (default: "")
 *   context     — extra instructions  (default: "")
 *   position    — unused in iframe mode, used by widget.js
 */

import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '109,40,217';
}

export default function EmbedChat() {
  const router = useRouter();
  const { name, color, bg, greeting, business, context } = router.query;

  const agentName   = name     || 'Aria';
  const primary     = color    || '#6d28d9';
  const bgColor     = bg       || '#0f172a';
  const openingMsg  = greeting || `Hi! I'm ${agentName}. How can I help you today?`;
  const bizName     = business || '';
  const bizContext  = context  || '';
  const primaryRgb  = hexToRgb(primary);

  const [messages, setMessages] = useState([{ role: 'assistant', content: openingMsg }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const endRef = useRef(null);

  // Re-init if query params change (live preview)
  useEffect(() => {
    setMessages([{ role: 'assistant', content: greeting || `Hi! I'm ${agentName}. How can I help you today?` }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, greeting]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(-12),
          agentName: agentName,
          businessName: bizName,
          businessContext: bizContext,
        }),
      });
      const d = await r.json();
      setMessages(p => [...p, { role: 'assistant', content: d.reply || 'Sorry, something went wrong.' }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection error — please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>{agentName} · AI Receptionist</title>
        <meta name="robots" content="noindex,nofollow" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(${primaryRgb},0.3); border-radius: 4px; }
        `}</style>
      </Head>

      <div style={{ display:'flex', flexDirection:'column', height:'100vh', background: bgColor, color:'#f1f5f9' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, ${primary}cc, ${primary}88)`, padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px', borderBottom:`1px solid rgba(${primaryRgb},0.3)`, flexShrink:0 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', animation:'pulse 2s infinite' }} />
          <span style={{ fontWeight:700, fontSize:14 }}>{agentName}</span>
          {bizName && <span style={{ fontSize:11, opacity:0.65, marginLeft:2 }}>· {bizName}</span>}
          <span style={{ marginLeft:'auto', fontSize:10, opacity:0.5 }}>AI Receptionist</span>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 12px', display:'flex', flexDirection:'column', gap:10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', gap:8, alignItems:'flex-end' }}>
              {m.role === 'assistant' && (
                <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg,${primary},${primary}88)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>🤖</div>
              )}
              <div style={{
                maxWidth:'78%', padding:'10px 14px', borderRadius: m.role==='user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.role==='user' ? primary : 'rgba(255,255,255,0.07)',
                border: m.role==='user' ? 'none' : `1px solid rgba(${primaryRgb},0.15)`,
                fontSize:13, lineHeight:1.5, color:'#f1f5f9',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg,${primary},${primary}88)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🤖</div>
              <div style={{ padding:'10px 14px', borderRadius:'18px 18px 18px 4px', background:'rgba(255,255,255,0.07)', border:`1px solid rgba(${primaryRgb},0.15)`, display:'flex', gap:4, alignItems:'center' }}>
                {[0,1,2].map(j => (
                  <span key={j} style={{ width:6, height:6, borderRadius:'50%', background:`rgba(${primaryRgb},0.6)`, display:'inline-block', animation:`bounce 0.9s ${j*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding:'10px 12px', borderTop:`1px solid rgba(${primaryRgb},0.2)`, display:'flex', gap:8, flexShrink:0 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Type a message…"
            style={{ flex:1, background:'rgba(255,255,255,0.06)', border:`1px solid rgba(${primaryRgb},0.25)`, borderRadius:12, padding:'10px 14px', fontSize:13, color:'#f1f5f9', outline:'none' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ background:primary, border:'none', borderRadius:12, padding:'10px 16px', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', opacity: (loading||!input.trim()) ? 0.4 : 1 }}
          >
            ↑
          </button>
        </div>

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
          @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        `}</style>
      </div>
    </>
  );
}
