import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Allow crawling of public pages; keep authenticated and API surfaces out of
// the index. Points crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/settings', '/summaries', '/quizzes', '/upload', '/workspace', '/courses'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
