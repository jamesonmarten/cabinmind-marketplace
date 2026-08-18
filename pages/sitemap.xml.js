const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://products.devcabin.tech';

const ROUTES = [
  '/',
  '/agents',
  '/pricing',
  '/compare',
  '/demo',
  '/trial',
  '/agency',
  '/agents/receptionist',
  '/agents/website-audit',
  '/agents/blog-writer',
  '/agents/sales-assistant',
  '/agents/lead-researcher',
  '/agents/social-hub',
  '/agents/ai-training',
  '/agents/automation-expert',
  '/agents/wp-vulnerability-scanner',
  '/agents/wp-plugin-recommender',
  '/agents/wp-speed-optimizer',
  '/agents/wp-maintenance-report',
  '/agents/wp-child-theme-builder',
  '/agents/wp-link-checker',
];

function buildSitemapXml() {
  const now = new Date().toISOString();

  const urls = ROUTES.map((route) => {
    const priority = route === '/' ? '1.0' : route.startsWith('/agents/') ? '0.8' : '0.9';
    const changefreq = route === '/' ? 'daily' : route.startsWith('/agents/') ? 'weekly' : 'weekly';

    return `  <url>\n    <loc>${SITE_URL}${route}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'application/xml');
  res.write(buildSitemapXml());
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
