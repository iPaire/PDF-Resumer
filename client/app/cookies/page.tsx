'use client';

import { useTranslations } from 'next-intl';

export default function CookiesPage() {
  const t = useTranslations('cookies');

  const resetConsent = () => {
    localStorage.removeItem('cookie-consent');
    window.dispatchEvent(new Event('cookie-consent-updated'));
    window.location.reload();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-gray-900">
      <h1 className="text-3xl font-bold mb-3">{t('title')}</h1>
      <p className="text-gray-600 mb-8 leading-relaxed">{t('description')}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{t('whatAreCookies')}</h2>
        <p className="text-gray-600 leading-relaxed">{t('whatAreCookiesDesc')}</p>
      </section>

      <section className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xl font-semibold">{t('essentialTitle')}</h2>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Always On</span>
        </div>
        <p className="text-gray-600 mb-3 leading-relaxed">{t('essentialDesc')}</p>
        <ul className="space-y-2 text-gray-600 text-sm">
          <li className="flex gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('essentialItem1')}</li>
          <li className="flex gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('essentialItem2')}</li>
          <li className="flex gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('essentialItem3')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('analyticsTitle')}</h2>
        <p className="text-gray-600 mb-3 leading-relaxed">{t('analyticsDesc')}</p>
        <ul className="space-y-2 text-gray-600 text-sm">
          <li className="flex gap-2"><span className="text-blue-500 mt-0.5">•</span>{t('analyticsItem1')}</li>
          <li className="flex gap-2"><span className="text-blue-500 mt-0.5">•</span>{t('analyticsItem2')}</li>
        </ul>
      </section>

      <section className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-2">{t('managingTitle')}</h2>
        <p className="text-gray-600 mb-4 leading-relaxed">{t('managingDesc')}</p>
        <button
          onClick={resetConsent}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          {t('manageBtn')}
        </button>
      </section>
    </div>
  );
}
