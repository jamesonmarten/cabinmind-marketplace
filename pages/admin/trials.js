/**
 * /admin/trials — Private dashboard to monitor gifted client trials
 *
 * Password-gated with ADMIN_SECRET. Shows per-client lead usage,
 * costs, and status for all trial slugs.
 */
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

function StatCard({ label, value, sub, color = 'text-brand-400' }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-1">
      <div className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold">{label}</div>
      <div className={`font-black text-2xl ${color}`}>{value}</div>
      {sub && <div className="text-gray-600 text-xs">{sub}</div>}
    </div>
  );
}

function UsageBar({ used, limit }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 100 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-white/10 rounded-full h-2 min-w-[100px]">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono flex-shrink-0 ${pct >= 100 ? 'text-red-400' : 'text-gray-400'}`}>
        {used}/{limit}
      </span>
    </div>
  );
}

function StatusBadge({ limitReached, active }) {
  if (limitReached) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">Limit Reached</span>;
  if (active) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">Active</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">Unused</span>;
}

export default function TrialsDashboard() {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [storedSecret, setStoredSecret] = useState('');

  const fetchData = useCallback(async (sec) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trials', {
        headers: { 'x-admin-secret': sec },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Invalid password' : `Error ${res.status}`);
      const json = await res.json();
      setData(json);
      setAuthed(true);
      setStoredSecret(sec);
    } catch (e) {
      setError(e.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authed || !storedSecret) return;
    const interval = setInterval(() => fetchData(storedSecret), 30000);
    return () => clearInterval(interval);
  }, [authed, storedSecret, fetchData]);

  if (!authed) {
    return (
      <>
        <Head><title>Trial Monitor | CabinMind Admin</title></Head>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <form
            onSubmit={e => { e.preventDefault(); fetchData(secret); }}
            className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-sm"
          >
            <div className="text-2xl mb-1 text-center">🔒</div>
            <h1 className="text-white font-bold text-lg text-center mb-4">Trial Monitor</h1>
            <input
              type="password"
              placeholder="Admin password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 mb-3"
            />
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </>
    );
  }

  const { trials, summary } = data;

  return (
    <>
      <Head><title>Trial Monitor | CabinMind Admin</title></Head>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black">🎁 Trial Monitor</h1>
              <p className="text-gray-500 text-sm mt-1">Track gifted client trial usage in real-time</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchData(storedSecret)}
                className="text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-gray-400"
              >
                ↻ Refresh
              </button>
              <Link href="/admin" legacyBehavior>
                <a className="text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-gray-400">
                  ← Main Admin
                </a>
              </Link>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Active Trials" value={summary.activeTrials} sub={`of ${summary.totalTrials} total`} color="text-green-400" />
            <StatCard label="Completed" value={summary.completedTrials} sub="hit 50-lead limit" color="text-amber-400" />
            <StatCard label="Total Leads" value={summary.totalLeadsGenerated} sub="across all trials" />
            <StatCard label="Platform Cost" value={summary.estimatedCost} sub="Hunter + ZB + AI" color="text-red-400" />
          </div>

          {/* Trial table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="font-bold text-sm">Client Trials</h2>
            </div>
            <div className="divide-y divide-white/5">
              {trials.map((trial, i) => (
                <motion.div
                  key={trial.slug}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-5 py-4 hover:bg-white/3 transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-brand-400 text-sm font-bold">{trial.slug}</span>
                      <StatusBadge limitReached={trial.limitReached} active={trial.active} />
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`https://products.devcabin.tech${trial.url}`); }}
                      className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded text-gray-500 hover:text-white hover:bg-white/10 transition"
                    >
                      Copy Link
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                        Leads This Month ({trial.currentMonth.month})
                      </div>
                      <UsageBar used={trial.currentMonth.leadsUsed} limit={trial.currentMonth.leadsLimit} />
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">All-Time Leads</div>
                        <div className="text-lg font-bold text-white">{trial.allTime.totalLeads}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">ZB Validations</div>
                        <div className="text-lg font-bold text-gray-300">{trial.currentMonth.zbUsed}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Est. Cost</div>
                        <div className="text-lg font-bold text-red-400">${(trial.allTime.totalLeads * 0.018).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-xs mt-8">
            Auto-refreshes every 30s · Data resets on Vercel cold start (ephemeral /tmp store)
          </p>
        </div>
      </div>
    </>
  );
}
