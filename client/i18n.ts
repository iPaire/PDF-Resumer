import {getRequestConfig} from 'next-intl/server';
import {headers} from 'next/headers';

export const locales = ['en', 'ro', 'de', 'es', 'fr'] as const;
export const defaultLocale = 'en' as const;

async function getLocale() {
  const headersInstance = await headers();
  const acceptLanguage = headersInstance.get('accept-language');
  
  if (acceptLanguage) {
    // Extract preferred languages from Accept-Language header
    const preferredLanguages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().toLowerCase());
    
    // Check if any preferred language matches our supported locales
    for (const lang of preferredLanguages) {
      // Check exact match first
      if (locales.includes(lang as any)) {
        return lang as typeof defaultLocale;
      }
      
      // Check language code only (e.g., 'ro' from 'ro-RO')
      const langCode = lang.split('-')[0];
      if (locales.includes(langCode as any)) {
        return langCode as typeof defaultLocale;
      }
    }
  }
  
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await getLocale();

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});