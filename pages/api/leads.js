import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { icp } = req.body;
  if (!icp) return res.status(400).json({ error: 'icp is required' });

  const prompt = `You are an elite B2B lead research specialist. Based on the Ideal Customer Profile below, generate exactly 5 highly realistic fictional prospect leads that feel genuinely hand-researched.

ICP: "${icp}"

Return ONLY a valid JSON array with exactly 5 objects. Each object MUST have these exact keys:
- name (string): full realistic name — vary gender and ethnicity
- title (string): specific job title highly relevant to the ICP (not generic — e.g. "VP of Revenue Operations" not "Manager")
- company (string): realistic company name that fits the ICP industry perfectly
- size (string): employee count range e.g. "45–80" — keep it tight and specific
- score (number): ICP fit score 72–98, vary them meaningfully (don't make them all 90+)
- tech (string): 2–3 specific tools they actually use based on their company type, comma-separated (e.g. "HubSpot, Intercom, Slack")
- email (string): realistic work email derived from their name and company domain (e.g. sarah.chen@growthly.io)
- phone (string): US format +1 XXX 555 XXXX (vary the area codes)
- signal (string): ONE compelling reason they match the ICP right now (e.g. "Just raised Series A", "Hiring 3 SDRs on LinkedIn", "Recently switched CRM")

Make each lead feel like a real person you found on LinkedIn. Vary industries within the ICP. Return ONLY the JSON array, no markdown fences, no explanation, no trailing text.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.8,
    });

    const raw = completion.choices[0].message.content.trim();
    // Strip markdown code fences if model wraps it
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const leads = JSON.parse(cleaned);
    return res.status(200).json({ leads });
  } catch (err) {
    console.error('Leads API error:', err);
    return res.status(500).json({ error: 'Failed to generate leads' });
  }
}
