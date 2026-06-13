/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use standalone output for Docker / Railway deployment
  // Switch to 'export' for Cloudflare Pages static deployment
  output: process.env.NEXT_OUTPUT === 'export' ? 'export' : 'standalone',

  // API base URL at build time (also available via NEXT_PUBLIC_ at runtime)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  },

  images: {
    // Allow R2 public URLs for document thumbnails
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },

  // Strict mode catches accidental side effects
  reactStrictMode: true,
};

module.exports = nextConfig;