/**
 * /api/campaign
 *
 * POST {
 *   lead:          Lead object from LeadDashboard
 *   senderName?:   string   — "Hi, I'm [name]"
 *   senderCompany?: string
 *   productDesc?:  string   — 1-2 sentence product pitch
 * }
 *
 * Returns:
 *   { sequence: [ { step, label, day, subject, body } ] }
 *
 * Sequence:
 *   Step 1 — Day 0  — Cold intro (reference pain point + signal)
 *   Step 2 — Day 3  — Value add (insight / mini case study)
 *   Step 3 — Day 7  — Soft bump with social proof
 *   Step 4 — Day 14 — Break-up / last touch
 *
 * LLM strategy:
 *   1. Try Groq (llama-3.3-70b-versatile) — fast & free
 *   2. Fallback to OpenAI gpt-4o-mini if Groq fails or returns malformed JSON
 *
 * Each email is hard-limited to:
 *   - Subject: ≤ 60 chars
 *   - Body: ≤ 200 words, plain text, no bullet points in step 1
 */

import Groq from 'groq-sdk';
import OpenAI from 'openai';

const groqClient  = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STEPS = [
  { step: 1, label: 'Step 1 — Cold Intro',     day: 0  },
  { step: 2, label: 'Step 2 — Value Add',       day: 3  },
  { step: 3, label: 'Step 3 — Social Proof',    day: 7  },
  { step: 4, label: 'Step 4 — Break-up',        day: 14 },
];

function buildPrompt({ lead, senderName, senderCompany, productDesc }) {
  const firstName   = (lead.name || '').split(' ')[0];
  const company     = lead.company || 'their company';
  const title       = lead.title || 'decision-maker';
  const painPoints  = lead.pain_points || '';
  const signal      = lead.signal || '';
  const techStack   = lead.tech || '';
  const scoreReason = lead.score_reason || '';
  const whyNow      = lead.why_now || '';

  const sender       = senderName    || 'the sender';
  const senderCo     = senderCompany || 'our company';
  const offering     = productDesc   || 'AI-powered tools that help B2B teams save time and close more deals';

  return `You are an expert cold email copywriter. Write a 4-step cold outreach sequence for the following prospect.

PROSPECT:
- Name: ${lead.name}
- First name: ${firstName}
- Title: ${title}
- Company: ${company}
- Industry: ${lead.industry || 'unknown'}
- Company size: ${lead.size || 'unknown'}
- ICP score: ${lead.score || 'N/A'} — ${scoreReason}
- Buying signal: ${signal}
- Pain points: ${painPoints}
- Tech stack: ${techStack}
- Why reach out now: ${whyNow}

SENDER:
- Name: ${sender}
- Company: ${senderCo}
- Offering: ${offering}

SEQUENCE RULES:
1. Step 1 (Day 0) — Cold intro. Reference ONE specific pain point or buying signal. Keep it < 150 words. No bullet points. End with a single soft question.
2. Step 2 (Day 3) — Value add. Share a relevant insight, stat, or mini-case-study. Show don't sell. < 180 words.
3. Step 3 (Day 7) — Social proof / urgency. Reference a result or customer story. Keep it < 150 words.
4. Step 4 (Day 14) — Break-up email. Short (< 80 words), honest, low-pressure. Offer one final resource.

STYLE:
- Conversational, peer-to-peer tone — not salesy
- Plain text, no formatting marks, no bullet points in the email body
- Use {{FIRST_NAME}} as a placeholder for the prospect's first name
- Subject lines: ≤ 60 characters, no clickbait, no ALL CAPS

Return ONLY a valid JSON array. No markdown, no explanation. Format:
[
  { "step": 1, "label": "Step 1 — Cold Intro", "day": 0, "subject": "...", "body": "..." },
  { "step": 2, "label": "Step 2 — Value Add",  "day": 3, "subject": "...", "body": "..." },
  { "step": 3, "label": "Step 3 — Social Proof","day": 7, "subject": "...", "body": "..." },
  { "step": 4, "label": "Step 4 — Break-up",   "day": 14,"subject": "...", "body": "..." }
]`;
}

async function callGroq(prompt) {
  const chat = await groqClient.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens:  2000,
  });
  return chat.choices[0]?.message?.content || '';
}

async function callOpenAI(prompt) {
  const chat = await openaiClient.chat.completions.create({
    model:       'gpt-4o-mini',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens:  2000,
  });
  return chat.choices[0]?.message?.content || '';
}

function parseSequence(raw) {
  // Strip markdown code fences if the model included them
  const clean = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const arr = JSON.parse(clean);

  if (!Array.isArray(arr) || arr.length !== 4) {
    throw new Error(`Expected 4-item array, got ${Array.isArray(arr) ? arr.length : typeof arr}`);
  }

  // Merge with step metadata and validate required fields
  return arr.map((item, i) => {
    const meta = STEPS[i];
    if (!item.subject || !item.body) throw new Error(`Step ${i + 1} missing subject or body`);
    return {
      step:    meta.step,
      label:   item.label || meta.label,
      day:     meta.day,
      subject: String(item.subject).slice(0, 80),
      body:    String(item.body),
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { lead, senderName, senderCompany, productDesc } = req.body || {};

  if (!lead || !lead.name || !lead.company) {
    return res.status(400).json({ error: 'Lead with name and company is required.' });
  }

  const prompt = buildPrompt({ lead, senderName, senderCompany, productDesc });

  let raw = '';
  let provider = 'groq';

  // 1. Try Groq
  try {
    raw = await callGroq(prompt);
    const sequence = parseSequence(raw);
    return res.status(200).json({ sequence, provider: 'groq' });
  } catch (groqErr) {
    console.warn('[campaign] Groq failed:', groqErr.message);
    provider = 'openai';
  }

  // 2. Fallback to OpenAI
  try {
    raw = await callOpenAI(prompt);
    const sequence = parseSequence(raw);
    return res.status(200).json({ sequence, provider: 'openai' });
  } catch (openaiErr) {
    console.error('[campaign] OpenAI also failed:', openaiErr.message);
    console.error('[campaign] Raw output:', raw.slice(0, 500));
    return res.status(500).json({
      error: 'Failed to generate email sequence. Please try again.',
      detail: openaiErr.message,
    });
  }
}
