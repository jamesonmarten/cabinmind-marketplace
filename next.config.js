/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: []
  },
  // Pin workspace root so Turbopack doesn't pick up the stray ~/package-lock.json
  turbopack: {
    root: __dirname,
  },
};
module.exports = nextConfig;