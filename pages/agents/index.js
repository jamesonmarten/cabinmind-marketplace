import Layout from '../../components/Layout';
import AgentCard from '../../components/AgentCard';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CATEGORIES = ['All', 'Customer Support', 'Marketing', 'Content', 'Sales', 'Consulting', 'WordPress'];

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => { setAgents(d); setLoading(false); });
  }, []);

  const filtered = agents
    .filter((a) => filter === 'All' || a.category === filter)
    .filter((a) =>
      search.trim() === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
    );

  // Split WordPress agents from the main set when no filter / search is applied
  // so we can showcase them in their own banner section.
  const showSplitSections = filter === 'All' && search.trim() === '';
  const wpAgents   = showSplitSections ? filtered.filter(a => a.category === 'WordPress') : [];
  const mainAgents = showSplitSections ? filtered.filter(a => a.category !== 'WordPress') : filtered;

  return (
    <Layout title="Agent Marketplace – CabinMind">
      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-brand-900/60 to-transparent pt-24 pb-16 px-4">
        <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl opacity-10 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <h1 className="text-5xl font-black text-white mb-4">
            AI Agent <span className="gradient-text">Marketplace</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Pick an agent, hit <span className="text-white font-semibold">Get Started</span>, deploy in minutes.
            Or click <span className="text-white font-semibold">👁 Demo</span> to try it first.
          </p>
          <div className="flex flex-wrap gap-3 justify-center text-sm">
            <a href="/pricing" className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition">
              💰 Compare all plans
            </a>
            <a href="/trial" className="px-4 py-2 rounded-full bg-brand-600/20 border border-brand-500/40 text-brand-200 hover:bg-brand-600/30 transition">
              🎁 Free 50-lead trial — no card
            </a>
          </div>
        </motion.div>
      </div>

      {/* Category filters + search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search agents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full glass border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-400/50 bg-transparent"
            />
          </div>
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  filter === cat
                    ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white border-transparent shadow-lg shadow-brand-500/30'
                    : 'glass border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mainAgents.map((agent, i) => (
                <AgentCard key={agent.id} agent={agent} index={i} />
              ))}
            </div>

            {/* WordPress section — only when no filter/search is active */}
            {showSplitSections && wpAgents.length > 0 && (
              <div className="mt-20">
                {/* Section banner */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-indigo-900/40 p-8 mb-8"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl opacity-20 pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-xs font-semibold mb-3">
                        🔌 WordPress Agent Suite
                      </div>
                      <h2 className="text-3xl font-black text-white mb-2">
                        Built for WordPress <span className="gradient-text">Pros &amp; Agencies</span>
                      </h2>
                      <p className="text-gray-400 max-w-xl">
                        6 specialised agents that solve real WP problems — vulnerability scans, plugin recommendations,
                        Core Web Vitals, maintenance reports, child themes, broken-link maps. Bring your own OpenAI key.
                      </p>
                    </div>
                    <a
                      href="https://wp.devcabin.tech"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition shadow-lg whitespace-nowrap flex-shrink-0"
                    >
                      Open Full Suite ↗
                    </a>
                  </div>
                </motion.div>

                {/* WordPress agent grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {wpAgents.map((agent, i) => (
                    <AgentCard key={agent.id} agent={agent} index={i} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-24 text-gray-500">
            {search ? `No agents match "${search}".` : 'No agents in this category yet.'}
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-24" />
    </Layout>
  );
}