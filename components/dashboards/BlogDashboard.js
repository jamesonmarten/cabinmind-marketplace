/**
 * BlogDashboard — full product for AI Blog Writer subscribers.
 * Features:
 *  - Full article generation (GPT-4o mini via /api/blog)
 *  - Topic + keyword + tone controls
 *  - Word count & SEO stats
 *  - Copy to clipboard / download as Markdown or HTML
 *  - Article history (in-session, last 10)
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TONES = ['Professional', 'Conversational', 'Persuasive', 'Educational', 'Witty'];
const LENGTHS = [
  { label: 'Short (400–600 words)', words: 500 },
  { label: 'Medium (800–1,000 words)', words: 900 },
  { label: 'Long (1,400–1,600 words)', words: 1500 },
];
const FORMATS = ['How-To Guide', 'Listicle', 'Case Study', 'Opinion Piece', 'Product Review', 'News Commentary'];

function WordCounter({ text }) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const readTime = Math.max(1, Math.round(words / 238));
  return (
    <div className="flex gap-4 text-xs text-gray-500">
      <span><span className="text-white font-semibold">{words.toLocaleString()}</span> words</span>
      <span><span className="text-white font-semibold">{chars.toLocaleString()}</span> chars</span>
      <span><span className="text-white font-semibold">{readTime}</span> min read</span>
    </div>
  );
}

export default function BlogDashboard({ session }) {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('Professional');
  const [format, setFormat] = useState('How-To Guide');
  const [length, setLength] = useState(LENGTHS[1]);
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState('');
  const articleRef = useRef(null);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(''); setArticle(''); setTitle('');

    const prompt = `You are an expert content writer and SEO specialist. Write a complete, publication-ready blog post with the following specifications:

Topic: ${topic}
Format: ${format}
Tone: ${tone}
Target length: approximately ${length.words} words
${keywords ? `Target keywords to include naturally: ${keywords}` : ''}

Requirements:
- Start with an engaging H1 title (prefix with "# ")
- Use proper markdown: ## for H2 sections, ### for H3, **bold**, *italic*, bullet points
- Include an introduction that hooks the reader in the first sentence
- Write ${length.words} words (±10%) of substantive, original content
- Include a clear conclusion with a call-to-action
- Use the target keywords naturally (don't keyword-stuff)
- Make it genuinely useful and specific — avoid vague generalities
- End with a "## Key Takeaways" section with 3–5 bullet points

Write the full article now:`;

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2500,
        }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      const content = data.reply || '';
      // Extract title from first # line
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const extractedTitle = titleMatch ? titleMatch[1] : topic;
      const body = titleMatch ? content.replace(titleMatch[0], '').trim() : content;
      setTitle(extractedTitle);
      setArticle(body);
      setHistory(prev => [{ title: extractedTitle, topic, tone, ts: new Date().toLocaleTimeString(), content: body }, ...prev.slice(0, 9)]);
    } catch (e) {
      setError(e.message || 'Generation failed. Please try again.');
    }
    setLoading(false);
  };

  const copyText = (type) => {
    const full = `# ${title}\n\n${article}`;
    const html = `<h1>${title}</h1>\n${article.replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/^- (.+)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)}`;
    navigator.clipboard.writeText(type === 'html' ? html : full);
    setCopied(type); setTimeout(() => setCopied(''), 2000);
  };

  const download = (type) => {
    const full = `# ${title}\n\n${article}`;
    const ext = type === 'md' ? 'md' : 'txt';
    const blob = new Blob([full], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${ext}`; a.click();
  };

  // Simple markdown renderer
  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-white mt-6 mb-2">{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-white mt-4 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="text-gray-300 text-sm leading-relaxed ml-4 list-disc">{line.slice(2).replace(/\*\*(.+?)\*\*/g, '$1')}</li>;
      }
      if (!line.trim()) return <div key={i} className="h-3" />;
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/\*(.+?)\*/g, '<em class="text-gray-200">$1</em>');
      return <p key={i} className="text-gray-300 text-sm leading-relaxed mb-0" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-bold text-lg mb-1">Generate a Blog Article</h2>
        <p className="text-gray-400 text-sm mb-5">Full articles, ready to publish. Generates in ~30 seconds.</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Topic / Title *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="e.g. How AI is transforming small business operations"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Target Keywords (optional)</label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. AI tools, business automation, productivity"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50">
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50">
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Length</label>
            <select value={length.label} onChange={e => setLength(LENGTHS.find(l => l.label === e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50">
              {LENGTHS.map(l => <option key={l.label} value={l.label}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <button onClick={generate} disabled={loading || !topic.trim()}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Writing article…</> : '✍️ Generate Article'}
        </button>

        {error && <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
      </div>

      {/* Article output */}
      <AnimatePresence>
        {(article || loading) && (
          <motion.div key="article" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {/* Article toolbar */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                {title && <div className="text-white font-bold text-base truncate">{title}</div>}
                {article && <WordCounter text={article} />}
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyText('md')} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
                  {copied === 'md' ? '✅' : '📋'} Copy Markdown
                </button>
                <button onClick={() => copyText('html')} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
                  {copied === 'html' ? '✅' : '📋'} Copy HTML
                </button>
                <button onClick={() => download('md')} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">
                  ⬇️ Download
                </button>
              </div>
            </div>
            {/* Article body */}
            <div ref={articleRef} className="px-8 py-6 max-h-[600px] overflow-y-auto">
              {loading && !article && (
                <div className="flex items-center gap-3 text-gray-400">
                  <span className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  Writing your article — this takes about 30 seconds…
                </div>
              )}
              {article && renderMarkdown(article)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-white font-semibold text-sm">📚 Recent Articles (this session)</h3>
          </div>
          <div className="divide-y divide-white/5">
            {history.map((h, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{h.title}</div>
                  <div className="text-gray-500 text-xs">{h.tone} · {h.ts}</div>
                </div>
                <button onClick={() => { setTitle(h.title); setArticle(h.content); setTopic(h.topic); setTone(h.tone); }}
                  className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
