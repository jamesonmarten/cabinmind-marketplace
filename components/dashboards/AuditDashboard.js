/**
 * AuditDashboard — full product for AI Website Auditor subscribers.
 * Consumes /api/audit which returns:
 *   { results: { perf, seo, a11y, ux }, trafficGain, audited, source: 'pagespeed'|'ai' }
 * Each category: { label, score, color, issues: [{ sev, text, fix, impact }] }
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEV_STYLES = {
  high:   'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
};
const GAUGE_COLORS = {
  perf: '#3b82f6',
  seo:  '#10b981',
  a11y: '#f59e0b',
  ux:   '#8b5cf6',
};

function ScoreGauge({ label, score, colorHex }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 50 ? 'C' : 'D';
  const gradeColor = pct >= 90 ? 'text-green-400' : pct >= 75 ? 'text-yellow-400' : pct >= 50 ? 'text-orange-400' : 'text-red-400';
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
      <div className="relative w-20 h-20 mx-auto mb-3">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={colorHex} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-black ${gradeColor}`}>{grade}</span>
        </div>
      </div>
      <div className="text-3xl font-black text-white mb-0.5">{pct}</div>
      <div className="text-gray-400 text-xs">{label}</div>
    </div>
  );
}

function IssueList({ issues }) {
  const [expanded, setExpanded] = useState(null);
  if (!issues?.length) return null;
  return (
    <div className="divide-y divide-white/5">
      {issues.map((issue, i) => (
        <div key={i} className="px-5 py-4 cursor-pointer hover:bg-white/5 transition-all"
          onClick={() => setExpanded(expanded === i ? null : i)}>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${SEV_STYLES[issue.sev] || SEV_STYLES.low}`}>
              {issue.sev || 'info'}
            </span>
            <span className="text-white text-sm font-medium flex-1">{issue.text}</span>
            <span className="text-gray-500 text-xs flex-shrink-0">{expanded === i ? '▲' : '▼'}</span>
          </div>
          <AnimatePresence>
            {expanded === i && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                {issue.fix && (
                  <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                    <span className="text-green-400 text-xs font-semibold">✅ Fix: </span>
                    <span className="text-green-300 text-xs">{issue.fix}</span>
                  </div>
                )}
                {issue.impact && (
                  <div className="mt-2 text-xs text-gray-500">
                    Impact: <span className="text-purple-300 font-medium">{issue.impact}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function AuditReport({ data, url }) {
  const { results, trafficGain, source } = data;
  const cats = Object.entries(results);

  const avgScore    = Math.round(cats.reduce((a, [, c]) => a + (c.score ?? 0), 0) / cats.length);
  const totalIssues = cats.reduce((a, [, c]) => a + (c.issues?.filter(i => i.sev === 'high' || i.sev === 'medium').length ?? 0), 0);

  const exportReport = () => {
    const lines = [
      `CabinMind Website Audit Report`,
      `URL: ${url}`,
      `Source: ${source === 'ai' ? 'AI Analysis (GPT-4o mini)' : 'Google PageSpeed Insights (Lighthouse)'}`,
      `Date: ${new Date().toLocaleString()}`,
      `Overall Health: ${avgScore}/100`,
      ``,
      `SCORES`,
      ...cats.map(([, c]) => `${c.label.padEnd(16)} ${c.score}`),
      ``,
      `ISSUES`,
      ...cats.flatMap(([, c]) => [
        `\n── ${c.label} ──`,
        ...(c.issues || []).map(i => `[${(i.sev || '').toUpperCase()}] ${i.text}\n  Fix: ${i.fix || '—'}\n  Impact: ${i.impact || '—'}`),
      ]),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${Date.now()}.txt`;
    a.click();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Source badge */}
      {source === 'ai' && (
        <div className="flex items-start gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 text-sm text-purple-300">
          <span className="flex-shrink-0 mt-0.5">🤖</span>
          <span>
            <strong>AI-powered analysis</strong> — Google PageSpeed&apos;s daily quota was reached; this audit was generated by GPT-4o mini based on your domain.
            Results are analysis-based, not live Lighthouse measurements. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline opacity-75">Add your own API key</a> for live data.
          </span>
        </div>
      )}
      {source === 'pagespeed' && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-300">
          <span>📊</span>
          <span><strong>Live Lighthouse data</strong> — Scores measured by Google PageSpeed Insights (mobile).</span>
        </div>
      )}

      {/* Score gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cats.map(([key, cat]) => (
          <ScoreGauge key={key} label={cat.label} score={cat.score} colorHex={GAUGE_COLORS[key]} />
        ))}
      </div>

      {/* Summary bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap gap-6 items-center">
        <div>
          <div className="text-gray-500 text-xs mb-0.5">Audited URL</div>
          <div className="text-white text-sm font-medium truncate max-w-xs">{url}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs mb-0.5">Overall Health</div>
          <div className="text-white text-sm font-bold">{avgScore}/100</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs mb-0.5">High/medium issues</div>
          <div className="text-white text-sm font-bold">{totalIssues}</div>
        </div>
        {trafficGain > 0 && (
          <div>
            <div className="text-gray-500 text-xs mb-0.5">Est. traffic gain if fixed</div>
            <div className="text-green-400 text-sm font-bold">+{trafficGain.toLocaleString()} visits/mo</div>
          </div>
        )}
        <button onClick={exportReport}
          className="ml-auto text-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
          ⬇️ Export Report
        </button>
      </div>

      {/* Issue panels per category */}
      {cats.map(([key, cat]) => (
        <div key={key} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-white/5 border-b border-white/10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: GAUGE_COLORS[key] }} />
            <span className="text-white font-semibold text-sm">{cat.label}</span>
            <span className="ml-auto text-xs font-bold" style={{ color: GAUGE_COLORS[key] }}>{cat.score}/100</span>
            <span className="text-gray-500 text-xs">{cat.issues?.length || 0} items</span>
          </div>
          <IssueList issues={cat.issues} />
        </div>
      ))}
    </motion.div>
  );
}

