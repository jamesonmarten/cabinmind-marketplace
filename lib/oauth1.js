/**
 * lib/oauth1.js
 *
 * Minimal OAuth 1.0a request signer for X (Twitter) API v1.1
 * Used for media upload (v1.1/media/upload) which does not support OAuth2.
 *
 * References:
 *  https://developer.twitter.com/en/docs/authentication/oauth-1-0a/authorizing-a-request
 */

import crypto from 'crypto';

function percentEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g, '%21').replace(/'/g, '%27')
    .replace(/\(/g, '%28').replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * Build an OAuth 1.0a Authorization header for a given request.
 *
 * @param {object} params
 * @param {string} params.method          - HTTP method (uppercase)
 * @param {string} params.url             - Full URL (without query string for POST)
 * @param {object} params.bodyParams      - x-www-form-urlencoded body params (for signature base)
 * @param {string} params.consumerKey
 * @param {string} params.consumerSecret
 * @param {string} params.accessToken
 * @param {string} params.accessTokenSecret
 * @returns {string} Authorization header value
 */
export function buildOAuth1Header({ method, url, bodyParams = {}, consumerKey, consumerSecret, accessToken, accessTokenSecret }) {
  const nonce    = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams = {
    oauth_consumer_key:     consumerKey,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            accessToken,
    oauth_version:          '1.0',
  };

  // Collect ALL params (oauth + body) for the base string
  const allParams = { ...oauthParams, ...bodyParams };
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature  = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  const authHeader = 'OAuth ' + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');

  return authHeader;
}
