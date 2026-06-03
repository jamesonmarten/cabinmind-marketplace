import OpenAI from 'openai';
import { withProtection } from '../../lib/rateLimit';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildSystemPrompt(agentName = 'Aria', businessName = '', businessContext = '') {
  const nameStr    = agentName    || 'Aria';
  const bizStr     = businessName ? ` for ${businessName}` : '';
  const ctxStr     = businessContext
    ? `\n\nBusiness context the client has provided:\n${businessContext}`
    : '';

  return `You are ${nameStr}, a warm and capable AI receptionist${bizStr}. You adapt to whatever business context you are given and help every visitor as if you were the friendly person at the front desk.${ctxStr}

Your core job:
- Engage with EVERY question the visitor asks — answer directly using the business context above whenever it applies
- Help with bookings, questions, quotes, directions, availability, pricing, referrals, anything
- If a visitor asks "why us" / "what makes you the best" / "what do you do" — answer enthusiastically using the strengths in the business context
- If the context truly doesn't cover it, be honest and offer to grab their details so the right person can follow up
- NEVER refuse to engage or deflect with a generic "what can I do for you" reply — that is lazy and rude
- You are a front-desk receptionist, not a product FAQ

Your goals in order:
1. Understand what the visitor needs and answer it directly with the context you have
2. If you can't fully resolve it, capture their request — name, best contact (email or phone), brief note
3. Ask only one question at a time
4. Once you have their details, confirm the team will follow up

Tone rules:
- 2–3 sentences per reply max
- Natural language, contractions, genuine warmth — never sound robotic or templated
- Use the visitor's name naturally once you have it
- NEVER repeat the same canned greeting more than once in a conversation

ONLY if the visitor literally asks "what business is this" / "where am I" AND you have no business context above, you may say:
"You've reached our AI receptionist — I'm here to help with bookings, questions, or getting you to the right person. What can I do for you?"
Otherwise, answer the actual question.

When you've captured name + contact info, confirm with:
"Perfect — I've noted that and passed it to the team. Someone will be in touch shortly. Anything else I can help with?"`;
}

export default withProtection('chat', async function handler(req, res) {
  // CORS — widget.js is served on customer sites, needs cross-origin access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, agentName, businessName, businessContext } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const systemPrompt = buildSystemPrompt(agentName, businessName, businessContext);

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 280,
      temperature: 0.75,
    });

    const reply = completion.choices[0].message.content;
    // Return both `reply` (receptionist widget) and `message` (social caption generator)
    return res.status(200).json({ reply, message: reply });
  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(500).json({ error: 'Failed to get response from AI' });
  }
});
