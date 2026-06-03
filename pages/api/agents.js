export default function handler(req, res) {
  const agents = [
    {
      id: 'receptionist',
      name: 'AI Receptionist',
      description: 'Answers website chat and qualifies leads automatically.',
      category: 'Customer Support',
      price: 80,
      features: ['Website chat', 'Lead qualification', 'Appointment booking'],
      tools: ['Calendar booking', 'CRM lookup', 'FAQ database', 'Email sender'],
      actions: ['Book appointment', 'Send lead to CRM', 'Email summary']
    },
    {
      id: 'website-audit',
      name: 'AI Website Auditor',
      description: 'Deep-crawl any site for SEO, performance, accessibility, UX — plus full tech stack detection with pros, cons, and actionable upgrade paths.',
      category: 'Marketing',
      price: 50,
      priceLabel: '$50/mo',
      features: [
        'Performance, SEO, Accessibility & UX scores',
        'Tech stack fingerprinting (CMS, hosting, CDN, analytics, frameworks)',
        'Per-technology pros, cons & upgrade recommendations',
        'Actionable fix list with traffic-impact estimates',
        'Google PageSpeed Insights (live Lighthouse data)',
        'AI fallback audit when quota is reached',
        'Session audit history & one-click re-run',
        'Export full report as .txt',
      ],
      tools: ['Google PageSpeed Insights', 'GPT-4o mini', 'Wappalyzer-style detection'],
      actions: ['Run audit', 'Detect tech stack', 'Export report', 'Re-run history']
    },
    {
      id: 'blog-writer',
      name: 'AI Blog Writer',
      description: 'Creates SEO-optimized blog posts for your business. $50/hr on-demand or flexible monthly retainer.',
      category: 'Content',
      price: 50,
      priceLabel: '$50/hr · retainer available',
      priceSuffix: '/hr',
      features: [
        'Keyword research & topic ideation',
        'Full 2,400-word SEO-optimised articles',
        'Live article generation (watch it write)',
        'WordPress auto-publish as draft',
        'E-E-A-T optimised structure',
        'Monthly retainer plans available',
      ],
      tools: ['SEO toolkit', 'GPT-4o mini', 'WordPress REST API'],
      actions: ['Generate outline', 'Write full article', 'Publish to WordPress']
    },
    {
      id: 'sales-assistant',
      name: 'AI Sales Assistant',
      description: 'Drafts outreach emails and manages follow-ups.',
      category: 'Sales',
      price: 100,
      features: ['Email drafting', 'Follow-up scheduling', 'CRM integration'],
      tools: ['Email sender', 'CRM lookup'],
      actions: ['Send outreach', 'Log interaction']
    },
    {
      id: 'lead-researcher',
      name: 'AI Lead Researcher',
      description: 'Discovers and qualifies prospects, validates emails, generates AI cold email sequences, and exports ready-to-send campaigns to Instantly.ai.',
      category: 'Sales',
      price: 100,
      priceLabel: 'from $100/mo',
      features: [
        'Prospect discovery',
        'A–D ICP scoring on 8 signals',
        'ZeroBounce email validation',
        'Direct LinkedIn profiles',
        'Campaign Builder — bulk list validation',
        'AI 4-step cold email sequences',
        'Instantly.ai CSV export',
        'HubSpot / Airtable / CSV export',
      ],
      tools: ['Hunter.io', 'ZeroBounce', 'Groq AI', 'OpenAI', 'Instantly.ai (export)', 'HubSpot', 'Airtable'],
      actions: ['Generate lead list', 'Validate email list', 'Generate email sequence', 'Export to Instantly.ai', 'Push to CRM']
    },
    {
      id: 'social-hub',
      name: 'AI Social Media Hub',
      description: 'Publish images, videos, and posts to Instagram, Facebook, X, LinkedIn, and TikTok simultaneously — with AI-generated captions.',
      category: 'Marketing',
      price: 50,
      priceLabel: '$50/mo',
      features: [
        'Post to 5 platforms simultaneously',
        'AI caption generator (GPT-4o mini)',
        'Image & video upload',
        'Scheduling & draft queue',
        'Per-platform toggle on/off',
        'Post history & status tracking',
        'localStorage credential vault',
        'Publish analytics dashboard',
      ],
      tools: ['Meta Graph API', 'X API v2', 'LinkedIn UGC API', 'TikTok Content API', 'GPT-4o mini'],
      actions: ['Compose & publish post', 'Generate AI caption', 'Upload media', 'Save draft', 'View post history']
    },
    {
      id: 'ai-training',
      name: '1-on-1 AI Training',
      description: 'Private Google Meet sessions with a CabinMind AI specialist — $50/hr on-demand, or pay $500 once for lifetime access with exclusive AI perks.',
      category: 'Consulting',
      price: 50,
      priceLabel: '$50/hr · $500 lifetime',
      priceSuffix: '/hr',
      features: [
        'Private 1-on-1 Google Meet session (60 min)',
        '$50/hr on-demand — book anytime',
        '$500 one-time Lifetime Pass with exclusive perks:',
        '→ Unlimited sessions — no hourly fee ever again',
        '→ Priority scheduling — first-available slots',
        '→ Private Slack/Discord channel with your trainer',
        '→ Custom AI prompt library built for your business',
        '→ Early access to every new CabinMind product',
        '→ Free monthly AI strategy review call',
        '→ Lifetime product update briefings',
        'Hands-on walkthrough of any CabinMind product',
        'Custom AI workflow design for your business',
        'Prompt engineering & agent configuration',
        'Session recording sent to you within 24 hrs',
        'Follow-up Q&A via email (48hr)',
      ],
      tools: ['Google Meet', 'Screen share', 'Live build sessions'],
      actions: ['Book a session', 'Send enquiry', 'Buy Lifetime Pass']
    },
    {
      id: 'automation-expert',
      name: 'AI Automation Expert',
      description: 'Describe any workflow in plain English → get importable blueprints for Zapier, Make.com, n8n, plus webhook & Python snippets. Skip the consultant bill.',
      category: 'Marketing',
      price: 197,
      priceLabel: '$197/mo · 25 generations',
      features: [
        'Plain-English → production-ready automation',
        'Importable Make.com scenario blueprints (JSON)',
        'Importable n8n workflow JSON',
        'Step-by-step Zapier setup instructions',
        'Webhook (cURL) + Python equivalents',
        'Cost estimates per platform (Zapier / Make / n8n)',
        'Auth warnings + common-gotcha highlights',
        '25 generations / month (Agency tier = unlimited)',
        'In-dashboard history of every blueprint',
      ],
      tools: ['GPT-4o (JSON mode)', 'Zapier app catalog', 'Make.com blueprint format', 'n8n node spec'],
      actions: ['Generate blueprint', 'Download JSON', 'Copy webhook snippet', 'View history']
    },
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