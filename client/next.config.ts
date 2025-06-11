/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    largePageDataBytes: 128 * 100000, // 128KB
  },
  serverExternalPackages: ['pdf-parse'], // Mutat la nivel superior
};

module.exports = nextConfig;