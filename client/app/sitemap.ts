import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Public, indexable routes. Private/authenticated areas (dashboard, settings,
// summaries, quizzes, API) are intentionally excluded and also disallowed in
// robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/convert-to-pdf', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/pricing', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/despre', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/contact', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/termeni', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/confidentialitate', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
