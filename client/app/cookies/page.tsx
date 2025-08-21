'use client';

import { useTranslations } from 'next-intl';

export default function CookiesPage() {
  const t = useTranslations('cookies');
  
  return (
    <div className="max-w-3xl mx-auto p-6 text-black">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      <p className="mb-4">
        {t('description')}
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>{t('point1')}</li>
        <li>{t('point2')}</li>
        <li>{t('point3')}</li>
        <li>{t('point4')}</li>
      </ul>
    </div>
  );
}
