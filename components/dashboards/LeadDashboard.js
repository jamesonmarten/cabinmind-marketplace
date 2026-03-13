/**
 * LeadDashboard — full product for AI Lead Researcher subscribers.
 * Features:
 *  - Unlimited lead generation via /api/leads (GPT-4o mini)
 *  - ICP builder with industry + title + size presets
 *  - Lead table with score coloring, signal badges
 *  - CSV export of any/all leads
 *  - Lead save list (across generations, this session)
 *  - Click-to-copy email + phone
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ICP_PRESETS = [
  { label: 'SaaS Founders', value: 'B2B SaaS startup founders, 10-50 employees, series A or pre-revenue, using HubSpot or Salesforce' },
  { label: 'Marketing Leaders', value: 'VP of Marketing or CMO at mid-market B2B companies, 50-200 employees, tech industry' },
  { label: 'E-commerce Owners', value: 'E-commerce store owners doing $1M-$10M revenue, using Shopify, looking to scale' },
  { label: 'Agency Owners', value: 'Digital marketing agency owners, 5-30 employees, serving SMB clients' },
  { label: 'HR Directors', value: 'HR Directors or VP People at companies 100-500 employees, tech or finance sector' },
];

function ScoreBadge({ score }) {
  const color = score >= 90 ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : score >= 80 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : score >= 70 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${color} font-bold`}>{score}</span>
  );
}

function CopyCell({ value, type }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-left text-xs text-gray-300 hover:text-white transition-all group flex items-center gap-1" title={`Copy ${type}`}>
      <span className="truncate max-w-[160px]">{value}</span>
      <span className="text-gray-600 group-hover:text-gray-400 flex-shrink-0">{copied ? '✅' : '📋'}</span>
    </button>
  );
}

function LeadTable({ leads, onSave, savedIds }) {
  const [sort, setSort] = useState({ key: 'score', dir: -1 });
  const sorted = [...leads].sort((a, b) => (a[sort.key] > b[sort.key] ? sort.dir : -sort.dir));
  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }));

  const cols = [
    { key: 'name', label: 'Name' },
    { key: 'title', label: 'Title' },
    { key: 'company', label: 'Company' },
    { key: 'size', label: 'Size' },
    { key: 'score', label: 'Score' },
    { key: 'signal', label: 'Signal' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'tech', label: 'Tech Stack' },
    { key: 'save', label: '' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {cols.map(col => (
              <th key={col.key} onClick={() => col.key !== 'save' && toggleSort(col.key)}
                className={`text-left px-3 py-3 text-xs text-gray-500 font-medium whitespace-nowrap ${col.key !== 'save' ? 'cursor-pointer hover:text-gray-300' : ''}`}>
                {col.label} {sort.key === col.key ? (sort.dir === -1 ? '↓' : '↑') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead, i) => (
            <motion.tr key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="border-b border-white/5 hover:bg-white/5 transition-all">
              <td className="px-3 py-3 text-white font-medium whitespace-nowrap">{lead.name}</td>
              <td className="px-3 py-3 text-gray-300 whitespace-nowrap max-w-[180px]">
                <span className="truncate block">{lead.title}</span>
              </td>
              <td className="px-3 py-3 text-gray-300 whitespace-nowrap font-medium">{lead.company}</td>
              <td className="px-3 py-3 text-gray-400 whitespace-nowrap text-xs">{lead.size}</td>
              <td className="px-3 py-3 whitespace-nowrap"><ScoreBadge score={lead.score} /></td>
              <td className="px-3 py-3 max-w-[200px]">
                <span className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-2 py-0.5 inline-block">
                  {lead.signal}
                </span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap"><CopyCell value={lead.email} type="email" /></td>
              <td className="px-3 py-3 whitespace-nowrap"><CopyCell value={lead.phone} type="phone" /></td>
              <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{lead.tech}</td>
              <td className="px-3 py-3">
                <button onClick={() => onSave(lead)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                    savedIds.has(lead.email)
                      ? 'bg-green-500/20 border-green-500/30 text-green-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}>
                  {savedIds.has(lead.email) ? '✓ Saved' : '+ Save'}
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function exportCSV(leads, filename) {
  const headers = ['Name', 'Title', 'Company', 'Size', 'ICP Score', 'Signal', 'Email', 'Phone', 'Tech Stack'];
  const rows = leads.map(l => [l.name, l.title, l.company, l.size, l.score, l.signal, l.email, l.phone, l.tech]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${Date.now()}.csv`; a.click();
}

export default function LeadDashboard({ session }) {
  const [icp, setIcp] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');
  const [savedLeads, setSavedLeads] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [tab, setTab] = useState('generate');
  const [runCount, setRunCount] = useState(0);

  const generateLeads = async () => {
    if (!icp.trim()) return;
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icp: icp.trim() }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setLeads(data.leads || []);
      setRunCount(c => c + 1);
    } catch (e) {
      setError(e.message || 'Lead generation failed. Please try again.');
    }
    setLoading(false);
  };

  const saveOneLead = (lead) => {
    if (savedIds.has(lead.email)) return;
    setSavedLeads(prev => [...prev, lead]);
    setSavedIds(prev => new Set([...prev, lead.email]));
  };

  const saveAllLeads = () => leads.forEach(saveOneLead);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {[{ id: 'generate', label: '🔎 Generate Leads' }, { id: 'saved', label: `💾 Saved Leads (${savedLeads.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'generate' && (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* ICP builder */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-1">Generate Qualified Leads</h2>
              <p className="text-gray-400 text-sm mb-5">Describe your ideal customer and get 5 AI-researched leads with contact info, tech stack, and buying signals.</p>

              <div className="mb-3">
                <label className="text-gray-400 text-xs block mb-1.5">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  {ICP_PRESETS.map(p => (
                    <button key={p.label} onClick={() => setIcp(p.value)}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-gray-400 text-xs block mb-1.5">Ideal Customer Profile (ICP)</label>
                <textarea value={icp} onChange={e => setIcp(e.target.value)} rows={3}
                  placeholder="Describe your ideal customer: role, company size, industry, pain points, tools they use, budget level, etc."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none" />
              </div>

              <div className="flex gap-3 items-center">
                <button onClick={generateLeads} disabled={loading || !icp.trim()}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2">
                  {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Researching leads…</> : '🔎 Find Leads'}
                </button>
                {runCount > 0 && <span className="text-gray-500 text-xs">{runCount * 5} leads generated this session</span>}
              </div>
              {error && <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
            </div>

            {/* Results table */}
            {leads.length > 0 && (
              <motion.div key="table" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3 flex-wrap">
                  <h3 className="text-white font-semibold text-sm flex-1">{leads.length} Leads Found</h3>
                  <div className="flex gap-2">
                    <button onClick={saveAllLeads} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
                      💾 Save All
                    </button>
                    <button onClick={() => exportCSV(leads, 'leads')} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
                      ⬇️ Export CSV
                    </button>
                  </div>
                </div>
                <LeadTable leads={leads} onSave={saveOneLead} savedIds={savedIds} />
              </motion.div>
            )}
          </motion.div>
        )}

        {tab === 'saved' && (
          <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {savedLeads.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-500">
                <div className="text-4xl mb-3">💾</div>
                <div>No saved leads yet. Generate leads and click "+ Save" to add them here.</div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                  <h3 className="text-white font-semibold text-sm flex-1">{savedLeads.length} Saved Leads</h3>
                  <button onClick={() => exportCSV(savedLeads, 'saved-leads')}
                    className="text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-500 text-white font-bold hover:opacity-90 transition-all">
                    ⬇️ Export All to CSV
                  </button>
                  <button onClick={() => { setSavedLeads([]); setSavedIds(new Set()); }}
                    className="text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 transition-all">
                    🗑️ Clear
                  </button>
                </div>
                <LeadTable leads={savedLeads} onSave={() => {}} savedIds={savedIds} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
