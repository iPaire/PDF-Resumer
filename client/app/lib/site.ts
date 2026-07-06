// Canonical production origin, used for metadataBase, Open Graph URLs, sitemap,
// and robots. Override with NEXT_PUBLIC_SITE_URL in other environments; falls
// back to the live domain so absolute SEO URLs are always correct in prod.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://smartpdfnotes.com'
).replace(/\/$/, '');
