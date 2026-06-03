/**
 * AutomationDashboard — AI Automation Expert
 *
 * For subscribers of the Automation Expert plan ($197/mo). Takes a plain
 * English workflow description and returns importable artefacts for
 * Zapier, Make.com, and n8n + a webhook snippet + Python equivalent.
 *
 * Quota: 25 generations/mo on the standard plan, tracked client-side
 * (move to usageStore when needed). Agency tier is unlimited.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PLATFORMS = [
  { id: 'all',    label: 'All three',  emoji: '🌐' },
  { id: 'zapier', label: 'Zapier',     emoji: '⚡' },
  { id: 'make',   label: 'Make.com',   emoji: '🟣' },
  { id: 'n8n',    label: 'n8n',        emoji: '🟧' },
];

const EXAMPLES = [
  {
    title: 'New lead → Slack + CRM',
    text: 'When a new lead is captured via a Typeform submission, send a formatted Slack alert to #sales, then create the contact in HubSpot, then send the lead a personalised welcome email via Gmail using a template.',
  },
  {
    title: 'Stripe payment → Airtable + receipt',
    text: 'When Stripe receives a successful charge, log the customer, amount, and product to an Airtable row, then email the customer a branded receipt via SendGrid, and post a celebration message in Slack #revenue.',
  },
  {
    title: 'Daily AI digest from RSS',
    text: 'Every morning at 8am, fetch the top 10 items from 3 RSS feeds, summarise them with OpenAI GPT-4o-mini in 2 sentences each, then email the digest to me via Gmail.',
  },
  {
    title: 'Calendly booking → prep email',
    text: 'When someone books a meeting on Calendly, look up their company website using a Google search, summarise it with OpenAI, then email me a one-pager 30 minutes before the meeting via Gmail.',
  },
];

const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'zapier',      label: 'Zapier' },
  { id: 'make',        label: 'Make.com' },
  { id: 'n8n',         label: 'n8n' },
  { id: 'webhook',     label: 'Webhook' },
  { id: 'python',      label: 'Python' },
];

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-gray-300 flex items-center gap-1.5"
    >
      {copied ? '✓ Copied' : `📋 ${label}`}
    </button>
  );
}

function DownloadButton({ text, filename }) {
  return (
    <button
      onClick={() => {
        const blob = new Blob([text], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }}
      className="text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-white font-semibold flex items-center gap-1.5"
    >
      ⬇ Download .json
    </button>
  );
}

function JsonBlock({ data, filename }) {
  const pretty = JSON.stringify(data, null, 2);
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-xs text-gray-500 font-mono">{filename}</span>
        <div className="flex gap-2">
          <CopyButton text={pretty} label="Copy JSON" />
          <DownloadButton text={pretty} filename={filename} />
        </div>
      </div>
      <pre className="p-4 text-[11px] text-gray-300 font-mono overflow-auto max-h-[480px] leading-relaxed">
        {pretty}
      </pre>
    </div>
  );
}

export default function AutomationDashboard({ session }) {
  const [description, setDescription] = useState('');
  const [platformHint, setPlatformHint] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);
  const [tab, setTab]         = useState('overview');
  const [history, setHistory] = useState([]);
  const [usedCount, setUsedCount] = useState(0);
  const resultRef = useRef(null);

  // Quota: agency = unlimited, everyone else = 25/mo
  const isAgency = session?.agentId === 'automation-agency' || session?.isSuperadmin;
  const monthlyQuota = isAgency ? Infinity : 25;

  // Persist history + usage to localStorage (keyed by token)
  const storageKey = `cm_automation_${session?.token || 'anon'}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (saved.history) setHistory(saved.history);
      if (typeof saved.used === 'number') setUsedCount(saved.used);
    } catch {}
  }, [storageKey]);

  const persist = (next) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  async function generate() {
    if (loading) return;
    const trimmed = description.trim();
    if (trimmed.length < 10) {
      setError('Describe your workflow in a bit more detail (at least 10 characters).');
      return;
    }
    if (usedCount >= monthlyQuota) {
      setError(`You've used all ${monthlyQuota} generations this month. Upgrade to Agency for unlimited.`);
      return;
    }
    setError(''); setLoading(true); setResult(null);

    try {
      const r = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: trimmed, platformHint }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Generation failed');

      setResult(data.blueprint);
      setTab('overview');

      const nextHistory = [
        { ts: new Date().toISOString(), title: data.blueprint.title || trimmed.slice(0, 60), description: trimmed, blueprint: data.blueprint },
        ...history,
      ].slice(0, 20);
      const nextUsed = usedCount + 1;
      setHistory(nextHistory);
      setUsedCount(nextUsed);
      persist({ history: nextHistory, used: nextUsed });

      // scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  const quotaLeft = monthlyQuota === Infinity ? '∞' : Math.max(0, monthlyQuota - usedCount);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header / quota */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">⚡ AI Automation Expert</h2>
          <p className="text-gray-400 text-sm mt-1">
            Describe any workflow → get importable blueprints for Zapier, Make, n8n + webhook & Python snippets.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm">
          <span className="text-gray-500">This month:</span>{' '}
          <span className="font-bold text-white">{quotaLeft}</span>
          <span className="text-gray-500"> / {monthlyQuota === Infinity ? '∞' : monthlyQuota} generations left</span>
        </div>
      </div>

      {/* Composer */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <label className="block text-sm font-semibold text-white mb-2">
          Describe your automation in plain English
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={5}
          placeholder="e.g. When a new lead is captured via Typeform, send a Slack alert to #sales, create the contact in HubSpot, and email them a welcome message…"
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-500 resize-none font-mono"
        />

        {/* Platform hint */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatformHint(p.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  platformHint === p.id
                    ? 'bg-brand-600 border-brand-500 text-white font-bold'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={loading || !description.trim()}
            className="bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>⚡ Generate Blueprint</>
            )}
          </button>
        </div>

        {/* Examples */}
        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Quick examples</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setDescription(ex.text)}
                className="text-left p-3 bg-black/30 border border-white/10 rounded-lg hover:bg-white/5 hover:border-brand-500/30 transition"
              >
                <div className="text-white text-xs font-semibold mb-1">{ex.title}</div>
                <div className="text-gray-500 text-[11px] leading-relaxed line-clamp-2">{ex.text}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
          >
            {/* Result header */}
            <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-brand-600/10 to-purple-600/10">
              <h3 className="text-xl font-bold text-white">{result.title}</h3>
              <p className="text-gray-400 text-sm mt-1.5">{result.summary}</p>
              <div className="flex flex-wrap gap-3 mt-4 text-xs">
                {result.estimatedRuns && (
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-300">
                    🔄 {result.estimatedRuns}
                  </span>
                )}
                {result.estimatedCost?.zapier && (
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-300">
                    ⚡ {result.estimatedCost.zapier}
                  </span>
                )}
                {result.estimatedCost?.make && (
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-300">
                    🟣 {result.estimatedCost.make}
                  </span>
                )}
                {result.estimatedCost?.n8n && (
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-300">
                    🟧 {result.estimatedCost.n8n}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-black/20 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-5 py-3 text-sm font-semibold transition whitespace-nowrap border-b-2 ${
                    tab === t.id
                      ? 'text-brand-400 border-brand-500'
                      : 'text-gray-500 border-transparent hover:text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {tab === 'overview' && (
                <div className="space-y-6">
                  {/* Trigger */}
                  {result.trigger && (
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Trigger</div>
                      <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-brand-400 font-bold text-sm">{result.trigger.app}</span>
                          <span className="text-gray-600">·</span>
                          <span className="text-gray-300 text-sm">{result.trigger.event}</span>
                        </div>
                        {result.trigger.notes && <div className="text-gray-500 text-xs mt-1">{result.trigger.notes}</div>}
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  {result.steps?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Steps</div>
                      <div className="space-y-2">
                        {result.steps.map(s => (
                          <div key={s.n} className="flex gap-3 bg-black/30 border border-white/10 rounded-xl p-4">
                            <div className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {s.n}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-brand-400 font-bold text-sm">{s.app}</span>
                                <span className="text-gray-600">·</span>
                                <span className="text-gray-300 text-sm">{s.action}</span>
                              </div>
                              <div className="text-gray-400 text-sm">{s.description}</div>
                              {s.config && Object.keys(s.config).length > 0 && (
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Config</summary>
                                  <pre className="mt-2 text-[11px] text-gray-400 bg-black/40 rounded-lg p-2 overflow-auto">{JSON.stringify(s.config, null, 2)}</pre>
                                </details>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings?.length > 0 && (
                    <div>
                      <div className="text-xs text-yellow-500 font-semibold uppercase mb-2">⚠ Gotchas</div>
                      <ul className="space-y-1.5">
                        {result.warnings.map((w, i) => (
                          <li key={i} className="text-sm text-yellow-200/80 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {tab === 'zapier' && result.zapierImport && (
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-200">
                    <strong>Note:</strong> Zapier doesn't support JSON imports from third-party tools. Follow the step-by-step instructions below to recreate the Zap in your Zapier dashboard.
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Manual setup instructions</div>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap">
                      {result.zapierImport.instructions}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Reference blocks</div>
                    <JsonBlock data={result.zapierImport.blocks} filename="zapier-blocks.json" />
                  </div>
                </div>
              )}

              {tab === 'make' && result.makeBlueprint && (
                <div className="space-y-4">
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-sm text-purple-200">
                    <strong>Import:</strong> {result.makeBlueprint.importInstructions || 'Make.com → Create Scenario → ⋯ menu → Import Blueprint → paste the JSON below.'}
                  </div>
                  <JsonBlock data={result.makeBlueprint} filename="make-blueprint.json" />
                </div>
              )}

              {tab === 'n8n' && result.n8nWorkflow && (
                <div className="space-y-4">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-sm text-orange-200">
                    <strong>Import:</strong> {result.n8nWorkflow.importInstructions || 'n8n → Workflows → ⋯ menu → Import from Clipboard → paste the JSON below.'}
                  </div>
                  <JsonBlock data={result.n8nWorkflow} filename="n8n-workflow.json" />
                </div>
              )}

              {tab === 'webhook' && result.webhookSnippet && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-400">{result.webhookSnippet.notes}</div>
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                      <span className="text-xs text-gray-500 font-mono">{result.webhookSnippet.language || 'bash'}</span>
                      <CopyButton text={result.webhookSnippet.code} />
                    </div>
                    <pre className="p-4 text-xs text-gray-300 font-mono overflow-auto">{result.webhookSnippet.code}</pre>
                  </div>
                </div>
              )}

              {tab === 'python' && result.pythonSnippet && (
                <div className="space-y-3">
                  {result.pythonSnippet.notes && <div className="text-sm text-gray-400">{result.pythonSnippet.notes}</div>}
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                      <span className="text-xs text-gray-500 font-mono">python</span>
                      <CopyButton text={result.pythonSnippet.code} />
                    </div>
                    <pre className="p-4 text-xs text-gray-300 font-mono overflow-auto">{result.pythonSnippet.code}</pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Recent generations</h3>
            <button
              onClick={() => { setHistory([]); persist({ history: [], used: usedCount }); }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setResult(h.blueprint); setTab('overview'); setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 80); }}
                className="w-full text-left px-5 py-3 hover:bg-white/3 transition"
              >
                <div className="text-white text-sm font-semibold">{h.title}</div>
                <div className="text-gray-500 text-xs mt-0.5 line-clamp-1">{h.description}</div>
                <div className="text-gray-600 text-[10px] mt-1 font-mono">{new Date(h.ts).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