export default function AuditDashboard({ session }) {
  const [url, setUrl]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [data, setData]       = useState(null);
  const [history, setHistory] = useState([]);

  const runAudit = async () => {
    const target = url.trim();
    if (!target) return;
    setLoading(true); setError(''); setData(null);
    try {
      const r = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const json = await r.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      const cats = json.results || {};
      setHistory(prev => [{
        url:    target,
        perf:   cats.perf?.score ?? 0,
        seo:    cats.seo?.score  ?? 0,
        a11y:   cats.a11y?.score ?? 0,
        source: json.source,
        ts:     new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 9)]);
    } catch (e) {
      setError(e.message || 'Audit failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-bold text-lg mb-1">Run a Website Audit</h2>
        <p className="text-gray-400 text-sm mb-5">
          Get performance, SEO, accessibility and UX scores with actionable fixes. Powered by Google PageSpeed Insights with AI fallback.
        </p>
        <div className="flex gap-3">
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runAudit()}
            placeholder="https://yourwebsite.com"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />
          <button onClick={runAudit} disabled={loading || !url.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2 whitespace-nowrap">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Scanning…</>
              : '🔍 Run Audit'}
          </button>
        </div>
        {error && (
          <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
        )}
      </div>

      {/* Result */}
      {data && <AuditReport data={data} url={data.audited || url.trim()} />}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-white font-semibold text-sm">📜 Audit History (this session)</h3>
          </div>
          <div className="divide-y divide-white/5">
            {history.map((h, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate">{h.url}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gray-500 text-xs">{h.ts}</span>
                    {h.source === 'ai' && (
                      <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">AI</span>
                    )}
                    {h.source === 'pagespeed' && (
                      <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">Live</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  {[['Perf', h.perf, GAUGE_COLORS.perf], ['SEO', h.seo, GAUGE_COLORS.seo], ['A11y', h.a11y, GAUGE_COLORS.a11y]].map(([l, s, c]) => (
                    <div key={l} className="text-center">
                      <div className="font-bold" style={{ color: c }}>{s}</div>
                      <div className="text-gray-500">{l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setUrl(h.url)}
                  className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  Re-run
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
