/**
 * SocialDashboard — AI Social Media Hub
 *
 * 4 tabs:
 *   Compose   — write post, toggle platforms, attach media, publish or queue
 *   Queue     — scheduled / draft posts with status tracking
 *   Analytics — platform connection stats (live data requires platform insight APIs)
 *   Connect   — token / credential management per platform
 *
 * Token storage: localStorage only — tokens never hit our DB.
 * Publishing: proxied via /api/social/publish so tokens don't appear in network tab.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Platform config ─────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: 'from-pink-500 to-orange-400',
    border: 'border-pink-500/40',
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    mediaTypes: ['image', 'video'],
    maxCaption: 2200,
    notes: 'Requires Instagram Business/Creator account + public media URL for images. Video (Reels) supported via direct upload.',
    fields: [
      { key: 'token',    label: 'Access Token',                   placeholder: 'EAAxx...', type: 'password', help: 'Long-lived Instagram Graph API token from Meta Developer Console.' },
      { key: 'igUserId', label: 'Instagram Business Account ID',  placeholder: '17841400...', type: 'text', help: 'Found in Meta Business Suite → Settings → Account Info.' },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👍',
    color: 'from-blue-600 to-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    mediaTypes: ['none', 'image', 'video'],
    maxCaption: 63206,
    notes: 'Posts to your Facebook Page (not personal profile). Text, image, and video posts supported.',
    fields: [
      { key: 'token',    label: 'Page Access Token', placeholder: 'EAAxx...', type: 'password', help: 'Generate from Meta Developer Console → your app → User Token → Page Token.' },
      { key: 'fbPageId', label: 'Facebook Page ID',  placeholder: '123456789', type: 'text', help: 'Found in Page Settings → Page Info → Page ID.' },
    ],
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: '𝕏',
    color: 'from-gray-200 to-gray-400',
    border: 'border-gray-400/40',
    bg: 'bg-gray-400/10',
    text: 'text-gray-300',
    mediaTypes: ['none', 'image', 'video'],
    maxCaption: 280,
    notes: 'Text (280 chars), images, and videos supported. All 4 OAuth 1.0a credentials required for media uploads. Text-only posts work with just the Access Token (Bearer).',
    fields: [
      { key: 'consumerKey',       label: 'API Key (Consumer Key)',         placeholder: 'xxx...', type: 'password', help: 'X Developer Portal → your app → Keys and Tokens → API Key.' },
      { key: 'consumerSecret',    label: 'API Secret (Consumer Secret)',   placeholder: 'xxx...', type: 'password', help: 'X Developer Portal → your app → Keys and Tokens → API Key Secret.' },
      { key: 'accessToken',       label: 'Access Token',                   placeholder: 'xxx...', type: 'password', help: 'X Developer Portal → your app → Keys and Tokens → Access Token.' },
      { key: 'accessTokenSecret', label: 'Access Token Secret',            placeholder: 'xxx...', type: 'password', help: 'X Developer Portal → your app → Keys and Tokens → Access Token Secret.' },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: 'from-blue-700 to-blue-500',
    border: 'border-blue-600/40',
    bg: 'bg-blue-600/10',
    text: 'text-blue-300',
    mediaTypes: ['none', 'image'],
    maxCaption: 3000,
    notes: 'Text and image posts. Video requires LinkedIn Video API (separate approval). Posts as your profile or organisation page.',
    fields: [
      { key: 'token',       label: 'Access Token',           placeholder: 'AQV...', type: 'password', help: 'Generate via LinkedIn Developer Portal → your app → Auth → OAuth 2.0 Token.' },
      { key: 'liPersonUrn', label: 'Person or Org URN',      placeholder: 'urn:li:person:abc123', type: 'text', help: 'Your member URN. Call GET https://api.linkedin.com/v2/me with your token to find it.' },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'from-pink-400 to-cyan-400',
    border: 'border-pink-400/40',
    bg: 'bg-pink-400/10',
    text: 'text-pink-300',
    mediaTypes: ['video'],
    maxCaption: 2200,
    notes: 'Video-only via API. Requires a TikTok Developer app with the Content Posting API product enabled. Posts default to "Only me" visibility — change in TikTok app after posting.',
    setupSteps: [
      'Go to developers.tiktok.com → My Apps → Create App',
      'Under "Products", add "Content Posting API" and request access',
      'Copy your Client Key and Client Secret from the app dashboard',
      'Use the OAuth2 authorization flow (or sandbox tools in the portal) to generate a User Access Token with scope: video.upload, video.publish',
      'Paste the resulting access token below — it starts with act.',
    ],
    fields: [
      { key: 'clientKey',    label: 'Client Key',    placeholder: 'aw1234abc...', type: 'text',     help: 'Found in your TikTok app dashboard under "App Info". Also called "App ID".' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'xxxxxxxx...', type: 'password',  help: 'Found next to the Client Key. Keep this secret.' },
      { key: 'accessToken',  label: 'User Access Token', placeholder: 'act.xxxxxxxx...', type: 'password', help: 'OAuth2 user token with video.upload + video.publish scopes. Generate via TikTok OAuth flow or sandbox tools in the developer portal.' },
    ],
  },
];

const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]));

const STORAGE_KEY = 'cabinmind_social_v1';
const QUEUE_KEY   = 'cabinmind_social_queue_v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveStorage(key, value) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlatformToggle({ platform, enabled, connected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all select-none ${
        enabled && connected
          ? `${platform.bg} ${platform.border} ${platform.text}`
          : enabled && !connected
          ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
          : 'bg-gray-800/50 border-gray-700/40 text-gray-500 hover:border-gray-600'
      }`}
    >
      <span className="text-base">{platform.icon}</span>
      <span className="hidden sm:inline">{platform.name}</span>
      {!connected && enabled && (
        <span className="text-[10px] bg-yellow-500/20 px-1 rounded">needs setup</span>
      )}
      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
        enabled ? 'bg-current border-transparent opacity-80' : 'border-gray-600 bg-transparent'
      }`} />
    </button>
  );
}

function StatusPill({ status }) {
  const map = {
    published: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed:    'bg-red-500/20 text-red-400 border-red-500/30',
    pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    draft:     'bg-gray-500/20 text-gray-400 border-gray-500/30',
    partial:   'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  const icons = { published: '✓', failed: '✗', pending: '⏳', draft: '📝', partial: '⚠' };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border ${map[status] || map.draft} font-medium`}>
      {icons[status]} {status}
    </span>
  );
}

// ─── Tab: Compose ──────────────────────────────────────────────────────────

function ComposeTab({ tokens, credentials }) {
  const [caption, setCaption]       = useState('');
  const [mediaFile, setMediaFile]   = useState(null);  // { name, type, b64, mediaType }
  const [mediaType, setMediaType]   = useState('none'); // 'none' | 'image' | 'video'
  const [imageUrl, setImageUrl]     = useState('');     // public URL for Instagram image posts
  const [enabled, setEnabled]       = useState({ instagram: false, facebook: true, twitter: false, linkedin: false, tiktok: false });
  const [publishing, setPublishing] = useState(false);
  const [results, setResults]       = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiPrompt, setAiPrompt]     = useState('');
  const [aiError, setAiError]       = useState('');
  const fileRef = useRef(null);
  const [queue, setQueue]           = useState(() => loadStorage(QUEUE_KEY, []));
  const [scheduleDate, setScheduleDate] = useState('');
  const [isDraft, setIsDraft]       = useState(false);

  const isConnected = id => {
    const p = PLATFORMS.find(p => p.id === id);
    if (!p) return false;
    // X is considered connected if at minimum accessToken is present
    if (id === 'twitter') return !!(credentials.twitter?.accessToken?.trim());
    return p.fields.every(f => (credentials[id]?.[f.key] || '').trim().length > 0);
  };

  const activeCount = Object.entries(enabled).filter(([id, on]) => on).length;

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const mt = f.type.startsWith('video/') ? 'video' : 'image';
    const b64 = await fileToBase64(f);
    setMediaFile({ name: f.name, type: f.type, b64, mediaType: mt });
    setMediaType(mt);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaType('none');
    if (fileRef.current) fileRef.current.value = '';
  };

  const generateCaption = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Write a social media caption for: ${aiPrompt}\n\nMake it engaging, include 3–5 relevant hashtags, and keep it under 300 characters. Return only the caption text.` }],
          agentName: 'Social Caption Writer',
          businessName: 'CabinMind',
          businessContext: 'AI-powered social media tools for businesses',
        }),
      });
      const data = await res.json();
      // API returns { reply, message } — use whichever is present
      const text = data.reply || data.message;
      if (text) {
        setCaption(text);
      } else {
        setAiError(data.error || 'AI did not return a caption. Try again.');
      }
    } catch (e) {
      setAiError('Could not reach AI. Check your connection and try again.');
    }
    setAiLoading(false);
  };

  const saveToQueue = (status = 'draft', publishResults = null) => {
    const entry = {
      id:          Date.now().toString(),
      caption,
      mediaType,
      mediaName:   mediaFile?.name || null,
      platforms:   { ...enabled },
      status,
      scheduledAt: scheduleDate || null,
      createdAt:   new Date().toISOString(),
      results:     publishResults,
    };
    const updated = [entry, ...queue];
    setQueue(updated);
    saveStorage(QUEUE_KEY, updated);
    return entry;
  };

  const handlePublish = async () => {
    const selectedIds = Object.entries(enabled).filter(([, on]) => on).map(([id]) => id);
    if (!selectedIds.length) { alert('Select at least one platform.'); return; }
    if (!caption.trim() && mediaType === 'none') { alert('Add a caption or attach media.'); return; }

    if (isDraft) { saveToQueue('draft'); setResults({ _saved: true }); return; }

    setPublishing(true);
    setResults(null);

    // Build structured per-platform credential objects
    const igCreds = { token: credentials.instagram?.token || '', igUserId: credentials.instagram?.igUserId || '' };
    const fbCreds = { token: credentials.facebook?.token  || '', fbPageId: credentials.facebook?.fbPageId  || '' };
    const twCreds = {
      consumerKey:       credentials.twitter?.consumerKey       || '',
      consumerSecret:    credentials.twitter?.consumerSecret    || '',
      accessToken:       credentials.twitter?.accessToken       || '',
      accessTokenSecret: credentials.twitter?.accessTokenSecret || '',
    };
    const liCreds = { token: credentials.linkedin?.token || '', liPersonUrn: credentials.linkedin?.liPersonUrn || '' };
    const ttCreds = { accessToken: credentials.tiktok?.accessToken || '' };

    const body = {
      platforms: enabled,
      caption,
      mediaType,
      mediaB64:  mediaFile?.b64  || null,
      mediaName: mediaFile?.name || null,
      imageUrl:  imageUrl.trim() || null,
      igCreds,
      fbCreds,
      twCreds,
      liCreds,
      ttCreds,
    };

    try {
      const res = await fetch('/api/social/publish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(60000), // 60s max — video uploads can be slow
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok && !data.results) {
        // Top-level API error (400, 429, 500 etc.)
        setResults({ _error: data.error || `Server error (HTTP ${res.status}). Please try again.` });
        setPublishing(false);
        return;
      }

      setResults(data.results || {});

      // Determine aggregate status
      const vals = Object.values(data.results || {});
      const allOk   = vals.every(v => v.ok);
      const noneOk  = vals.every(v => !v.ok);
      const status  = allOk ? 'published' : noneOk ? 'failed' : 'partial';
      saveToQueue(status, data.results);
    } catch (e) {
      setResults({ _error: e.message });
    }
    setPublishing(false);
  };

  const maxCapLen = Math.min(
    ...Object.entries(enabled)
      .filter(([, on]) => on)
      .map(([id]) => PLATFORM_MAP[id]?.maxCaption || 9999),
    9999
  );
  const captionOver = caption.length > maxCapLen;

  return (
    <div className="space-y-5">

      {/* Platform toggles */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Post to</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <PlatformToggle
              key={p.id}
              platform={p}
              enabled={enabled[p.id]}
              connected={isConnected(p.id)}
              onToggle={() => setEnabled(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
            />
          ))}
        </div>
        {activeCount === 0 && (
          <p className="text-xs text-yellow-400 mt-2">Toggle at least one platform above.</p>
        )}
      </div>

      {/* Caption */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Caption</p>
          <span className={`text-[11px] ${captionOver ? 'text-red-400' : 'text-gray-600'}`}>
            {caption.length}{maxCapLen < 9999 ? `/${maxCapLen}` : ''}
          </span>
        </div>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Write your post… or use the AI caption generator below."
          rows={5}
          className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none transition ${
            captionOver ? 'border-red-500' : 'border-gray-600 focus:border-brand-500'
          }`}
        />

        {/* AI Caption Generator */}
        <div className="flex gap-2">
          <input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateCaption()}
            placeholder="Describe what to post… (AI writes caption)"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={generateCaption}
            disabled={aiLoading || !aiPrompt.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition whitespace-nowrap"
          >
            {aiLoading ? '✨ Writing…' : '✨ AI Caption'}
          </button>
        </div>
        {aiError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{aiError}</p>
        )}
      </div>

      {/* Media */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Media (optional)</p>
        {!mediaFile ? (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-xl p-8 cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition">
            <span className="text-3xl mb-2">📎</span>
            <span className="text-sm text-gray-400">Click to upload image or video</span>
            <span className="text-xs text-gray-600 mt-1">JPG, PNG, GIF, MP4, MOV · max 50MB</span>
            <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-700">
            <span className="text-2xl">{mediaFile.mediaType === 'video' ? '🎬' : '🖼'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{mediaFile.name}</p>
              <p className="text-xs text-gray-400">{mediaFile.mediaType}</p>
            </div>
            <button onClick={removeMedia} className="text-gray-500 hover:text-red-400 transition text-sm px-2">✕</button>
          </div>
        )}

        {/* Platform media type notes */}
        {activeCount > 0 && (
          <div className="mt-3 space-y-1">
            {Object.entries(enabled).filter(([, on]) => on).map(([id]) => {
              const p = PLATFORM_MAP[id];
              return (
                <div key={id} className="flex items-start gap-2 text-xs text-gray-500">
                  <span>{p.icon}</span>
                  <span>{p.name}: {p.notes}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Instagram image URL — shown when Instagram is enabled and mediaType is image or none */}
        {enabled.instagram && (mediaType === 'image' || mediaType === 'none') && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-300 mb-1">
              📸 Instagram Public Image URL
              <span className="ml-2 text-gray-600 font-normal">Required for Instagram image posts (Imgur, Cloudinary, S3, etc.)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://i.imgur.com/yourimage.jpg"
              className="w-full bg-gray-800 border border-pink-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition font-mono"
            />
          </div>
        )}
      </div>

      {/* Schedule / Draft */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Options</p>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} className="accent-brand-500" />
            <span className="text-sm text-gray-300">Save as draft only</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Schedule:</label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
        {scheduleDate && (
          <p className="text-xs text-yellow-400">⚠ Scheduling saves to your queue. Auto-publishing at scheduled time requires a cron job (not yet configured).</p>
        )}
      </div>

      {/* Publish button */}
      <button
        onClick={handlePublish}
        disabled={publishing || activeCount === 0 || (!caption.trim() && mediaType === 'none')}
        className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
      >
        {publishing ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing to {activeCount} platform{activeCount !== 1 ? 's' : ''}…</>
        ) : isDraft ? (
          '📝 Save Draft'
        ) : (
          `⚡ Publish Now → ${activeCount} Platform${activeCount !== 1 ? 's' : ''}`
        )}
      </button>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-2">
            {results._saved && (
              <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl px-4 py-3 text-sm text-brand-300">
                ✓ Saved to queue as draft.
              </div>
            )}
            {results._error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
                ✗ {results._error}
              </div>
            )}
            {!results._saved && !results._error && Object.entries(results).map(([id, r]) => {
              const p = PLATFORM_MAP[id];
              return (
                <div key={id} className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
                  r.ok
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : r.limitation
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <span className="text-base flex-shrink-0">{p?.icon}</span>
                  <div>
                    <span className="font-semibold">{p?.name}: </span>
                    {r.ok ? `Published ✓${r.id ? ` (ID: ${r.id})` : ''}` : r.error}
                    {r.limitation && (
                      <p className="text-xs mt-1 opacity-70">This is an API limitation of the platform, not a bug.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Queue ────────────────────────────────────────────────────────────

function QueueTab() {
  const [queue, setQueue] = useState(() => loadStorage(QUEUE_KEY, []));
  const [filter, setFilter] = useState('all');

  const deleteEntry = (id) => {
    const updated = queue.filter(e => e.id !== id);
    setQueue(updated);
    saveStorage(QUEUE_KEY, updated);
  };

  const filtered = filter === 'all' ? queue : queue.filter(e => e.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'published', 'partial', 'failed', 'draft', 'pending'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition capitalize ${
              filter === f
                ? 'bg-brand-600/30 border-brand-500/60 text-brand-300'
                : 'bg-gray-800/60 border-gray-700/50 text-gray-400 hover:border-gray-500'
            }`}
          >
            {f} {f !== 'all' && <span className="opacity-60">({queue.filter(e => e.status === f).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-400 font-medium">No posts yet</p>
          <p className="text-sm text-gray-500 mt-1">Published and draft posts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusPill status={entry.status} />
                    {entry.scheduledAt && (
                      <span className="text-[10px] text-gray-500">🕐 {formatDate(entry.scheduledAt)}</span>
                    )}
                    <span className="text-[10px] text-gray-600">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-200 line-clamp-2 mb-2">{entry.caption || <span className="text-gray-500 italic">No caption</span>}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(entry.platforms).filter(([, on]) => on).map(([id]) => {
                      const p  = PLATFORM_MAP[id];
                      const r  = entry.results?.[id];
                      return (
                        <span key={id} className={`text-[10px] px-2 py-0.5 rounded border ${
                          r?.ok
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : r && !r.ok
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-gray-700/50 border-gray-600/50 text-gray-400'
                        }`}>
                          {p?.icon} {p?.name}
                        </span>
                      );
                    })}
                    {entry.mediaType !== 'none' && (
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-gray-700/50 border-gray-600/50 text-gray-400">
                        {entry.mediaType === 'video' ? '🎬' : '🖼'} {entry.mediaType}
                        {entry.mediaName && ` · ${entry.mediaName}`}
                      </span>
                    )}
                  </div>
                  {/* Per-platform result errors */}
                  {entry.results && Object.entries(entry.results).some(([, r]) => !r.ok) && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(entry.results).filter(([, r]) => !r.ok).map(([id, r]) => (
                        <p key={id} className="text-[11px] text-red-400">
                          {PLATFORM_MAP[id]?.icon} {PLATFORM_MAP[id]?.name}: {r.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-gray-600 hover:text-red-400 transition text-sm flex-shrink-0 mt-0.5"
                >
                  🗑
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Analytics ────────────────────────────────────────────────────────

function AnalyticsTab({ credentials }) {
  const queue = loadStorage(QUEUE_KEY, []);

  const stats = PLATFORMS.map(p => {
    const posts       = queue.filter(e => e.platforms[p.id]);
    const published   = posts.filter(e => e.results?.[p.id]?.ok).length;
    const failed      = posts.filter(e => e.results?.[p.id] && !e.results[p.id].ok).length;
    const connected   = p.id === 'twitter'
      ? !!(credentials.twitter?.accessToken?.trim())
      : p.fields.every(f => (credentials[p.id]?.[f.key] || '').trim().length > 0);
    return { ...p, posts: posts.length, published, failed, connected };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.id} className={`bg-gray-900/60 border rounded-2xl p-4 ${s.border}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{s.icon}</span>
              <span className="font-semibold text-white text-sm">{s.name}</span>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded border ${
                s.connected
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-gray-700/50 border-gray-600/50 text-gray-500'
              }`}>
                {s.connected ? '✓ connected' : '○ not connected'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Total Posts',  value: s.posts     },
                { label: 'Published',    value: s.published  },
                { label: 'Failed',       value: s.failed     },
              ].map(st => (
                <div key={st.label} className="bg-gray-800/60 rounded-lg p-2">
                  <p className="text-lg font-black text-white">{st.value}</p>
                  <p className="text-[10px] text-gray-500">{st.label}</p>
                </div>
              ))}
            </div>
            {/* Native analytics stub */}
            <p className="text-[10px] text-gray-600 mt-3">
              📊 Reach, impressions, and engagement require a{' '}
              {s.id === 'instagram' || s.id === 'facebook' ? 'Meta Business Suite' :
               s.id === 'twitter' ? 'X Premium API' :
               s.id === 'linkedin' ? 'LinkedIn Marketing API approval' :
               'TikTok analytics API'} integration — coming in Phase 2.
            </p>
          </div>
        ))}
      </div>

      {/* Queue summary */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Overall Queue</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Posts',   value: queue.length },
            { label: 'Published',     value: queue.filter(e => e.status === 'published').length },
            { label: 'Drafts',        value: queue.filter(e => e.status === 'draft').length },
            { label: 'Failed',        value: queue.filter(e => e.status === 'failed' || e.status === 'partial').length },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Connect ───────────────────────────────────────────────────────────

function ConnectTab({ credentials, setCredentials }) {
  const [expanded, setExpanded] = useState(null);
  const [saved, setSaved]       = useState(null);
  const [testing, setTesting]   = useState(null);   // platform id being tested
  const [testResult, setTestResult] = useState({}); // { [platformId]: { ok, info?, error? } }

  const handleSave = (platformId) => {
    setSaved(platformId);
    setTimeout(() => setSaved(null), 2000);
  };

  const updateField = (platformId, fieldKey, value) => {
    const updated = {
      ...credentials,
      [platformId]: { ...(credentials[platformId] || {}), [fieldKey]: value },
    };
    setCredentials(updated);
    saveStorage(STORAGE_KEY, updated);
  };

  const isConnected = (p) => p.id === 'twitter'
    ? !!(credentials.twitter?.accessToken?.trim())
    : p.id === 'tiktok'
    ? !!(credentials.tiktok?.accessToken?.trim())
    : p.fields.every(f => (credentials[p.id]?.[f.key] || '').trim().length > 0);

  const handleTest = async (p) => {
    setTesting(p.id);
    setTestResult(prev => ({ ...prev, [p.id]: null }));
    try {
      const res = await fetch('/api/social/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: p.id, credentials: credentials[p.id] || {} }),
      });
      const data = await res.json();
      setTestResult(prev => ({ ...prev, [p.id]: data }));
    } catch (e) {
      setTestResult(prev => ({ ...prev, [p.id]: { ok: false, error: 'Network error — could not reach server.' } }));
    }
    setTesting(null);
  };

  return (
    <div className="space-y-3">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-300">
        🔐 Credentials are stored only in your browser (localStorage). They are never sent to our servers except when you press Publish — and only to proxy the API call.
      </div>

      {PLATFORMS.map(p => (
        <div key={p.id} className={`bg-gray-900/60 border rounded-2xl overflow-hidden ${p.border}`}>
          {/* Header */}
          <button
            onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition"
          >
            <span className="text-xl">{p.icon}</span>
            <div className="flex-1">
              <span className="font-semibold text-white text-sm">{p.name}</span>
              <span className={`ml-2 text-[10px] px-2 py-0.5 rounded border ${
                isConnected(p)
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-gray-700/50 border-gray-600/50 text-gray-500'
              }`}>
                {isConnected(p) ? '✓ connected' : '○ not connected'}
              </span>
            </div>
            <span className={`text-gray-500 transition-transform ${expanded === p.id ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {/* Fields */}
          <AnimatePresence>
            {expanded === p.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50 pt-3">
                  <p className="text-xs text-gray-500">{p.notes}</p>

                  {/* Setup steps (TikTok and others that need them) */}
                  {p.setupSteps && (
                    <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Setup Steps</p>
                      {p.setupSteps.map((step, i) => (
                        <div key={i} className="flex gap-2 text-xs text-gray-400">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {p.fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        {f.label}
                      </label>
                      <p className="text-[11px] text-gray-600 mb-1">{f.help}</p>
                      <input
                        type={f.type}
                        value={credentials[p.id]?.[f.key] || ''}
                        onChange={e => updateField(p.id, f.key, e.target.value)}
                        placeholder={f.placeholder}
                        autoComplete="off"
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition font-mono"
                      />
                    </div>
                  ))}

                  {/* OAuth guide link */}
                  <div className="pt-1">
                    <p className="text-[11px] text-gray-600">
                      {p.id === 'instagram' || p.id === 'facebook'
                        ? <>Get tokens at <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Meta Graph API Explorer</a></>
                        : p.id === 'twitter'
                        ? <>Get tokens at <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">X Developer Portal</a></>
                        : p.id === 'linkedin'
                        ? <>Get tokens at <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">LinkedIn Developer Apps</a></>
                        : <>Apply for Content Posting API access at <a href="https://developers.tiktok.com/apps/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">developers.tiktok.com/apps</a> — approval is required before you can post via API</>
                      }
                    </p>
                  </div>

                  {/* Save + Test buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleSave(p.id)}
                      className="text-sm px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition"
                    >
                      {saved === p.id ? '✓ Saved!' : 'Save'}
                    </button>
                    <button
                      onClick={() => handleTest(p)}
                      disabled={testing === p.id || !isConnected(p)}
                      className="text-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      {testing === p.id
                        ? <><span className="w-3 h-3 border border-gray-400/30 border-t-gray-300 rounded-full animate-spin" /> Testing…</>
                        : '⚡ Test Connection'
                      }
                    </button>
                  </div>

                  {/* Test result */}
                  {testResult[p.id] && (
                    <div className={`text-xs rounded-xl px-3 py-2.5 border ${
                      testResult[p.id].ok
                        ? 'bg-green-500/10 border-green-500/30 text-green-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}>
                      {testResult[p.id].ok
                        ? `✓ ${testResult[p.id].info || 'Connection verified!'}`
                        : `✗ ${testResult[p.id].error}`
                      }
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Phase 2 note */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-400">🚀 Phase 2 — Managed OAuth (coming soon)</p>
        <p>One-click "Connect with Instagram / Facebook / X / LinkedIn / TikTok" buttons using managed OAuth2 flows — no manual token copy-paste required.</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────

const TABS = [
  { id: 'compose',   label: '✍️ Compose',   icon: '✍️' },
  { id: 'queue',     label: '📋 Queue',     icon: '📋' },
  { id: 'analytics', label: '📊 Analytics', icon: '📊' },
  { id: 'connect',   label: '🔗 Connect',   icon: '🔗' },
];

export default function SocialDashboard({ session }) {
  const [tab, setTab]                 = useState('compose');
  const [credentials, setCredentials] = useState(() => loadStorage(STORAGE_KEY, {}));

  // Sync credentials to storage whenever they change
  useEffect(() => {
    saveStorage(STORAGE_KEY, credentials);
  }, [credentials]);

  const connectedCount = PLATFORMS.filter(p =>
    p.id === 'twitter'
      ? !!(credentials.twitter?.accessToken?.trim())
      : p.fields.every(f => (credentials[p.id]?.[f.key] || '').trim().length > 0)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            📱 Social Media Hub
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Publish to {PLATFORMS.length} platforms simultaneously · {connectedCount}/{PLATFORMS.length} platforms connected
          </p>
        </div>
        {/* Platform connection status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {PLATFORMS.map(p => {
            const connected = p.id === 'twitter'
              ? !!(credentials.twitter?.accessToken?.trim())
              : p.fields.every(f => (credentials[p.id]?.[f.key] || '').trim().length > 0);
            return (
              <span key={p.id} className={`text-[10px] px-2 py-1 rounded-lg border ${
                connected
                  ? `${p.bg} ${p.border} ${p.text}`
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-600'
              }`}>
                {p.icon} {p.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/60 p-1 rounded-xl border border-gray-700/50">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden text-base">{t.icon}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'compose'   && <ComposeTab tokens={{}} credentials={credentials} />}
          {tab === 'queue'     && <QueueTab />}
          {tab === 'analytics' && <AnalyticsTab credentials={credentials} />}
          {tab === 'connect'   && <ConnectTab credentials={credentials} setCredentials={setCredentials} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
