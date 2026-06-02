/**
 * /api/social/test
 *
 * Lightweight credential verification endpoint.
 * Calls the cheapest read-only endpoint for each platform to confirm
 * the token is valid — no posts are made.
 *
 * Body: { platform: 'facebook'|'instagram'|'twitter'|'linkedin'|'tiktok', credentials: {...} }
 * Returns: { ok: true, info: '...' } | { ok: false, error: '...' }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { platform, credentials = {} } = req.body || {};

  if (!platform) return res.status(400).json({ error: 'platform is required' });

  try {
    const result = await testPlatform(platform, credentials);
    return res.status(result.ok ? 200 : 401).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

async function safeFetch(url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(10000) });
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('json') ? await r.json().catch(() => null) : await r.text().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null, networkError: e.message };
  }
}

async function testPlatform(platform, creds) {
  switch (platform) {

    case 'facebook': {
      const { token, fbPageId } = creds;
      if (!token)    return { ok: false, error: 'Page Access Token is required' };
      if (!fbPageId) return { ok: false, error: 'Facebook Page ID is required' };
      // GET /me?fields=id,name
      const r = await safeFetch(
        `https://graph.facebook.com/v19.0/${fbPageId}?fields=id,name,fan_count&access_token=${encodeURIComponent(token)}`
      );
      if (!r.ok) {
        const msg = r.data?.error?.message || `HTTP ${r.status}`;
        return { ok: false, error: msg };
      }
      return { ok: true, info: `Connected: ${r.data?.name || r.data?.id} (${r.data?.fan_count?.toLocaleString() ?? '?'} followers)` };
    }

    case 'instagram': {
      const { token, igUserId } = creds;
      if (!token)    return { ok: false, error: 'Access Token is required' };
      if (!igUserId) return { ok: false, error: 'Instagram Business Account ID is required' };
      const r = await safeFetch(
        `https://graph.facebook.com/v19.0/${igUserId}?fields=id,name,username,followers_count&access_token=${encodeURIComponent(token)}`
      );
      if (!r.ok) {
        const msg = r.data?.error?.message || `HTTP ${r.status}`;
        return { ok: false, error: msg };
      }
      return { ok: true, info: `Connected: @${r.data?.username || r.data?.id} (${r.data?.followers_count?.toLocaleString() ?? '?'} followers)` };
    }

    case 'twitter': {
      const { accessToken, accessTokenSecret, consumerKey, consumerSecret } = creds;
      if (!accessToken) return { ok: false, error: 'Access Token is required' };

      // If OAuth1 creds present, use /1.1/account/verify_credentials
      // Otherwise use OAuth2 bearer → /2/users/me
      if (consumerKey && consumerSecret && accessTokenSecret) {
        const { buildOAuth1Header } = await import('../../../lib/oauth1.js');
        const url = 'https://api.twitter.com/1.1/account/verify_credentials.json';
        const auth = buildOAuth1Header({
          method: 'GET', url, bodyParams: {},
          consumerKey, consumerSecret, accessToken, accessTokenSecret,
        });
        const r = await safeFetch(url, { headers: { Authorization: auth } });
        if (!r.ok) return { ok: false, error: r.data?.errors?.[0]?.message || `HTTP ${r.status}` };
        return { ok: true, info: `Connected: @${r.data?.screen_name} (${r.data?.followers_count?.toLocaleString() ?? '?'} followers)` };
      } else {
        // OAuth2 user access token — GET /2/users/me
        const r = await safeFetch('https://api.twitter.com/2/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!r.ok) return { ok: false, error: r.data?.detail || r.data?.title || `HTTP ${r.status}` };
        return { ok: true, info: `Connected: @${r.data?.data?.username || r.data?.data?.id}` };
      }
    }

    case 'linkedin': {
      const { token } = creds;
      if (!token) return { ok: false, error: 'Access Token is required' };
      // GET /v2/userinfo (OpenID Connect — works on all LinkedIn apps)
      const r = await safeFetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        // Fallback: GET /v2/me
        const r2 = await safeFetch('https://api.linkedin.com/v2/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r2.ok) return { ok: false, error: r2.data?.message || `HTTP ${r2.status}` };
        const name = [r2.data?.localizedFirstName, r2.data?.localizedLastName].filter(Boolean).join(' ');
        return { ok: true, info: `Connected: ${name || r2.data?.id}` };
      }
      return { ok: true, info: `Connected: ${r.data?.name || r.data?.sub}` };
    }

    case 'tiktok': {
      const { accessToken } = creds;
      if (!accessToken) return { ok: false, error: 'Access Token is required' };
      // GET /v2/user/info/
      const r = await safeFetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!r.ok) return { ok: false, error: r.data?.error?.message || `HTTP ${r.status}` };
      const user = r.data?.data?.user;
      return { ok: true, info: `Connected: ${user?.display_name || user?.open_id || 'TikTok account'}` };
    }

    default:
      return { ok: false, error: `Unknown platform: ${platform}` };
  }
}
