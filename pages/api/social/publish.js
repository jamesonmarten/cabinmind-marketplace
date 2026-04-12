/**
 * /api/social/publish
 *
 * Proxies social media post requests so platform tokens never appear in client
 * network traffic. Dispatches to up to 5 platforms concurrently.
 *
 * Body shape:
 * {
 *   platforms: { instagram: true, facebook: true, twitter: false, linkedin: true, tiktok: false }
 *   tokens:    { instagram: '...', facebook: '...', ... }         — user-supplied OAuth tokens
 *   caption:   string                                              — post text
 *   mediaType: 'none' | 'image' | 'video'
 *   mediaB64:  string | null                                       — base64 data URI
 *   mediaName: string | null
 *   // Instagram / Facebook extras
 *   igUserId:  string | null    — Instagram Business Account ID
 *   fbPageId:  string | null    — Facebook Page ID
 *   // LinkedIn extras
 *   liPersonUrn: string | null  — urn:li:person:<id>  OR  urn:li:organization:<id>
 *   // TikTok extras
 *   ttOpenId:  string | null    — TikTok open_id
 * }
 *
 * Returns:
 * { results: { instagram: {ok,id,error}, facebook: {...}, ... } }
 */

import { withProtection } from '../../../lib/rateLimit';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert base64 data URI to Buffer + mimeType */
function parseDataUri(dataUri) {
  if (!dataUri) return null;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

/** Safe fetch wrapper — returns { ok, data, status } */
async function safeFetch(url, opts) {
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(20000) });
    let data;
    const ct = r.headers.get('content-type') || '';
    try { data = ct.includes('json') ? await r.json() : await r.text(); } catch { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e.message };
  }
}

// ─── Platform publishers ──────────────────────────────────────────────────────

/**
 * Instagram — Meta Graph API
 * Flow:  1. Upload media container  2. Publish container
 * Docs:  https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */
