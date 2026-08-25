/**
 * /api/wp/plugin-recommender
 * CabinMind WordPress Plugin Recommender
 * Free tier: 2 recommendations per month per IP
 */
import OpenAI from 'openai';
import { checkFreeLimit, getClientIP, setCorsHeaders } from '../../../lib/wpFreeLimit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_TYPES = [
  'e-commerce', 'blog', 'portfolio', 'restaurant', 'service-business',
  'nonprofit', 'real-estate', 'membership', 'directory', 'news', 'other',
];

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ip    = getClientIP(req);
  const check = checkFreeLimit(ip, 'plugin-recommender');

  if (!check.allowed) {
    return res.status(429).json({
      error:      'free_limit_reached',
      message:    `Free tier allows 2 recommendations per month. Upgrade for unlimited stacks.`,
      upgradeUrl: 'https://wp.devcabin.tech/agents/plugin-recommender',
    });
  }

  const { businessType, description, goals } = req.body || {};

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ error: 'description is required (min 10 chars)' });
  }

  const safeType  = VALID_TYPES.includes(businessType) ? businessType : 'other';
  const safeDesc  = String(description).slice(0, 500).trim();
  const safeGoals = Array.isArray(goals)
    ? goals.filter(g => typeof g === 'string').slice(0, 6).map(g => String(g).slice(0, 80))
    : [];

  const prompt = `You are a veteran WordPress developer. Recommend a complete plugin stack for this business.

Business type: ${safeType}
Description: ${safeDesc}
Goals: ${safeGoals.length ? safeGoals.join(', ') : 'general WordPress site'}

Rules:
- Recommend 8–10 plugins that form a coherent, non-conflicting stack.
- Prefer free/freemium plugins from WordPress.org. Include paid only when there is no good free alternative.
- Always include one each from: SEO, security, performance/caching, backup.
- Add business-type-specific plugins for the remaining slots.
- Sort by installation order (essentials first).

Respond ONLY with valid JSON:
{
  "stack": [
    {
      "name": "string",
      "slug": "wordpress-org-slug",
      "purpose": "One sentence describing what it does",
      "reason": "Why this specific plugin suits this business",
      "pricing": "Free | Freemium from $X/yr | Premium $X/yr",
      "installOrder": 1,
      "category": "SEO|Security|Performance|Backup|E-commerce|Forms|Analytics|Other",
      "wpOrgUrl": "https://wordpress.org/plugins/slug/"
    }
  ],
  "warnings": ["Any conflicts or gotchas to watch for"],
  "estimatedSetupTime": "e.g. 2–3 hours",
  "summary": "2-3 sentence plain-English description of why this stack suits the business"
}`;

  let data;
  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens:      1600,
      temperature:     0.3,
    });
    data = JSON.parse(completion.choices[0].message.content);
  } catch {
    return res.status(500).json({ error: 'Recommendation failed. Please try again.' });
  }

  return res.status(200).json({
    success:       true,
    data,
    usedThisMonth: check.used,
    freeLimit:     check.limit,
    upgradeUrl:    'https://wp.devcabin.tech/agents/plugin-recommender',
  });
}
