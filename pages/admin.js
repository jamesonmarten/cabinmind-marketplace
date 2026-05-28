/**
 * /admin — Private owner dashboard
 *
 * Password-gated. Only accessible with ADMIN_SECRET.
 * Shows: MRR, ARR, all clients, per-client usage, recent cancellations.
 *
 * Access: https://products.devcabin.tech/admin
 * Enter the ADMIN_SECRET from your Vercel env vars when prompted.
 */
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'text-purple-400' }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-1">
      <div className="text-gray-500 text-xs uppercase tracking-widest font-semibold">{label}</div>
      <div className={`font-black text-3xl ${color}`}>{value}</div>
      {sub && <div className="text-gray-600 text-xs">{sub}</div>}
    </div>
  );
}

function PlanBadge({ plan }) {
  const colors = {
    agency:  'bg-purple-700 text-purple-100',
    scale:   'bg-violet-600 text-violet-100',
    pro:     'bg-indigo-600 text-indigo-100',
    starter: 'bg-slate-700 text-slate-200',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${colors[plan] || colors.starter}`}>
      {plan}
    </span>
  );
}

function UsageBar({ used, limit, warn }) {
  if (limit === '∞') return <span className="text-gray-600 text-xs">∞ BYOK</span>;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-white/10 rounded-full h-1.5 min-w-[60px]">
        <div
          className={`h-1.5 rounded-full transition-all ${warn ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono flex-shrink-0 ${warn ? 'text-red-400' : 'text-gray-500'}`}>
        {used}/{limit}
      </span>
    </div>
  );
}

function ClientRow({ client, i }) {
  const [open, setOpen] = useState(false);
  const zbPct = client.usage.zbValidations.limit === '∞' ? 0
    : Math.round((client.usage.zbValidations.used / client.usage.zbValidations.limit) * 100);
  const lbPct = client.usage.leadBatches.limit === '∞' ? 0
    : Math.round((client.usage.leadBatches.used / client.usage.leadBatches.limit) * 100);
  const warn = zbPct >= 80 || lbPct >= 80;

  return (
    <>
      <tr
        className={`border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-white/2'}`}
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-4 py-3">
          <div className="text-white text-sm font-medium">{client.name || '—'}</div>
          <div className="text-gray-500 text-xs">{client.email}</div>
        </td>
        <td className="px-4 py-3"><PlanBadge plan={client.plan} /></td>
        <td className="px-4 py-3 text-right font-bold text-purple-300">${client.mrr}/mo</td>
        <td className="px-4 py-3 min-w-[120px]">
          <div className="text-gray-600 text-[10px] uppercase mb-1">ZB Validations</div>
          <UsageBar used={client.usage.zbValidations.used} limit={client.usage.zbValidations.limit} warn={zbPct >= 80} />
          <div className="text-gray-600 text-[10px] uppercase mt-1.5 mb-1">Lead Batches</div>
          <UsageBar used={client.usage.leadBatches.used} limit={client.usage.leadBatches.limit} warn={lbPct >= 80} />
        </td>
        <td className="px-4 py-3 text-center">
          {warn ? <span className="text-amber-400 text-xs font-bold">⚠️ Near limit</span>
                : <span className="text-green-500 text-xs">✓ OK</span>}
        </td>
        <td className="px-4 py-3 text-gray-600 text-xs">
          {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </td>
        <td className="px-4 py-3 text-gray-700 text-xs">{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr className="bg-black/30 border-b border-white/5">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-gray-600 uppercase tracking-wide mb-1">Stripe Customer</div>
                <a href={`https://dashboard.stripe.com/customers/${client.customerId}`} target="_blank" rel="noopener noreferrer"
                  className="text-purple-400 hover:underline font-mono">{client.customerId}</a>
              </div>
              <div>
                <div className="text-gray-600 uppercase tracking-wide mb-1">Subscription ID</div>
                <a href={`https://dashboard.stripe.com/subscriptions/${client.subscriptionId}`} target="_blank" rel="noopener noreferrer"
                  className="text-purple-400 hover:underline font-mono">{client.subscriptionId}</a>
              </div>
              <div>
                <div className="text-gray-600 uppercase tracking-wide mb-1">Next Billing</div>
                <div className="text-gray-300">{client.nextBilling ? new Date(client.nextBilling).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
              </div>
              <div>
                <div className="text-gray-600 uppercase tracking-wide mb-1">Dashboard Link</div>
                {client.dashboardUrl
                  ? <a href={client.dashboardUrl} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:underline">Open →</a>
                  : <span className="text-gray-700">No token</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [input,  setInput]  = useState('');
  const [data,   setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState('');
  const [sending, setSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  // Persist secret in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('cm_admin_secret');
    if (stored) { setSecret(stored); }
  }, []);

  const fetchData = useCallback(async (s) => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/clients', { headers: { 'x-admin-secret': s } });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (secret) fetchData(secret);
  }, [secret, fetchData]);

  const login = (e) => {
    e.preventDefault();
    sessionStorage.setItem('cm_admin_secret', input);
    setSecret(input);
  };

  const sendReport = async () => {
    setSending(true);
    const r = await fetch('/api/admin/weekly-report', { headers: { 'x-admin-secret': secret } });
    const json = await r.json();
    setSending(false);
    if (json.sent) setReportSent(true);
    else alert('Failed: ' + json.error);
  };

  // ── Login screen ────────────────────────────────────────────────────────
  if (!secret) {
    return (
      <>
        <Head><title>CabinMind Admin</title></Head>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-white/10 rounded-2xl p-10 w-full max-w-sm text-center"
          >
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-white font-black text-xl mb-2">CabinMind Admin</h1>
            <p className="text-gray-500 text-sm mb-6">Owner access only</p>
            <form onSubmit={login} className="flex flex-col gap-3">
              <input
                type="password"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Admin secret key"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <button type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold text-sm hover:opacity-90 transition-all">
                Enter Dashboard
              </button>
            </form>
          </motion.div>
        </div>
      </>
    );
  }

  // ── Loading / error ─────────────────────────────────────────────────────
  if (loading) return (
    <>
      <Head><title>CabinMind Admin</title></Head>
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading client data…</p>
        </div>
      </div>
    </>
  );

  if (error) return (
    <>
      <Head><title>CabinMind Admin</title></Head>
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 font-bold mb-2">{error}</p>
          <button onClick={() => { sessionStorage.removeItem('cm_admin_secret'); setSecret(''); setInput(''); }}
            className="text-gray-500 text-sm hover:text-white underline">Try again</button>
        </div>
      </div>
    </>
  );

  if (!data) return null;

  const { clients = [], cancelled = [], summary } = data;
  const warnClients = clients.filter(c => {
    const zb = c.usage.zbValidations;
    const lb = c.usage.leadBatches;
    const zbPct = zb.limit === '∞' ? 0 : Math.round((zb.used / Number(zb.limit)) * 100);
    const lbPct = lb.limit === '∞' ? 0 : Math.round((lb.used / Number(lb.limit)) * 100);
    return zbPct >= 80 || lbPct >= 80;
  });

  // ── Main dashboard ──────────────────────────────────────────────────────
  return (
    <>
      <Head><title>CabinMind Admin — ${summary.mrr} MRR</title></Head>
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Top bar */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">CM</div>
            <div>
              <span className="text-white font-bold">CabinMind Admin</span>
              <span className="ml-3 text-gray-600 text-xs">jameson@devcabin.tech</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchData(secret)}
              className="text-gray-500 hover:text-white text-sm transition-colors">↻ Refresh</button>
            <button onClick={sendReport} disabled={sending || reportSent}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                reportSent ? 'bg-green-700 text-green-100' : 'bg-purple-700 hover:bg-purple-600 text-white'
              } disabled:opacity-60`}>
              {reportSent ? '✓ Report Sent' : sending ? 'Sending…' : '📧 Send Weekly Report'}
            </button>
            <button onClick={() => { sessionStorage.removeItem('cm_admin_secret'); setSecret(''); setInput(''); }}
              className="text-gray-600 hover:text-red-400 text-sm transition-colors">Sign Out</button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10">

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard label="MRR" value={`$${summary.mrr.toLocaleString()}`} sub={`$${summary.arr.toLocaleString()} ARR`} color="text-purple-400" />
            <StatCard label="Active Clients" value={summary.totalClients} sub="paying subscribers" color="text-blue-400" />
            <StatCard label="⚠️ Near Limits" value={warnClients.length} sub="clients ≥80% usage" color={warnClients.length > 0 ? 'text-amber-400' : 'text-green-400'} />
            <StatCard label="Cancellations" value={cancelled.length} sub="recent" color={cancelled.length > 0 ? 'text-red-400' : 'text-green-400'} />
          </div>

          {/* Plan breakdown */}
          <div className="grid grid-cols-4 gap-3 mb-10">
            {['starter','pro','scale','agency'].map(plan => (
              <div key={plan} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <PlanBadge plan={plan} />
                <div className="text-3xl font-black text-white mt-2">{summary.planBreakdown[plan] || 0}</div>
                <div className="text-gray-600 text-xs mt-1">${plan==='starter'?97:plan==='pro'?247:plan==='scale'?497:997}/mo each</div>
                <div className="text-gray-500 text-xs">${((summary.planBreakdown[plan]||0) * (plan==='starter'?97:plan==='pro'?247:plan==='scale'?497:997)).toLocaleString()} MRR</div>
              </div>
            ))}
          </div>

          {/* Usage warnings */}
          {warnClients.length > 0 && (
            <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
              <h3 className="text-amber-400 font-bold text-sm mb-3">⚠️ Clients Near Usage Limits — Consider Reaching Out</h3>
              <div className="space-y-2">
                {warnClients.map(c => (
                  <div key={c.customerId} className="flex items-center justify-between gap-4 bg-black/20 rounded-xl px-4 py-2.5">
                    <div>
                      <span className="text-white text-sm font-medium">{c.name || c.email}</span>
                      <span className="ml-2 text-gray-500 text-xs">{c.email}</span>
                    </div>
                    <PlanBadge plan={c.plan} />
                    <div className="text-amber-300 text-xs font-mono">
                      ZB: {c.usage.zbValidations.used}/{c.usage.zbValidations.limit} · Leads: {c.usage.leadBatches.used}/{c.usage.leadBatches.limit}
                    </div>
                    <a href={`mailto:${c.email}`} className="text-purple-400 hover:underline text-xs">Email →</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All clients table */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">All Active Clients <span className="text-gray-600 font-normal text-sm ml-2">{summary.month} usage</span></h2>
              <a href="https://dashboard.stripe.com/customers" target="_blank" rel="noopener noreferrer"
                className="text-purple-400 text-sm hover:underline">Stripe Dashboard →</a>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/3">
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs">Client</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs">Plan</th>
                    <th className="px-4 py-3 text-right text-gray-500 font-semibold text-xs">MRR</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs min-w-[160px]">Usage</th>
                    <th className="px-4 py-3 text-center text-gray-500 font-semibold text-xs">Status</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs">Since</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0
                    ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-600">No active clients yet</td></tr>
                    : clients.map((c, i) => <ClientRow key={c.customerId} client={c} i={i} />)
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent cancellations */}
          {cancelled.length > 0 && (
            <div className="mb-10">
              <h2 className="text-white font-bold text-lg mb-4">Recent Cancellations</h2>
              <div className="space-y-2">
                {cancelled.map((c, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-white text-sm font-medium">{c.name || c.email}</span>
                      <span className="ml-2 text-gray-500 text-xs">{c.email}</span>
                    </div>
                    <PlanBadge plan={c.plan} />
                    <div className="text-red-400 font-bold text-sm">-${c.mrr}/mo</div>
                    <div className="text-gray-600 text-xs">
                      {c.canceledAt ? new Date(c.canceledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                    <a href={`mailto:${c.email}?subject=We%20miss%20you%20at%20CabinMind`}
                      className="text-purple-400 text-xs hover:underline">Win-back →</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending backlog reminder */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-6 text-xs text-gray-500 space-y-2">
            <div className="text-gray-400 font-bold text-sm mb-3">📋 Pending Infrastructure</div>
            <div className="flex items-center gap-2"><span className="text-amber-400">→</span> <strong className="text-gray-400">Per-client subscriptionKey:</strong> wire Stripe session_id from dashboard into /api/leads + /api/validate-list so usage tracks per-client, not per-plan globally</div>
            <div className="flex items-center gap-2"><span className="text-amber-400">→</span> <strong className="text-gray-400">Hunter.io upgrade:</strong> free 25 searches/month likely exhausted — upgrade to Starter $49/mo at hunter.io/pricing</div>
            <div className="flex items-center gap-2"><span className="text-amber-400">→</span> <strong className="text-gray-400">ZeroBounce credits:</strong> monitor balance as client count grows — top up at zerobounce.net</div>
            <div className="flex items-center gap-2"><span className="text-amber-400">→</span> <strong className="text-gray-400">Weekly report cron:</strong> add <code className="bg-black/30 px-1 rounded">vercel.json</code> cron to auto-send every Monday 9am UTC</div>
          </div>
        </div>
      </div>
    </>
  );
}
