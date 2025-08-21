'use client';

import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('about');
  
  return (
    <div className="max-w-3xl mx-auto p-6 text-black">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      <p className="mb-4">
        {t('description1')}
      </p>
      <p className="mb-4">
        {t('description2')}
      </p>
      <p>
        {t('description3')}
      </p>
    </div>
  );
}