async function publishInstagram({ token, igUserId, caption, mediaType, mediaB64 }) {
  if (!token)    return { ok: false, error: 'No Instagram access token' };
  if (!igUserId) return { ok: false, error: 'No Instagram Business Account ID' };

  try {
    if (mediaType === 'none' || !mediaB64) {
      // Text-only not supported — Instagram requires media. Post to story instead.
      return { ok: false, error: 'Instagram requires an image or video. Text-only posts are not supported.' };
    }

    // Step 1: Create media container
    const containerParams = new URLSearchParams({
      caption,
      access_token: token,
    });

    if (mediaType === 'image') {
      // For image, we need a publicly accessible URL. Since we only have base64,
      // we instruct the user to use image_url. Flag this limitation.
      return {
        ok: false,
        error: 'Instagram image posts require a public URL. Upload your image to a CDN or use the Instagram app directly. Video upload via API is supported on Creator accounts.',
        limitation: true,
      };
    }

    if (mediaType === 'video') {
      containerParams.set('media_type', 'REELS');
      containerParams.set('video_url', ''); // Would need CDN URL
      return {
        ok: false,
        error: 'Instagram video (Reels) posts require a public video URL. Upload to a CDN first.',
        limitation: true,
      };
    }

    return { ok: false, error: 'Unknown media type' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Facebook — Meta Graph API
 * Photos: POST /{page-id}/photos?url=...&message=...&access_token=...
 * Videos: POST /{page-id}/videos (multipart)
 * Text:   POST /{page-id}/feed?message=...&access_token=...
 * Docs:   https://developers.facebook.com/docs/pages/publishing
 */
async function publishFacebook({ token, fbPageId, caption, mediaType, mediaB64 }) {
  if (!token)    return { ok: false, error: 'No Facebook access token' };
  if (!fbPageId) return { ok: false, error: 'No Facebook Page ID' };

  const base = `https://graph.facebook.com/v19.0/${fbPageId}`;

  if (mediaType === 'none' || !mediaB64) {
    // Text-only post
    const r = await safeFetch(`${base}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: caption, access_token: token }),
    });
    if (!r.ok) return { ok: false, error: r.data?.error?.message || `HTTP ${r.status}` };
    return { ok: true, id: r.data?.id };
  }

  if (mediaType === 'image') {
    // Facebook accepts base64 inline via multipart
    const media = parseDataUri(mediaB64);
    if (!media) return { ok: false, error: 'Invalid image data' };

    const form = new FormData();
    form.append('message', caption);
    form.append('access_token', token);
    form.append('source', new Blob([media.buffer], { type: media.mimeType }), 'photo.jpg');

    const r = await safeFetch(`${base}/photos`, { method: 'POST', body: form });
    if (!r.ok) return { ok: false, error: r.data?.error?.message || `HTTP ${r.status}` };
    return { ok: true, id: r.data?.id };
  }

  if (mediaType === 'video') {
    const media = parseDataUri(mediaB64);
    if (!media) return { ok: false, error: 'Invalid video data' };

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

/**
 * X / Twitter — v2 API
 * Text:  POST /2/tweets
 * Image: Upload media first via v1.1/media/upload (chunked), then attach media_id
 * Docs:  https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
 */
async function publishTwitter({ token, caption, mediaType, mediaB64, mediaName }) {
  if (!token) return { ok: false, error: 'No X (Twitter) access token' };

  // Step 1: Upload media if present
  let mediaId = null;
  if ((mediaType === 'image' || mediaType === 'video') && mediaB64) {
    const media = parseDataUri(mediaB64);
    if (!media) return { ok: false, error: 'Invalid media data' };

    // INIT
    const initR = await safeFetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        command: 'INIT',
        total_bytes: String(media.buffer.length),
        media_type: media.mimeType,
        media_category: mediaType === 'video' ? 'tweet_video' : 'tweet_image',
      }),
    });
    if (!initR.ok) return { ok: false, error: initR.data?.error || `Media INIT failed: ${initR.status}` };
    mediaId = initR.data?.media_id_string;

    // APPEND (single chunk for simplicity — max 5MB)
    const appendForm = new FormData();
    appendForm.append('command', 'APPEND');
    appendForm.append('media_id', mediaId);
    appendForm.append('segment_index', '0');
    appendForm.append('media', new Blob([media.buffer], { type: media.mimeType }), mediaName || 'media');

    const appendR = await safeFetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: appendForm,
    });
    if (!appendR.ok) return { ok: false, error: appendR.data?.error || `Media APPEND failed: ${appendR.status}` };

    // FINALIZE
    const finalizeR = await safeFetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ command: 'FINALIZE', media_id: mediaId }),
    });
    if (!finalizeR.ok) return { ok: false, error: finalizeR.data?.error || `Media FINALIZE failed: ${finalizeR.status}` };
  }

  // Step 2: Post tweet
  const tweetBody = { text: caption.slice(0, 280) };
  if (mediaId) tweetBody.media = { media_ids: [mediaId] };

  const r = await safeFetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetBody),
  });
  if (!r.ok) return { ok: false, error: r.data?.detail || r.data?.error || `HTTP ${r.status}` };
  return { ok: true, id: r.data?.data?.id };
}

/**
 * LinkedIn — v2 UGC Posts API
 * Text + image: POST /v2/ugcPosts  with  specificContent.shareMediaCategory
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
 */
async function publishLinkedIn({ token, liPersonUrn, caption, mediaType, mediaB64 }) {
  if (!token)       return { ok: false, error: 'No LinkedIn access token' };
  if (!liPersonUrn) return { ok: false, error: 'No LinkedIn Person/Organization URN' };

  const author = liPersonUrn; // e.g. urn:li:person:abc123 or urn:li:organization:123

  // Register image upload if needed
  let assetUrn = null;
  if (mediaType === 'image' && mediaB64) {
    const media = parseDataUri(mediaB64);
    if (!media) return { ok: false, error: 'Invalid image data' };

    // 1. Register upload
    const regR = await safeFetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: author,
          serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
        },
      }),
    });
    if (!regR.ok) return { ok: false, error: regR.data?.message || `Register upload failed: ${regR.status}` };

    const uploadUrl  = regR.data?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
    assetUrn         = regR.data?.value?.asset;

    if (!uploadUrl) return { ok: false, error: 'LinkedIn did not return an upload URL' };

    // 2. PUT binary to upload URL
    const putR = await safeFetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': media.mimeType },
      body: media.buffer,
    });
    if (!putR.ok) return { ok: false, error: `Image upload failed: HTTP ${putR.status}` };
  }

  // Build UGC post body
  const shareMedia = assetUrn
    ? [{ status: 'READY', description: { text: '' }, media: assetUrn, title: { text: '' } }]
    : [];

  const postBody = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary:   { text: caption },
        shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE',
        ...(shareMedia.length ? { media: shareMedia } : {}),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const r = await safeFetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });
  if (!r.ok) return { ok: false, error: r.data?.message || `HTTP ${r.status}` };
  return { ok: true, id: r.data?.id };
}

/**
 * TikTok — Content Posting API v2
 * Requires VIDEO (no image-only posts via API)
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 */
async function publishTikTok({ token, ttOpenId, caption, mediaType, mediaB64 }) {
  if (!token)   return { ok: false, error: 'No TikTok access token' };
  if (!ttOpenId) return { ok: false, error: 'No TikTok open_id' };
  if (mediaType !== 'video' || !mediaB64) {
    return { ok: false, error: 'TikTok only supports video posts via API. Select a video file.' };
  }

  const media = parseDataUri(mediaB64);
  if (!media) return { ok: false, error: 'Invalid video data' };

  // Step 1: Init upload
  const initR = await safeFetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 150),
        privacy_level: 'MUTUAL_FOLLOW_FRIENDS',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: media.buffer.length,
        chunk_size: media.buffer.length,
        total_chunk_count: 1,
      },
    }),
  });
  if (!initR.ok) return { ok: false, error: initR.data?.error?.message || `Init failed: ${initR.status}` };

  const uploadUrl = initR.data?.data?.upload_url;
  const publishId = initR.data?.data?.publish_id;
  if (!uploadUrl) return { ok: false, error: 'TikTok did not return upload URL' };

  // Step 2: Upload video chunk
  const uploadR = await safeFetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Range': `bytes 0-${media.buffer.length - 1}/${media.buffer.length}`,
      'Content-Type': 'video/mp4',
    },
    body: media.buffer,
  });
  if (!uploadR.ok) return { ok: false, error: `Video upload failed: HTTP ${uploadR.status}` };

  return { ok: true, id: publishId };
}

// ─── Main handler ────────────────────────────────────────────────────────────

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

export default withProtection('social-publish', async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    platforms = {},
    tokens    = {},
    caption   = '',
    mediaType = 'none',
    mediaB64  = null,
    mediaName = null,
    igUserId  = null,
    fbPageId  = null,
    liPersonUrn = null,
    ttOpenId  = null,
  } = req.body || {};

  if (!caption.trim() && mediaType === 'none') {
    return res.status(400).json({ error: 'Caption or media is required' });
  }

  const args = { caption, mediaType, mediaB64, mediaName };
  const jobs = [];

  if (platforms.instagram) jobs.push(['instagram', publishInstagram({ ...args, token: tokens.instagram, igUserId })]);
  if (platforms.facebook)  jobs.push(['facebook',  publishFacebook({ ...args, token: tokens.facebook, fbPageId })]);
  if (platforms.twitter)   jobs.push(['twitter',   publishTwitter({ ...args, token: tokens.twitter })]);
  if (platforms.linkedin)  jobs.push(['linkedin',  publishLinkedIn({ ...args, token: tokens.linkedin, liPersonUrn })]);
  if (platforms.tiktok)    jobs.push(['tiktok',    publishTikTok({ ...args, token: tokens.tiktok, ttOpenId })]);

  if (!jobs.length) return res.status(400).json({ error: 'No platforms selected' });

  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const results = {};
  jobs.forEach(([name], i) => {
    const s = settled[i];
    results[name] = s.status === 'fulfilled'
      ? s.value
      : { ok: false, error: s.reason?.message || 'Unknown error' };
  });

  const anyOk = Object.values(results).some(r => r.ok);
  return res.status(anyOk ? 200 : 422).json({ results });
});
