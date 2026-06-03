/**
 * /api/automation
 *
 * AI Automation Expert — given a plain-English workflow description, returns
 * importable artefacts for Zapier, Make.com, and n8n, plus a webhook snippet
 * and a step-by-step explanation.
 *
 * Cost note: uses GPT-4o with JSON mode. Average gen ~1,800 output tokens
 * (~$0.05–$0.08 each). At $197/mo with a 25-gen quota, worst-case API cost
 * is ~$2 and margin stays ~98%. Quota enforced in the dashboard UI for now;
 * move to usageStore when needed.
 */
import OpenAI from 'openai';
import { withProtection } from '../../lib/rateLimit';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are the AI Automation Expert at Dev Cabin Technologies. You convert plain-English workflow descriptions into production-ready, importable automation blueprints for Zapier, Make.com, and n8n.

You output ONLY valid JSON matching this exact schema:

{
  "title": "Short title (max 60 chars)",
  "summary": "2-3 sentence plain-English description of what this automation does",
  "trigger": { "app": "App name", "event": "Event name", "notes": "Setup notes" },
  "steps": [
    { "n": 1, "app": "App", "action": "Action name", "description": "What this step does", "config": { "key": "value" } }
  ],
  "estimatedRuns": "e.g. 50-200 runs/mo",
  "estimatedCost": { "zapier": "$X/mo on Zapier Starter tier", "make": "$Y/mo on Make Core", "n8n": "$0 self-hosted / $20 cloud" },
  "warnings": ["Common gotcha 1", "Auth requirement 2"],
  "zapierImport": {
    "format": "zap-template-description",
    "instructions": "Step-by-step manual setup instructions for Zapier (Zapier does not accept JSON imports from external tools)",
    "blocks": [
      { "type": "trigger", "app": "App name (Zapier app slug if known)", "event": "Event", "fields": { "field": "sample value" } },
      { "type": "action", "app": "App", "action": "Action", "fields": { "field": "{{1.field_from_trigger}}" } }
    ]
  },
  "makeBlueprint": {
    "name": "Scenario name",
    "flow": [
      { "id": 1, "module": "module:name (e.g. gmail:ActionSendEmail)", "version": 1, "parameters": {}, "mapper": {}, "metadata": { "designer": { "x": 0, "y": 0 } } }
    ],
    "metadata": { "instant": false, "version": 1, "scenario": { "roundtrips": 1, "maxErrors": 3, "autoCommit": true, "autoCommitTriggerLast": true, "sequential": false, "confidential": false, "dataloss": false, "dlq": false } },
    "importInstructions": "Copy the JSON above, open Make.com → Create Scenario → top-right ⋯ menu → Import Blueprint → paste."
  },
  "n8nWorkflow": {
    "name": "Workflow name",
    "nodes": [
      { "parameters": {}, "id": "uuid-like", "name": "Node name", "type": "n8n-nodes-base.module", "typeVersion": 1, "position": [250, 300] }
    ],
    "connections": { "NodeName": { "main": [[{ "node": "NextNode", "type": "main", "index": 0 }]] } },
    "active": false,
    "settings": { "executionOrder": "v1" },
    "importInstructions": "Copy the JSON above, open n8n → Workflows → top-right ⋯ menu → Import from File / Clipboard → paste."
  },
  "webhookSnippet": {
    "language": "bash",
    "code": "curl -X POST ... example call demonstrating the trigger",
    "notes": "When to use the webhook approach"
  },
  "pythonSnippet": {
    "code": "import requests\\n# minimal Python equivalent",
    "notes": "Use this if customer wants to embed automation logic directly in code"
  }
}

Rules:
- Output ONLY the JSON object. No prose before or after. No markdown fences.
- If you don't know an exact Make/n8n module name, use the closest documented one and note it in "warnings".
- Make blueprint JSON must be importable — keep "flow" minimal but valid. Use "module" names from Make's documented apps (gmail, google-sheets, openai, slack, http, webhooks, etc).
- n8n nodes must use real "n8n-nodes-base.*" type names (gmail, googleSheets, slack, openAi, httpRequest, webhook, scheduleTrigger, set, if, function, etc).
- Always include realistic warnings (auth tokens needed, rate limits, common errors).
- Cost estimates should reflect 2025-2026 pricing on each platform's lowest paid tier that supports the workflow.
- If the user's request is vague, make reasonable assumptions and note them in "summary".`;

export default withProtection('chat', async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { description, platformHint } = req.body || {};
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ error: 'Please describe your automation in at least 10 characters.' });
  }

  const userPrompt = `Build an automation blueprint for this workflow:

"""
${description.trim()}
"""

${platformHint ? `User prefers: ${platformHint}.` : 'User has no platform preference — generate blueprints for all three (Zapier, Make, n8n).'}

Return ONLY the JSON object per the schema in your instructions.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('[automation] JSON parse failed:', e.message, raw.slice(0, 500));
      return res.status(502).json({ error: 'AI returned malformed JSON. Please retry.' });
    }

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      tokens: completion.usage,
      blueprint: parsed,
    });
  } catch (err) {
    console.error('[automation] OpenAI error:', err);
    return res.status(500).json({ error: err.message || 'Generation failed.' });
  }
});
