/**
 * /wordpress — CabinMind WordPress Plugin Suite
 * Documentation hub + live demos for all 6 freemium WP plugins.
 */
import Layout from '../components/Layout';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';

// ─── Plugin registry ──────────────────────────────────────────────────────────
const PLUGINS = [
  {
    id:         'wp-vulnerability-scanner',
    slug:       'cabinmind-vuln-scanner',
    name:       'Vulnerability Scanner',
    icon:       '🔒',
    gradient:   'from-red-500 to-rose-600',
    bg:         'from-red-900/20 to-rose-900/5',
    border:     'border-red-500/20',
    tagline:    'Surface CVEs, exposed plugins, and missing security headers in seconds.',
    shortcode:  '[cabinmind_vuln_scan]',
    freeLimit:  '1 scan / day',
    apiRoute:   '/api/wp/vuln-scan',
    zip:        'cabinmind-vuln-scanner-1.0.0.zip',
    features:   ['Plugin CVE detection', 'Security header audit', 'Exposed endpoint flags', 'Risk-scored report'],
    docs: [
      { q: 'What does it scan?', a: 'Fetches the public HTML of the URL you enter, extracts plugin slugs from source paths, checks for known CVEs via AI, and audits HTTP security response headers.' },
      { q: 'Does it need admin access?', a: 'No. Everything is done from the outside using public HTTP requests — no WordPress credentials or API keys required.' },
      { q: 'What is the free tier?', a: '1 scan per day per visitor, enforced server-side. No account or API key needed to use the free tier.' },
    ],
    demoType: 'vuln',
  },
  {
    id:         'wp-plugin-recommender',
    slug:       'cabinmind-plugin-recommender',
    name:       'Plugin Recommender',
    icon:       '🧩',
    gradient:   'from-blue-500 to-indigo-600',
    bg:         'from-blue-900/20 to-indigo-900/5',
    border:     'border-blue-500/20',
    tagline:    'A curated, conflict-free plugin stack for your exact business type.',
    shortcode:  '[cabinmind_plugin_recommender]',
    freeLimit:  '2 stacks / month',
    apiRoute:   '/api/wp/plugin-recommender',
    zip:        'cabinmind-plugin-recommender-1.0.0.zip',
    features:   ['8–10 plugins per stack', 'Install-order guidance', 'Conflict warnings', 'Direct WP.org links'],
    docs: [
      { q: 'Are all recommended plugins free?', a: 'The AI prioritises free and freemium plugins from WordPress.org. Paid alternatives are only suggested when no good free option exists.' },
      { q: 'Can it recommend plugins for WooCommerce?', a: 'Yes. Select "E-commerce" as your business type and describe your store — WooCommerce and its best companion plugins will be included.' },
      { q: 'What is the free tier?', a: '2 recommendations per month per visitor, enforced server-side.' },
    ],
    demoType: 'recommender',
  },
  {
    id:         'wp-speed-optimizer',
    slug:       'cabinmind-speed-optimizer',
    name:       'Speed Optimizer',
    icon:       '⚡',
    gradient:   'from-amber-500 to-orange-600',
    bg:         'from-amber-900/20 to-orange-900/5',
    border:     'border-amber-500/20',
    tagline:    'Live Core Web Vitals + a prioritised WordPress fix list from Google PageSpeed.',
    shortcode:  '[cabinmind_speed_optimizer]',
    freeLimit:  '1 audit / day',
    apiRoute:   '/api/wp/speed-optimizer',
    zip:        'cabinmind-speed-optimizer-1.0.0.zip',
    features:   ['Live Lighthouse scores', 'LCP, CLS, FCP, TBT', 'WP-specific fix list', 'Plugin recommendations'],
    docs: [
      { q: 'Does this use my site\'s PageSpeed quota?', a: 'No. The API call is made server-side by CabinMind — your site\'s Google API quota is not affected.' },
      { q: 'What if PageSpeed is unavailable?', a: 'The plugin falls back to an AI-generated analysis with general WordPress optimisation recommendations.' },
      { q: 'What is the free tier?', a: '1 audit per day per visitor, enforced server-side.' },
    ],
    demoType: 'speed',
  },
  {
    id:         'wp-maintenance-report',
    slug:       'cabinmind-maintenance-report',
    name:       'Maintenance Report',
    icon:       '📋',
    gradient:   'from-emerald-500 to-teal-600',
    bg:         'from-emerald-900/20 to-teal-900/5',
    border:     'border-emerald-500/20',
    tagline:    'Professional monthly client reports generated in under 60 seconds.',
    shortcode:  '[cabinmind_maintenance_report]',
    freeLimit:  '1 report / month',
    apiRoute:   '/api/wp/maintenance-report',
    zip:        'cabinmind-maintenance-report-1.0.0.zip',
    features:   ['Live performance scores', 'Update & backup summary', 'Security scan results', 'White-label ready'],
    docs: [
      { q: 'Is the data real or generated?', a: 'Performance scores come from live Google PageSpeed Insights. Uptime, backup counts, and update stats are AI-generated estimates consistent with a well-maintained site. Upgrade at wp.devcabin.tech for live monitoring integration.' },
      { q: 'Can I white-label the report?', a: 'The free plugin includes client name, site URL, and period. Full branding (logo, colours, agency name) is available in the paid plan at wp.devcabin.tech.' },
      { q: 'What is the free tier?', a: '1 sample report per month per visitor, enforced server-side.' },
    ],
    demoType: 'report',
  },
  {
    id:         'wp-child-theme-builder',
    slug:       'cabinmind-css-snippet',
    name:       'CSS Snippet Generator',
    icon:       '🎨',
    gradient:   'from-violet-500 to-purple-600',
    bg:         'from-violet-900/20 to-purple-900/5',
    border:     'border-violet-500/20',
    tagline:    'Conflict-safe CSS for Divi, Elementor, Astra — described in plain English.',
    shortcode:  '[cabinmind_css_snippet]',
    freeLimit:  '3 snippets / month',
    apiRoute:   '/api/wp/css-snippet',
    zip:        'cabinmind-css-snippet-1.0.0.zip',
    features:   ['Theme-aware selectors', 'Conflict warnings', 'Child theme scaffold', 'PHP snippets included'],
    docs: [
      { q: 'Does the plugin execute the CSS automatically?', a: 'No. All generated code is displayed as plain text inside a code block with a copy button. You paste it yourself — the plugin never modifies your theme.' },
      { q: 'Which themes are supported?', a: 'Divi, Elementor, Astra, GeneratePress, Kadence, Blocksy, Neve, Storefront, Twenty Twenty-Four, and generic themes.' },
      { q: 'What is the free tier?', a: '3 snippets per month per visitor, enforced server-side.' },
    ],
    demoType: 'css',
  },
  {
    id:         'wp-link-checker',
    slug:       'cabinmind-link-checker',
    name:       'Broken Link Checker',
    icon:       '🔗',
    gradient:   'from-cyan-500 to-teal-600',
    bg:         'from-cyan-900/20 to-teal-900/5',
    border:     'border-cyan-500/20',
    tagline:    'Crawl your sitemap, find broken links, export a redirect map as CSV.',
    shortcode:  '[cabinmind_link_checker]',
    freeLimit:  '1 crawl / day, up to 100 URLs',
    apiRoute:   '/api/wp/link-checker',
    zip:        'cabinmind-link-checker-1.0.0.zip',
    features:   ['Sitemap auto-discovery', 'Live HTTP status checks', 'Redirect mapping', 'CSV export'],
    docs: [
      { q: 'Does it crawl the whole site?', a: 'It reads your sitemap.xml first, then falls back to homepage link extraction. The free tier checks up to 100 URLs per crawl.' },
      { q: 'Can I export the results?', a: 'Yes. Both the broken links table and redirect map have Export CSV buttons that download directly to your browser — no server involved.' },
      { q: 'What is the free tier?', a: '1 crawl per day (up to 100 URLs) per visitor, enforced server-side.' },
    ],
    demoType: 'links',
  },
];

