/**
 * /api/social/publish — v2
 *
 * Per-platform auth:
 *  Instagram  — token + igUserId (image needs public URL; video bytes OK)
 *  Facebook   — Page token + pageId (text/image/video)
 *  X/Twitter  — OAuth1 (all 4 keys) for media; Bearer token for text-only
 *  LinkedIn   — Bearer token + liPersonUrn (/rest/posts API)
 *  TikTok     — accessToken (video only, SELF_ONLY privacy by default)
 */

import { buildOAuth1Header } from '../../../lib/oauth1';

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

function parseDataUri(dataUri) {
  if (!dataUri) return null;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function safeFetch(url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
    const ct = r.headers.get('content-type') || '';
    let data = null;
    try { data = ct.includes('json') ? await r.json() : await r.text(); } catch { /**/ }
    return { ok: r.ok, status: r.status, data, headers: r.headers };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e.message };
  }
}

// ── Instagram ──────────────────────────────────────────────────────────────────

async function publishInstagram({ token, igUserId, caption, mediaType, mediaB64, imageUrl }) {
  if (!token)    return { ok: false, error: 'No Instagram access token provided.' };
  if (!igUserId) return { ok: false, error: 'No Instagram Business Account ID provided.' };
  const base = `https://graph.facebook.com/v19.0/${igUserId}`;

  if (mediaType === 'image') {
    const url = imageUrl?.trim();
    if (!url) return { ok: false, limitation: true, error: 'Instagram image posts require a public image URL (e.g. Imgur, Cloudinary, S3). Paste it in the Public Image URL field.' };
    const cR = await safeFetch(`${base}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: url, caption, access_token: token }) });
    if (!cR.ok) return { ok: false, error: cR.data?.error?.message || `Container failed: HTTP ${cR.status}` };
    const cid = cR.data?.id;
    if (!cid) return { ok: false, error: 'Instagram did not return a container ID' };
    const pR = await safeFetch(`${base}/media_publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: cid, access_token: token }) });
    if (!pR.ok) return { ok: false, error: pR.data?.error?.message || `Publish failed: HTTP ${pR.status}` };
    return { ok: true, id: pR.data?.id };
  }

  if (mediaType === 'video') {
    const media = parseDataUri(mediaB64);
    if (!media) return { ok: false, error: 'Invalid video data' };
    const iR = await safeFetch(`${base}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ media_type: 'REELS', upload_type: 'resumable', caption, access_token: token }) });
    if (!iR.ok) return { ok: false, error: iR.data?.error?.message || `Init failed: HTTP ${iR.status}` };
    const cid = iR.data?.id;
    const uploadUrl = iR.data?.uri;
    if (!cid) return { ok: false, error: 'Instagram did not return a container ID for video' };
    if (uploadUrl) {
      const uR = await safeFetch(uploadUrl, { method: 'POST', headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(media.buffer.length), 'Content-Type': media.mimeType }, body: media.buffer });
      if (!uR.ok) return { ok: false, error: `Video upload failed: HTTP ${uR.status}` };
    }
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const sR = await safeFetch(`https://graph.facebook.com/v19.0/${cid}?fields=status_code&access_token=${token}`);
      if (sR.data?.status_code === 'FINISHED') break;
      if (sR.data?.status_code === 'ERROR') return { ok: false, error: 'Instagram video processing failed' };
      if (i === 9) return { ok: false, error: 'Instagram video timed out — check your account, it may still complete.' };
    }
    const pR = await safeFetch(`${base}/media_publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: cid, access_token: token }) });
    if (!pR.ok) return { ok: false, error: pR.data?.error?.message || `Publish failed: HTTP ${pR.status}` };
    return { ok: true, id: pR.data?.id };
  }

  return { ok: false, limitation: true, error: 'Instagram requires an image URL or video file. Text-only is not supported.' };
}

// ── Facebook ───────────────────────────────────────────────────────────────────

async function publishFacebook({ token, fbPageId, caption, mediaType, mediaB64 }) {
  if (!token)    return { ok: false, error: 'No Facebook Page Access Token provided.' };
  if (!fbPageId) return { ok: false, error: 'No Facebook Page ID provided.' };
  const base = `https://graph.facebook.com/v19.0/${fbPageId}`;

  if (mediaType === 'none' || !mediaB64) {
    const r = await safeFetch(`${base}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: caption, access_token: token }) });
    if (!r.ok) return { ok: false, error: r.data?.error?.message || `HTTP ${r.status}` };
    return { ok: true, id: r.data?.id };
  }

  const media = parseDataUri(mediaB64);
  if (!media) return { ok: false, error: 'Invalid media data' };

  if (mediaType === 'image') {
    const form = new FormData();
    form.append('message', caption);
    form.append('access_token', token);
    form.append('source', new Blob([media.buffer], { type: media.mimeType }), 'photo.jpg');
    const r = await safeFetch(`${base}/photos`, { method: 'POST', body: form });
    if (!r.ok) return { ok: false, error: r.data?.error?.message || `HTTP ${r.status}` };
    return { ok: true, id: r.data?.id };
  }

  if (mediaType === 'video') {
    const form = new FormData();
    form.append('description', caption);
    form.append('access_token', token);
    form.append('source', new Blob([media.buffer], { type: media.mimeType }), 'video.mp4');
    const r = await safeFetch(`${base}/videos`, { method: 'POST', body: form });
    if (!r.ok) return { ok: false, error: r.data?.error?.message || `HTTP ${r.status}` };
    return { ok: true, id: r.data?.id };
  }

  return { ok: false, error: 'Unknown media type' };
}

// ── X / Twitter ────────────────────────────────────────────────────────────────

async function publishTwitter({ consumerKey, consumerSecret, accessToken, accessTokenSecret, caption, mediaType, mediaB64, mediaName }) {
  if (!accessToken) return { ok: false, error: 'No X (Twitter) Access Token provided.' };
  const hasOAuth1 = !!(consumerKey && consumerSecret && accessTokenSecret);
  const uploadBase = 'https://upload.twitter.com/1.1/media/upload.json';

  let mediaId = null;
  if ((mediaType === 'image' || mediaType === 'video') && mediaB64) {
    if (!hasOAuth1) return { ok: false, error: 'X media upload requires all 4 OAuth 1.0a credentials. Text-only posts work with just the Access Token.' };
    const media = parseDataUri(mediaB64);
    if (!media) return { ok: false, error: 'Invalid media data' };

    const initP = { command: 'INIT', total_bytes: String(media.buffer.length), media_type: media.mimeType, media_category: mediaType === 'video' ? 'tweet_video' : 'tweet_image' };
    const iR = await safeFetch(uploadBase, { method: 'POST', headers: { Authorization: buildOAuth1Header({ method: 'POST', url: uploadBase, bodyParams: initP, consumerKey, consumerSecret, accessToken, accessTokenSecret }), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(initP) });
    if (!iR.ok) return { ok: false, error: iR.data?.errors?.[0]?.message || `Media INIT failed: HTTP ${iR.status}` };
    mediaId = iR.data?.media_id_string;

    const aForm = new FormData();
    aForm.append('command', 'APPEND'); aForm.append('media_id', mediaId); aForm.append('segment_index', '0');
    aForm.append('media', new Blob([media.buffer], { type: media.mimeType }), mediaName || 'upload');
    const aR = await safeFetch(uploadBase, { method: 'POST', headers: { Authorization: buildOAuth1Header({ method: 'POST', url: uploadBase, bodyParams: {}, consumerKey, consumerSecret, accessToken, accessTokenSecret }) }, body: aForm });
    if (!aR.ok && aR.status !== 204) return { ok: false, error: aR.data?.errors?.[0]?.message || `Media APPEND failed: HTTP ${aR.status}` };

    const finP = { command: 'FINALIZE', media_id: mediaId };
    const fR = await safeFetch(uploadBase, { method: 'POST', headers: { Authorization: buildOAuth1Header({ method: 'POST', url: uploadBase, bodyParams: finP, consumerKey, consumerSecret, accessToken, accessTokenSecret }), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(finP) });
    if (!fR.ok) return { ok: false, error: fR.data?.errors?.[0]?.message || `Media FINALIZE failed: HTTP ${fR.status}` };

    if (mediaType === 'video') {
      let info = fR.data?.processing_info;
      while (info?.state === 'pending' || info?.state === 'in_progress') {
        await new Promise(r => setTimeout(r, (info.check_after_secs || 3) * 1000));
        const sR = await safeFetch(`${uploadBase}?command=STATUS&media_id=${mediaId}`, { headers: { Authorization: buildOAuth1Header({ method: 'GET', url: uploadBase, bodyParams: { command: 'STATUS', media_id: mediaId }, consumerKey, consumerSecret, accessToken, accessTokenSecret }) } });
        info = sR.data?.processing_info;
        if (info?.state === 'failed') return { ok: false, error: 'X video processing failed' };
      }
    }
  }

  const tweetUrl = 'https://api.twitter.com/2/tweets';
  const tweetBody = { text: caption.slice(0, 280) };
  if (mediaId) tweetBody.media = { media_ids: [mediaId] };
  const auth = hasOAuth1 ? buildOAuth1Header({ method: 'POST', url: tweetUrl, bodyParams: {}, consumerKey, consumerSecret, accessToken, accessTokenSecret }) : `Bearer ${accessToken}`;
  const tR = await safeFetch(tweetUrl, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(tweetBody) });
  if (!tR.ok) return { ok: false, error: tR.data?.detail || tR.data?.errors?.[0]?.message || `HTTP ${tR.status}` };
  return { ok: true, id: tR.data?.data?.id };
}

// ── LinkedIn (/rest/posts — new API) ─────────────────────────────────────────

async function publishLinkedIn({ token, liPersonUrn, caption, mediaType, mediaB64 }) {
  if (!token)       return { ok: false, error: 'No LinkedIn Access Token provided.' };
  if (!liPersonUrn) return { ok: false, error: 'No LinkedIn Person/Organization URN provided.' };
  const author  = liPersonUrn.trim();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': '202401' };

  let imageAsset = null;
  if (mediaType === 'image' && mediaB64) {
    const media = parseDataUri(mediaB64);
    if (!media) return { ok: false, error: 'Invalid image data' };
    const iR = await safeFetch('https://api.linkedin.com/rest/images?action=initializeUpload', { method: 'POST', headers, body: JSON.stringify({ initializeUploadRequest: { owner: author } }) });
    if (!iR.ok) return { ok: false, error: iR.data?.message || `LinkedIn image init failed: HTTP ${iR.status}` };
    const uploadUrl = iR.data?.value?.uploadUrl;
    imageAsset      = iR.data?.value?.image;
    if (!uploadUrl) return { ok: false, error: 'LinkedIn did not return an upload URL' };
    const pR = await safeFetch(uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': media.mimeType }, body: media.buffer });
    if (pR.status >= 300) return { ok: false, error: `LinkedIn image upload failed: HTTP ${pR.status}` };
  }

  const body = { author, commentary: caption, visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false };
  if (imageAsset) body.content = { media: { altText: caption.slice(0, 200), id: imageAsset } };

  const r = await safeFetch('https://api.linkedin.com/rest/posts', { method: 'POST', headers, body: JSON.stringify(body) });
  if (r.status === 201) return { ok: true, id: r.headers?.get?.('x-restli-id') || 'created' };
  if (!r.ok) return { ok: false, error: r.data?.message || `HTTP ${r.status}` };
  return { ok: true, id: r.headers?.get?.('x-restli-id') || 'posted' };
}

// ── TikTok ─────────────────────────────────────────────────────────────────────

async function publishTikTok({ accessToken, caption, mediaType, mediaB64 }) {
  if (!accessToken) return { ok: false, error: 'No TikTok Access Token provided.' };
  if (mediaType !== 'video' || !mediaB64) return { ok: false, limitation: true, error: 'TikTok only supports video posts via their API. Select a video file (MP4/MOV).' };
  const media = parseDataUri(mediaB64);
  if (!media) return { ok: false, error: 'Invalid video data' };

  const iR = await safeFetch('https://open.tiktokapis.com/v2/post/publish/video/init/', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify({ post_info: { title: caption.slice(0, 2200), privacy_level: 'SELF_ONLY', disable_duet: false, disable_comment: false, disable_stitch: false, video_cover_timestamp_ms: 1000 }, source_info: { source: 'FILE_UPLOAD', video_size: media.buffer.length, chunk_size: media.buffer.length, total_chunk_count: 1 } }) });
  if (!iR.ok) return { ok: false, error: iR.data?.error?.message || `TikTok init failed: HTTP ${iR.status}` };

  const uploadUrl = iR.data?.data?.upload_url;
  const publishId = iR.data?.data?.publish_id;
  if (!uploadUrl) return { ok: false, error: 'TikTok did not return an upload URL. Ensure your token has content.post.write scope.' };

  const uR = await safeFetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes 0-${media.buffer.length - 1}/${media.buffer.length}`, 'Content-Type': 'video/mp4' }, body: media.buffer });
  if (!uR.ok && uR.status !== 206) return { ok: false, error: `TikTok video upload failed: HTTP ${uR.status}` };

  return { ok: true, id: publishId, note: 'Posted as "Only me" — change visibility in TikTok app.' };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { platforms = {}, caption = '', mediaType = 'none', mediaB64 = null, mediaName = null, imageUrl = null, igCreds = {}, fbCreds = {}, twCreds = {}, liCreds = {}, ttCreds = {} } = req.body || {};
  if (!caption.trim() && mediaType === 'none') return res.status(400).json({ error: 'Caption or media is required' });

  const args = { caption, mediaType, mediaB64, mediaName, imageUrl };
  const jobs = [];
  if (platforms.instagram) jobs.push(['instagram', publishInstagram({ ...args, token: igCreds.token, igUserId: igCreds.igUserId })]);
  if (platforms.facebook)  jobs.push(['facebook',  publishFacebook({ ...args, token: fbCreds.token, fbPageId: fbCreds.fbPageId })]);
  if (platforms.twitter)   jobs.push(['twitter',   publishTwitter({ ...args, ...twCreds })]);
  if (platforms.linkedin)  jobs.push(['linkedin',  publishLinkedIn({ ...args, token: liCreds.token, liPersonUrn: liCreds.liPersonUrn })]);
  if (platforms.tiktok)    jobs.push(['tiktok',    publishTikTok({ ...args, accessToken: ttCreds.accessToken })]);
  if (!jobs.length) return res.status(400).json({ error: 'No platforms selected' });

  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const results = {};
  jobs.forEach(([name], i) => {
    const s = settled[i];
    results[name] = s.status === 'fulfilled' ? s.value : { ok: false, error: s.reason?.message || 'Unknown error' };
  });
  return res.status(Object.values(results).some(r => r.ok) ? 200 : 422).json({ results });
}
