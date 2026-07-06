'use client';

import Script from 'next/script';
import { useState, useEffect } from 'react';
import { GA_TRACKING_ID } from '@/lib/analytics';

export default function GoogleAnalytics() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      try {
        const stored = localStorage.getItem('cookie-consent');
        if (stored) {
          const consent = JSON.parse(stored);
          setAnalyticsEnabled(consent.analytics === true);
        }
      } catch {
        setAnalyticsEnabled(false);
      }
    };

    checkConsent();
    window.addEventListener('cookie-consent-updated', checkConsent);
    return () => window.removeEventListener('cookie-consent-updated', checkConsent);
  }, []);

  if (!analyticsEnabled) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              allow_google_signals: false,
              allow_ad_personalization_signals: false
            });
          `,
        }}
      />
    </>
  );
}