import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

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
    domains: ['lh3.googleusercontent.com'],
  },
  serverExternalPackages: ['pdf-parse'],
};

export default withNextIntl(nextConfig);