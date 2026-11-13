/**
 * /admin/runs — Owner view of every lead run
 *
 * Password-gated with ADMIN_SECRET. Shows what each prospect searched for,
 * what came back, and why a run returned less than asked. Business
 * identifiers only — contact names and emails are deliberately not logged.
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

const SOURCE_STYLE = {
  trial:    'bg-brand-500/20 text-brand-300 border-brand-500/30',
  demo:     'bg-gray-500/20 text-gray-400 border-gray-500/30',
  customer: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Explain a short or empty run in the same terms the prospect saw. */
function outcome(run) {
  if (run.hunter_quota_exceeded) return { text: 'Contact database quota exhausted', tone: 'text-red-300' };
  if (run.delivered >= (run.requested || 0)) return { text: 'Full batch', tone: 'text-emerald-300' };
  const s = run.screened || {};
  if (!run.delivered && s.discoveryExhausted) return { text: 'Ran out of businesses to check', tone: 'text-amber-300' };
  if (!run.delivered) return { text: 'Nothing verifiable in this niche', tone: 'text-amber-300' };
  return { text: `Partial — thin niche`, tone: 'text-amber-300' };
}

function RunRow({ run }) {
  const [open, setOpen] = useState(false);
  const o = outcome(run);
  const s = run.screened || {};
  const grades = run.grades || {};

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 hover:bg-white/5 transition flex items-start gap-3"
      >
        <div className="flex-shrink-0 w-14 text-right">
          <div className={`font-black text-lg ${run.delivered ? 'text-white' : 'text-gray-600'}`}>{run.delivered}</div>
          <div className="text-[10px] text-gray-600">of {run.requested ?? '—'}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SOURCE_STYLE[run.source_kind] || SOURCE_STYLE.customer}`}>
              {run.source_label}
            </span>
            <span className="text-[10px] text-gray-600">{timeAgo(run.at)}</span>
            {run.provider && (
              <span className="text-[10px] text-gray-600 font-mono">
                {run.provider === 'google-places' ? 'Places' : run.provider}
              </span>
            )}
            {run.duration_ms != null && (
              <span className="text-[10px] text-gray-600 font-mono">{(run.duration_ms / 1000).toFixed(1)}s</span>
            )}
          </div>
          <div className="text-sm text-gray-300 mt-1 truncate">{run.icp || '—'}</div>
          <div className={`text-[11px] mt-0.5 ${o.tone}`}>{o.text}</div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1 text-[10px] font-mono">
          {['A', 'B', 'C'].map(g => grades[g] ? (
            <span key={g} className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{g}:{grades[g]}</span>
          ) : null)}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pl-[72px] space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div><span className="text-gray-600">Checked</span> <span className="text-gray-300 font-mono">{s.candidates ?? '—'}</span></div>
            <div><span className="text-gray-600">No mail domain</span> <span className="text-gray-300 font-mono">{s.noMX ?? '—'}</span></div>
            <div><span className="text-gray-600">No listed contact</span> <span className="text-gray-300 font-mono">{s.noContact ?? '—'}</span></div>
            <div><span className="text-gray-600">Rounds</span> <span className="text-gray-300 font-mono">{s.rounds ?? '—'}</span></div>
          </div>

          {run.companies?.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Businesses returned</div>
              <div className="flex flex-wrap gap-1.5">
                {run.companies.map((c, i) => (
                  <span key={i} className="text-[11px] bg-white/5 border border-white/10 rounded px-2 py-0.5 text-gray-300">
                    {c.grade && <span className="text-gray-500 mr-1">{c.grade}</span>}
                    {c.company}
                    {c.domain && <span className="text-gray-600 ml-1">· {c.domain}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RunsDashboard() {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [storedSecret, setStoredSecret] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async (sec) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/runs?limit=200', { headers: { 'x-admin-secret': sec } });
      if (!res.ok) throw new Error(res.status === 401 ? 'Invalid password' : `Error ${res.status}`);
      setData(await res.json());
      setAuthed(true);
      setStoredSecret(sec);
    } catch (e) {
      setError(e.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed || !storedSecret) return;
    const t = setInterval(() => fetchData(storedSecret), 30000);
    return () => clearInterval(t);
  }, [authed, storedSecret, fetchData]);

  if (!authed) {
    return (
      <>
        <Head><title>Run Log — CabinMind Admin</title><meta name="robots" content="noindex" /></Head>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <form
            onSubmit={e => { e.preventDefault(); fetchData(secret); }}
            className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-sm space-y-4"
          >
            <h1 className="text-white font-bold text-lg">Run Log</h1>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Admin password"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            {error && <div className="text-red-400 text-xs">{error}</div>}
            <button className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 rounded-lg text-sm">
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </form>
        </div>
      </>
    );
  }

  const s = data?.summary || {};
  const runs = (data?.runs || []).filter(r => filter === 'all' || r.source_kind === filter);

  return (
    <>
      <Head><title>Run Log — CabinMind Admin</title><meta name="robots" content="noindex" /></Head>
      <div className="min-h-screen bg-gray-950 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-white font-black text-2xl">Run Log</h1>
              <p className="text-gray-500 text-sm">Every lead search, newest first. Auto-refreshes every 30s.</p>
            </div>
            <Link href="/admin/trials" className="text-brand-400 hover:text-brand-300 text-sm">Trials →</Link>
          </div>

          {data && !data.durable && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-200 text-sm">
              Supabase isn’t configured, so this log lives in temporary storage and is wiped whenever the
              server goes cold. Treat it as a live tail, not a permanent record.
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Runs" value={s.totalRuns ?? 0} sub={`${s.uniqueSources ?? 0} distinct users`} />
            <StatCard label="Leads delivered" value={s.leadsDelivered ?? 0} color="text-emerald-400" />
            <StatCard label="Empty runs" value={`${s.emptyRate ?? 0}%`} sub={`${s.emptyRuns ?? 0} of ${s.totalRuns ?? 0}`} color={s.emptyRate > 25 ? 'text-red-400' : 'text-gray-300'} />
            <StatCard label="Median time" value={s.medianMs ? `${(s.medianMs / 1000).toFixed(1)}s` : '—'} sub={`${s.viaPlaces ?? 0} via Places`} color="text-gray-300" />
          </div>

          {s.quotaBlocked > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-200 text-sm">
              {s.quotaBlocked} run{s.quotaBlocked === 1 ? '' : 's'} hit the contact-database quota and returned nothing.
              Check the Hunter plan and remaining credits.
            </div>
          )}

          <div className="flex gap-2">
            {['all', 'trial', 'demo', 'customer'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  filter === f
                    ? 'bg-brand-600/30 text-brand-300 border-brand-500/60'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-gray-500'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {runs.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-600 text-sm">
                No runs recorded yet.
              </div>
            ) : (
              runs.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}>
                  <RunRow run={r} />
                </motion.div>
              ))
            )}
          </div>

          <p className="text-gray-600 text-xs">
            Contact names and emails are deliberately not recorded here — only the businesses returned.
          </p>
        </div>
      </div>
    </>
  );
}
