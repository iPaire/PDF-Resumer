'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

type CookieConsent = {
  essential: true;
  analytics: boolean;
};

export default function CookieBanner() {
  const t = useTranslations('cookieBanner');
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cookie-consent');
    if (!stored) setVisible(true);
  }, []);

  const saveConsent = (analytics: boolean) => {
    const consent: CookieConsent = { essential: true, analytics };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    window.dispatchEvent(new Event('cookie-consent-updated'));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('title')}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('description')}{' '}
                <Link href="/cookies" className="underline text-blue-600 hover:text-blue-800">
                  {t('learnMore')}
                </Link>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('customize')}
              </button>
              <button
                onClick={() => saveConsent(false)}
                className="px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('rejectAll')}
              </button>
              <button
                onClick={() => saveConsent(true)}
                className="px-3 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                {t('acceptAll')}
              </button>
            </div>
          </div>

          {showDetails && (
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-xs font-semibold text-gray-900">{t('essential')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('essentialDesc')}</p>
                </div>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded whitespace-nowrap shrink-0">
                  {t('alwaysOn')}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-xs font-semibold text-gray-900">{t('analytics')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('analyticsDesc')}</p>
                </div>
                <button
                  onClick={() => saveConsent(true)}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded whitespace-nowrap shrink-0 hover:bg-blue-700"
                >
                  {t('accept')}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => saveConsent(false)}
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  {t('rejectNonEssential')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
