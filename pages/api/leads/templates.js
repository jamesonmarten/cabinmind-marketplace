/**
 * /api/leads/templates — CRUD for saved ICP search templates.
 * GET    ?subscriptionKey=...            -> list templates
 * POST   { subscriptionKey, name, icp, ... } -> save a template
 * DELETE { subscriptionKey, id }          -> delete a template
 */
import { listTemplates, saveTemplate, deleteTemplate } from '../../../lib/icpTemplates';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { subscriptionKey } = req.query;
      if (!subscriptionKey) return res.status(400).json({ error: 'subscriptionKey is required' });
      const templates = await listTemplates(subscriptionKey);
      return res.status(200).json({ templates });
    }

    if (req.method === 'POST') {
      const { subscriptionKey, name, icp, industry, location, companySize, excludeCompanies } = req.body || {};
      if (!subscriptionKey || !name?.trim() || !icp?.trim()) {
        return res.status(400).json({ error: 'subscriptionKey, name, and icp are required' });
      }
      const template = await saveTemplate(subscriptionKey, {
        name: name.trim(), icp: icp.trim(), industry, location, companySize, excludeCompanies,
      });
      return res.status(200).json({ template });
    }

    if (req.method === 'DELETE') {
      const { subscriptionKey, id } = req.body || {};
      if (!subscriptionKey || !id) return res.status(400).json({ error: 'subscriptionKey and id are required' });
      await deleteTemplate(subscriptionKey, id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/leads/templates] error:', err.message);
    return res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
}
