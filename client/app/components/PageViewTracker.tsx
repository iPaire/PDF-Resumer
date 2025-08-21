'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pageview } from '@/lib/analytics';

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Track page view on route change
    pageview(pathname);
  }, [pathname]);

  return null; // This component doesn't render anything
}