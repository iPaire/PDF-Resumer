/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    largePageDataBytes: 128 * 100000, // 128KB
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // adaugă aici hostname-ul
  },
  serverExternalPackages: ['pdf-parse'], // Mutat la nivel superior
};

module.exports = nextConfig;