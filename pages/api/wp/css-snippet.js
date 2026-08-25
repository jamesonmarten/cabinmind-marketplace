/**
 * /api/wp/css-snippet
 * CabinMind Child Theme & CSS Snippet Generator
 * Free tier: 3 snippets per month per IP
 */
import OpenAI from 'openai';
import { checkFreeLimit, getClientIP, setCorsHeaders } from '../../../lib/wpFreeLimit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_THEMES = [
  'divi', 'elementor', 'astra', 'generatepress', 'kadence',
  'blocksy', 'neve', 'storefront', 'twentytwentyfour', 'other',
];

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ip    = getClientIP(req);
  const check = checkFreeLimit(ip, 'css-snippet');

  if (!check.allowed) {
    return res.status(429).json({
      error:      'free_limit_reached',
      message:    `Free tier allows 3 snippets per month. You have used ${check.used}/${check.limit}. Upgrade for unlimited.`,
      upgradeUrl: 'https://wp.devcabin.tech/agents/child-theme-builder',
    });
  }

  const { description, theme, includeChildTheme } = req.body || {};

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ error: 'description is required (min 10 chars)' });
  }

  const safeDesc  = String(description).slice(0, 600).trim();
  const safeTheme = VALID_THEMES.includes(theme) ? theme : 'other';
  const wantChild = Boolean(includeChildTheme);

  const childThemeInstruction = wantChild
    ? '- Include a complete child theme scaffold: the style.css header comment block and a functions.php that enqueues the parent theme.'
    : '- Do NOT include child theme scaffold (user did not request it).';

  const prompt = `You are an expert WordPress front-end developer. Generate CSS and optional PHP for this styling change.

Theme / builder: ${safeTheme}
Requested change: ${safeDesc}
${childThemeInstruction}

Requirements:
- CSS must be specific enough to avoid conflicts with ${safeTheme}'s own styles.
- Use CSS custom properties (variables) where they improve maintainability.
- Flag specific conflicts with ${safeTheme}'s known CSS architecture if any.
- Any PHP snippets belong in a child theme's functions.php.
- All code must be production-safe: no eval(), no external HTTP requests, no inline event handlers.
- Explain where to paste the CSS (Customizer > Additional CSS, child theme style.css, etc.).

Respond ONLY with valid JSON:
{
  "css": "Complete, ready-to-paste CSS (plain code, no markdown fences)",
  "php": "PHP snippet for functions.php, or null if not needed",
  "childTheme": ${wantChild ? `{
    "styleHeader": "Full style.css comment header (Theme Name, Template, Version, etc.)",
    "functions": "Complete functions.php content",
    "instructions": "Step-by-step instructions to create and activate the child theme"
  }` : 'null'},
  "placement": "Where to add the CSS — one of: Customizer Additional CSS | child theme style.css | plugin wp_add_inline_style | etc.",
  "conflicts": ["Potential conflict with ${safeTheme}: description"],
  "notes": "Browser support notes, caveats, or tips",
  "preview": "Plain-English description of the visual change this code produces"
}`;

  let data;
  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens:      1500,
      temperature:     0.2,
    });
    data = JSON.parse(completion.choices[0].message.content);
  } catch {
    return res.status(500).json({ error: 'Snippet generation failed. Please try again.' });
  }

  return res.status(200).json({
    success:       true,
    theme:         safeTheme,
    data,
    usedThisMonth: check.used,
    freeLimit:     check.limit,
    upgradeUrl:    'https://wp.devcabin.tech/agents/child-theme-builder',
  });
}