// ─── Inline demo components (call internal API routes) ────────────────────────

function DemoUrlForm({ placeholder, btnLabel, gradient, onSubmit, loading }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input type="url" value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors" />
      <button onClick={() => onSubmit(val)} disabled={loading || !val.trim()}
        className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${gradient} text-white font-bold text-sm disabled:opacity-40 hover:opacity-90 transition whitespace-nowrap flex items-center gap-2`}>
        {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {btnLabel}
      </button>
    </div>
  );
}

function ErrMsg({ msg }) { return msg ? <p className="text-red-400 text-sm">{msg}</p> : null; }

function ScoreBar({ label, val }) {
  const cls = val >= 80 ? 'bg-green-400' : val >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-xs w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full ${cls}`} style={{ width: `${val || 0}%` }} /></div>
      <span className="text-white text-xs font-bold w-6 text-right">{val ?? '—'}</span>
    </div>
  );
}

function PluginDemo({ plugin }) {
  const [state, setState] = useState({ loading: false, result: null, error: '' });
  const [inputs, setInputs] = useState({ url: '', desc: '', theme: 'astra', bType: 'service-business', bizName: '' });

  const setI = (k, v) => setInputs(p => ({ ...p, [k]: v }));

  const call = async (body) => {
    setState({ loading: true, result: null, error: '' });
    try {
      const r = await fetch(plugin.apiRoute, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (r.status === 429) { setState({ loading: false, result: null, error: 'Free demo limit reached — upgrade at wp.devcabin.tech for unlimited.' }); return; }
      if (!r.ok) { setState({ loading: false, result: null, error: d.error || 'Request failed.' }); return; }
      setState({ loading: false, result: d, error: '' });
    } catch { setState({ loading: false, result: null, error: 'Network error — please try again.' }); }
  };

  const { loading, result, error } = state;

  // Render demo input by type
  const renderInput = () => {
    if (plugin.demoType === 'recommender') return (
      <div className="space-y-3">
        <select value={inputs.bType} onChange={e => setI('bType', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          {[['e-commerce','E-commerce'],['blog','Blog'],['service-business','Service Business'],['portfolio','Portfolio'],['restaurant','Restaurant'],['nonprofit','Nonprofit'],['real-estate','Real Estate'],['membership','Membership'],['other','Other']].map(([v,l]) => <option key={v} value={v} className="bg-gray-900">{l}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="text" value={inputs.desc} onChange={e => setI('desc', e.target.value)} placeholder="Describe your business (min 10 chars)…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" />
          <button onClick={() => call({ businessType: inputs.bType, description: inputs.desc })} disabled={loading || inputs.desc.length < 10}
            className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${plugin.gradient} text-white font-bold text-sm disabled:opacity-40 hover:opacity-90 transition whitespace-nowrap flex items-center gap-2`}>
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}Get Stack
          </button>
        </div>
      </div>
    );
    if (plugin.demoType === 'css') return (
      <div className="space-y-3">
        <select value={inputs.theme} onChange={e => setI('theme', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          {['astra','divi','elementor','generatepress','kadence','blocksy','neve','storefront','twentytwentyfour','other'].map(t => <option key={t} value={t} className="bg-gray-900">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="text" value={inputs.desc} onChange={e => setI('desc', e.target.value)} placeholder="Describe the design change…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" />
          <button onClick={() => call({ description: inputs.desc, theme: inputs.theme })} disabled={loading || inputs.desc.length < 10}
            className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${plugin.gradient} text-white font-bold text-sm disabled:opacity-40 hover:opacity-90 transition whitespace-nowrap flex items-center gap-2`}>
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}Generate
          </button>
        </div>
      </div>
    );
    if (plugin.demoType === 'report') return (
      <div className="space-y-3">
        <DemoUrlForm placeholder="https://clientsite.com" btnLabel="" gradient={plugin.gradient} onSubmit={() => {}} loading={false} />
        <div className="flex gap-2">
          <input type="url" value={inputs.url} onChange={e => setI('url', e.target.value)} placeholder="https://clientsite.com"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" />
          <input type="text" value={inputs.bizName} onChange={e => setI('bizName', e.target.value)} placeholder="Client name"
            className="w-40 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" />
          <button onClick={() => call({ siteUrl: inputs.url, businessName: inputs.bizName })} disabled={loading || !inputs.url.trim() || !inputs.bizName.trim()}
            className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${plugin.gradient} text-white font-bold text-sm disabled:opacity-40 hover:opacity-90 transition whitespace-nowrap flex items-center gap-2`}>
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}Generate
          </button>
        </div>
      </div>
    );
    // vuln, speed, links — URL form
    const labels = { vuln: 'Scan', speed: 'Audit', links: 'Crawl' };
    const bodies = { vuln: () => ({ url: inputs.url }), speed: () => ({ url: inputs.url }), links: () => ({ url: inputs.url, maxUrls: 30 }) };
    return (
      <DemoUrlForm placeholder="https://yoursite.com" btnLabel={labels[plugin.demoType] || 'Run'}
        gradient={plugin.gradient} loading={loading} onSubmit={v => { setI('url', v); call(bodies[plugin.demoType]()); }} />
    );
  };

  // Render results
  const renderResult = () => {
    if (!result) return null;
    const d = result.data || result;

    if (plugin.demoType === 'vuln') return (
      <div className="space-y-3 mt-4">
        {d.summary && <p className="text-gray-300 text-sm">{d.summary}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[['Risk', d.overallRisk || '—'], ['WP Ver', d.wordpressVersion || '?'], ['Plugins', (d.plugins||[]).length], ['Exposed', (d.exposedEndpoints||[]).length]].map(([l,v]) => (
            <div key={l} className="glass border border-white/10 rounded-lg p-2 text-center"><div className="text-white font-bold text-sm">{v}</div><div className="text-gray-400 text-xs">{l}</div></div>
          ))}
        </div>
        {(d.plugins||[]).slice(0,4).map((p,i) => (
          <div key={i} className="flex items-start gap-2 glass border border-white/10 rounded-lg p-3">
            <span className="px-1.5 py-0.5 text-xs font-bold border rounded-full text-red-400 border-red-400/30 bg-red-400/10 flex-shrink-0">{p.riskLevel}</span>
            <div><div className="text-white text-sm">{p.name}</div><div className="text-gray-400 text-xs">{p.issue}</div></div>
          </div>
        ))}
      </div>
    );

    if (plugin.demoType === 'speed') return (
      <div className="space-y-3 mt-4">
        {d.summary && <p className="text-gray-300 text-sm">{d.summary}</p>}
        <div className="space-y-2">
          {[['Performance', d.scores?.performance], ['SEO', d.scores?.seo], ['Accessibility', d.scores?.accessibility]].map(([l,v]) => <ScoreBar key={l} label={l} val={v} />)}
        </div>
        {(d.fixes||[]).slice(0,3).map((f,i) => (
          <div key={i} className="glass border border-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2"><span className="text-white text-sm font-medium">{f.title}</span>{f.estimatedGain && <span className="text-green-400 text-xs ml-auto">{f.estimatedGain}</span>}</div>
            {f.wpSolution && <p className="text-brand-400 text-xs mt-1">→ {f.wpSolution}</p>}
          </div>
        ))}
      </div>
    );

    if (plugin.demoType === 'report') return (
      <div className="space-y-3 mt-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${plugin.gradient}/20 border ${plugin.border}`}>
          <div className="text-xs text-gray-400">{d.period}</div>
          <div className="text-white font-bold">{d.clientName}</div>
        </div>
        {d.executiveSummary && <p className="text-gray-300 text-sm">{d.executiveSummary}</p>}
        <div className="grid grid-cols-2 gap-2">
          {[['Uptime', d.uptime?.percentage], ['Perf', (d.performance?.currentScore||'—')+'/100'], ['Updates', (d.updates?.pluginUpdates||0)+' plugins'], ['SSL', d.security?.sslStatus]].map(([l,v]) => (
            <div key={l} className="glass border border-white/10 rounded-lg p-2"><div className="text-white text-sm font-bold">{v || '—'}</div><div className="text-gray-400 text-xs">{l}</div></div>
          ))}
        </div>
      </div>
    );

    if (plugin.demoType === 'recommender') return (
      <div className="space-y-2 mt-4">
        {d.summary && <p className="text-gray-300 text-sm mb-3">{d.summary}</p>}
        {(d.stack||[]).slice(0,5).map((p,i) => (
          <div key={i} className="glass border border-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs font-mono">#{p.installOrder}</span>
              <span className="text-white text-sm font-medium">{p.name}</span>
              <span className="text-gray-400 text-xs ml-auto">{p.pricing}</span>
            </div>
            <p className="text-gray-400 text-xs mt-1">{p.purpose}</p>
          </div>
        ))}
      </div>
    );

    if (plugin.demoType === 'css') return (
      <div className="space-y-3 mt-4">
        {d.preview && <p className="text-gray-300 text-sm">{d.preview}</p>}
        {d.css && <pre className="bg-gray-950 border border-white/10 rounded-xl p-4 text-xs text-purple-300 font-mono overflow-x-auto max-h-48">{d.css}</pre>}
        {d.placement && <p className="text-xs text-gray-400">📌 {d.placement}</p>}
      </div>
    );

    if (plugin.demoType === 'links') return (
      <div className="space-y-3 mt-4">
        <div className="grid grid-cols-4 gap-2">
          {[['OK', result.summary?.ok, 'text-green-400'], ['Broken', result.summary?.broken, 'text-red-400'], ['Redirects', result.summary?.redirects, 'text-yellow-400'], ['Total', result.scanned, 'text-white']].map(([l,v,cls]) => (
            <div key={l} className="glass border border-white/10 rounded-lg p-2 text-center"><div className={`font-bold text-sm ${cls}`}>{v ?? '—'}</div><div className="text-gray-400 text-xs">{l}</div></div>
          ))}
        </div>
        {result.summary?.broken === 0 && <p className="text-green-400 text-sm">✓ No broken links found.</p>}
        {(result.broken||[]).slice(0,5).map((r,i) => (
          <div key={i} className="flex items-center gap-2 glass border border-white/10 rounded-lg p-2">
            <span className="text-red-400 text-xs font-bold">{r.status||'ERR'}</span>
            <span className="text-gray-300 text-xs font-mono truncate">{r.url}</span>
          </div>
        ))}
      </div>
    );

    return null;
  };

  return (
    <div>
      {renderInput()}
      <ErrMsg msg={error} />
      {loading && <p className="text-gray-400 text-sm animate-pulse mt-3">Running… this may take up to 20 s for live data.</p>}
      {renderResult()}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WordPressPage() {
  const [activeDemo, setActiveDemo] = useState(null);
  const [activeDoc, setActiveDoc]   = useState(null);

  return (
    <Layout
      title="WordPress Plugin Suite | CabinMind"
      description="6 free-to-use AI WordPress plugins: vulnerability scanner, plugin recommender, speed optimizer, maintenance reports, CSS snippets, and broken link checker."
      canonicalPath="/wordpress"
    >
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-16 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/50 to-transparent pointer-events-none" />
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 uppercase tracking-wider mb-6">
            Free WordPress Plugins
          </span>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-4 leading-tight">
            The CabinMind <br />
            <span className="gradient-text">WordPress Suite</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6 max-w-2xl mx-auto">
            6 standalone AI-powered plugins — each with a live free tier, no account required.
            Install any one, paste one shortcode, and the tool is live on your page.
          </p>
          <div className="flex flex-wrap gap-3 justify-center text-sm mb-8">
            {['GPL-2.0 licensed', 'No API key required', 'Free tier included', 'WP.org ready'].map(t => (
              <span key={t} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">✓ {t}</span>
            ))}
          </div>
          <a href="#plugins" className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 hover:scale-105 transition-all shadow-xl">
            Browse All 6 Plugins ↓
          </a>
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-black text-white text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            ['1', '⬇', 'Download & Install', 'Download the .zip, upload it to WordPress Plugins → Add New, and activate.'],
            ['2', '📄', 'Paste the Shortcode', 'Add the shortcode to any page, post, or widget area — the full tool appears instantly.'],
            ['3', '🤖', 'AI Results Live', 'Visitors enter their URL or question — the AI processes it and renders results on-page.'],
          ].map(([n, icon, title, desc]) => (
            <motion.div key={n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="glass border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="text-white font-bold mb-2">{title}</div>
              <p className="text-gray-400 text-sm">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Plugin cards ── */}
      <section id="plugins" className="max-w-6xl mx-auto px-4 pb-24 space-y-6">
        <h2 className="text-3xl font-black text-white text-center mb-10">All 6 Plugins</h2>

        {PLUGINS.map((plugin, idx) => (
          <motion.div
            key={plugin.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.04 }}
            className={`glass border ${plugin.border} rounded-3xl overflow-hidden`}
          >
            {/* Card header */}
            <div className={`p-6 sm:p-8 bg-gradient-to-r ${plugin.bg}`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                {/* Icon + meta */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plugin.gradient} flex items-center justify-center text-3xl shadow-lg flex-shrink-0`}>
                    {plugin.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{plugin.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{plugin.tagline}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-green-400/10 border border-green-400/20 text-green-400 text-xs rounded-full font-semibold">
                      Free: {plugin.freeLimit}
                    </span>
                  </div>
                </div>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  {plugin.features.map(f => (
                    <span key={f} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">✓ {f}</span>
                  ))}
                </div>
              </div>

              {/* Shortcode */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <code className="bg-gray-950/80 border border-white/10 rounded-xl px-4 py-2 text-brand-400 text-sm font-mono">
                  {plugin.shortcode}
                </code>
                <Link href={`/agents/${plugin.id}`} className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1">
                  Full docs →
                </Link>
              </div>
            </div>

            {/* Action row */}
            <div className="px-6 sm:px-8 py-4 border-t border-white/5 flex flex-wrap gap-3">
              <a
                href={`/WORDPRESS-PLUGIN/${plugin.zip}`}
                download
                className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${plugin.gradient} text-white font-bold text-sm hover:opacity-90 transition shadow`}
              >
                ⬇ Download .zip
              </a>
              <button
                onClick={() => setActiveDemo(activeDemo === plugin.id ? null : plugin.id)}
                className="px-5 py-2.5 rounded-xl glass border border-white/10 text-white font-semibold text-sm hover:border-white/20 transition"
              >
                {activeDemo === plugin.id ? '✕ Close Demo' : '▶ Live Demo'}
              </button>
              <button
                onClick={() => setActiveDoc(activeDoc === plugin.id ? null : plugin.id)}
                className="px-5 py-2.5 rounded-xl glass border border-white/10 text-gray-300 font-semibold text-sm hover:border-white/20 transition"
              >
                {activeDoc === plugin.id ? '✕ Close' : '📖 Docs & FAQ'}
              </button>
              <Link href={`/agents/${plugin.id}`} className="px-5 py-2.5 rounded-xl glass border border-white/10 text-gray-400 text-sm font-semibold hover:border-white/20 transition">
                Detail page →
              </Link>
            </div>

            {/* Live demo panel */}
            {activeDemo === plugin.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 sm:px-8 pb-8 border-t border-white/5"
              >
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-4">Live Demo — powered by CabinMind API</p>
                <PluginDemo plugin={plugin} />
              </motion.div>
            )}

            {/* Docs / FAQ panel */}
            {activeDoc === plugin.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-6 sm:px-8 pb-8 border-t border-white/5"
              >
                <div className="mt-6 grid sm:grid-cols-2 gap-6">
                  {/* Installation */}
                  <div>
                    <h4 className="text-white font-bold text-sm mb-3">Installation</h4>
                    <ol className="space-y-2 text-sm text-gray-400">
                      <li className="flex gap-2"><span className="text-brand-400 font-bold">1.</span> Download the .zip above</li>
                      <li className="flex gap-2"><span className="text-brand-400 font-bold">2.</span> WordPress Admin → Plugins → Add New → Upload Plugin</li>
                      <li className="flex gap-2"><span className="text-brand-400 font-bold">3.</span> Select the .zip and click Install Now</li>
                      <li className="flex gap-2"><span className="text-brand-400 font-bold">4.</span> Activate the plugin</li>
                      <li className="flex gap-2"><span className="text-brand-400 font-bold">5.</span> Paste <code className="text-brand-400 font-mono bg-brand-400/10 px-1 rounded">{plugin.shortcode}</code> on any page</li>
                    </ol>
                  </div>

                  {/* FAQ */}
                  <div>
                    <h4 className="text-white font-bold text-sm mb-3">FAQ</h4>
                    <div className="space-y-4">
                      {plugin.docs.map((item, i) => (
                        <div key={i}>
                          <p className="text-white text-sm font-semibold">{item.q}</p>
                          <p className="text-gray-400 text-sm mt-1">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* External services disclosure */}
                <div className="mt-6 p-4 bg-white/3 border border-white/10 rounded-xl text-xs text-gray-500">
                  <span className="text-gray-400 font-semibold">External Service:</span> This plugin sends form data to <span className="text-brand-400">products.devcabin.tech/api/wp/*</span> and receives JSON results. No executable code is downloaded. &nbsp;
                  <a href="https://devcabin.tech/terms" className="hover:text-gray-300 transition" target="_blank" rel="noopener noreferrer">Terms</a> ·{' '}
                  <a href="https://devcabin.tech/privacy" className="hover:text-gray-300 transition" target="_blank" rel="noopener noreferrer">Privacy</a>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-3xl font-black text-white mb-3">Need the full suite?</h2>
          <p className="text-gray-400 mb-8">Upgrade at wp.devcabin.tech for unlimited usage, white-label branding, PDF exports, and scheduled automations across all 6 tools.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wp.devcabin.tech" target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 hover:scale-105 transition-all shadow-xl">
              Explore Full Suite ↗
            </a>
            <Link href="/agents" className="px-8 py-4 rounded-xl glass border border-white/10 text-white font-semibold hover:border-white/20 transition-all">
              Browse All Agents
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} Dev Cabin Technologies · CabinMind
      </footer>
    </Layout>
  );
}
