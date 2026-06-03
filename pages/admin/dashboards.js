/**
 * /admin/dashboards — Superadmin shortcut page
 *
 * Lists every dashboard variant with a click-to-open link using your
 * ADMIN_SECRET as the token. Password-gated client-side (same as /admin).
 */
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const DASHBOARDS = [
  { id: 'lead-researcher', name: 'AI Lead Researcher',           icon: '🔎', notes: 'Default lead gen dashboard' },
  { id: 'lead-starter',    name: 'Lead Researcher — Starter',    icon: '🔎', notes: 'Platform keys, 100 leads/mo' },
  { id: 'lead-pro',        name: 'Lead Researcher — Pro',        icon: '🔎', notes: 'Hunter BYOK, platform ZB' },
  { id: 'lead-scale',      name: 'Lead Researcher — Scale',      icon: '🔎', notes: 'Full BYOK, unlimited' },
  { id: 'lead-agency',     name: 'Lead Researcher — Agency',     icon: '🔎', notes: 'Full BYOK, unlimited' },
  { id: 'receptionist',    name: 'AI Receptionist',              icon: '🤖', notes: '24/7 chat agent' },
  { id: 'website-audit',   name: 'AI Website Auditor',           icon: '📈', notes: 'PageSpeed + SEO reports' },
  { id: 'blog-writer',     name: 'AI Blog Writer',                icon: '✍️',  notes: 'Long-form content gen' },
  { id: 'sales-assistant', name: 'AI Sales Assistant',            icon: '💼', notes: 'Outbound + follow-up' },
  { id: 'social-hub',      name: 'AI Social Media Hub',           icon: '📱', notes: 'Multi-platform scheduling' },
  { id: 'ai-training',     name: '1-on-1 AI Training',            icon: '🎓', notes: 'Coaching dashboard' },
  { id: 'automation-expert', name: 'AI Automation Expert',        icon: '⚡', notes: '$197/mo · 25 gens · Zapier/Make/n8n' },
  { id: 'automation-agency', name: 'AI Automation — Agency',      icon: '⚡', notes: '$497/mo · unlimited generations' },
];

const OTHER_PAGES = [
  { label: 'Main Admin (Clients + MRR)', url: '/admin' },
  { label: 'Trial Monitor',              url: '/admin/trials' },
  { label: 'Pricing Page',               url: '/pricing' },
  { label: 'Demo Page',                  url: '/demo' },
  { label: 'Agents Marketplace',         url: '/agents' },
];

export default function DashboardsIndex() {
  const [secret, setSecret] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('cm_admin_secret');
    if (stored) setSecret(stored);
  }, []);

  const login = (e) => {
    e.preventDefault();
    sessionStorage.setItem('cm_admin_secret', input);
    setSecret(input);
  };

  const copy = (text) => { navigator.clipboard.writeText(text); };

  if (!secret) {
    return (
      <>
        <Head><title>Superadmin Dashboards | CabinMind</title></Head>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <form onSubmit={login} className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-sm">
            <div className="text-2xl mb-1 text-center">🔒</div>
            <h1 className="text-white font-bold text-lg text-center mb-4">Superadmin Access</h1>
            <input
              type="password"
              placeholder="Admin secret"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 mb-3"
            />
            <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition">
              Enter
            </button>
          </form>
        </div>
      </>
    );
  }

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://products.devcabin.tech';

  return (
    <>
      <Head><title>Superadmin Dashboards | CabinMind</title></Head>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black">🛠 Superadmin Dashboards</h1>
              <p className="text-gray-500 text-sm mt-1">Direct access to every client dashboard variant</p>
            </div>
            <button
              onClick={() => { sessionStorage.removeItem('cm_admin_secret'); setSecret(''); setInput(''); }}
              className="text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-gray-400"
            >
              Sign out
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="font-bold text-sm">Client Dashboards (signed in as superadmin)</h2>
              <p className="text-gray-500 text-xs mt-0.5">Cancel button is disabled — you can browse safely</p>
            </div>
            <div className="divide-y divide-white/5">
              {DASHBOARDS.map(d => {
                const url = `${base}/dashboard/${secret}${d.id === 'lead-researcher' ? '' : `?as=${d.id}`}`;
                return (
                  <div key={d.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/3 transition">
                    <span className="text-2xl">{d.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">{d.name}</div>
                      <div className="text-gray-500 text-xs">{d.notes} · <span className="font-mono text-gray-600">{d.id}</span></div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => copy(url)} className="text-[11px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-gray-400">
                        Copy
                      </button>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg transition text-white font-bold">
                        Open →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="font-bold text-sm">Other Pages</h2>
            </div>
            <div className="divide-y divide-white/5">
              {OTHER_PAGES.map(p => (
                <div key={p.url} className="px-5 py-3 flex items-center justify-between hover:bg-white/3 transition">
                  <div>
                    <div className="font-semibold text-white text-sm">{p.label}</div>
                    <div className="text-gray-600 text-xs font-mono">{p.url}</div>
                  </div>
                  <Link href={p.url} legacyBehavior>
                    <a className="text-[11px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-gray-400">
                      Open →
                    </a>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="font-bold text-sm">Client Trial Links</h2>
              <p className="text-gray-500 text-xs mt-0.5">Share these directly with clients — 50 free leads each</p>
            </div>
            <div className="divide-y divide-white/5">
              {['acme2026', 'defiantcnc2026'].map(slug => {
                const url = `${base}/trial/${slug}`;
                return (
                  <div key={slug} className="px-5 py-3 flex items-center justify-between hover:bg-white/3 transition">
                    <div>
                      <div className="font-mono text-brand-400 text-sm font-bold">{slug}</div>
                      <div className="text-gray-600 text-xs font-mono">{url}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copy(url)} className="text-[11px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-gray-400">
                        Copy
                      </button>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg transition text-white font-bold">
                        Open →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-8">
            Bookmark this page · Your secret is stored in sessionStorage and cleared on sign-out
          </p>
        </div>
      </div>
    </>
  );
}
