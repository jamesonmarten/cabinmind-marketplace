const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://products.devcabin.tech';

export async function getServerSideProps({ res }) {
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /dashboard
Disallow: /checkout

Sitemap: ${SITE_URL}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain');
  res.write(robots);
  res.end();

  return { props: {} };
}

export default function Robots() {
  return null;
}
