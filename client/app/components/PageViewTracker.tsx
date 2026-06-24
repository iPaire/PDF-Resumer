'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pageview } from '@/lib/analytics';

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cookie-consent');
      if (stored) {
        const consent = JSON.parse(stored);
        if (consent.analytics === true) pageview(pathname);
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}