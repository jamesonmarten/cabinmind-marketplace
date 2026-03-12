export default function handler(req, res) {
  const agents = [
    {
      id: 'receptionist',
      name: 'AI Receptionist',
      description: 'Answers website chat and qualifies leads automatically.',
      category: 'Customer Support',
      price: 39,
      features: ['Website chat', 'Lead qualification', 'Appointment booking'],
      tools: ['Calendar booking', 'CRM lookup', 'FAQ database', 'Email sender'],
      actions: ['Book appointment', 'Send lead to CRM', 'Email summary']
    },
    {
      id: 'website-audit',
      name: 'AI Website Auditor',
      description: 'Analyzes your site for SEO and UX improvements.',
      category: 'Marketing',
      price: 19,
      features: ['SEO analysis', 'UX audit', 'Performance report'],
      tools: ['Crawler', 'Keyword analysis', 'Performance metrics'],
      actions: ['Generate report', 'Email audit summary']
    },
    {
      id: 'blog-writer',
      name: 'AI Blog Writer',
      description: 'Creates SEO-optimized blog posts for your business.',
      category: 'Content',
      price: 29,
      features: ['Keyword research', 'Topic generation', 'Content creation'],
      tools: ['SEO toolkit', 'Language model'],
      actions: ['Generate outline', 'Write full article']
    },
    {
      id: 'sales-assistant',
      name: 'AI Sales Assistant',
      description: 'Drafts outreach emails and manages follow-ups.',
      category: 'Sales',
      price: 49,
      features: ['Email drafting', 'Follow-up scheduling', 'CRM integration'],
      tools: ['Email sender', 'CRM lookup'],
      actions: ['Send outreach', 'Log interaction']
    },
    {
      id: 'lead-researcher',
      name: 'AI Lead Researcher',
      description: 'Discovers and qualifies new prospects.',
      category: 'Sales',
      price: 59,
      features: ['Prospect discovery', 'Lead scoring', 'Data enrichment'],
      tools: ['Web scraper', 'APIs', 'CRM integration'],
      actions: ['Generate lead list', 'Enrich data']
    }
  ];

  const { id } = req.query;
  if (id) {
    const agent = agents.find((a) => a.id === id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
    } else {
      res.status(200).json(agent);
    }
  } else {
    res.status(200).json(agents);
  }
}