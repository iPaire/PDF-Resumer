// app/page.tsx
'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

export default function Home() {
  const { data: session, status } = useSession();
  const t = useTranslations('homepage');
  const tc = useTranslations('common');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            {t('heroTitle')} <span className="text-blue-600">{t('heroHighlight')}</span>
          </h1>
          
          <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
            {t('heroSubtitle')}
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            {status === 'authenticated' ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  {t('dashboardBtn')}
                </Link>
                <Link
                  href="/upload"
                  className="px-8 py-3 bg-white text-blue-600 border border-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
                >
                  {t('uploadBtn')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  {t('loginBtn')}
                </Link>
                <Link
                  href="/register"
                  className="px-8 py-3 bg-white text-blue-600 border border-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
                >
                  {t('registerBtn')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              {t('howItWorks')}
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-xl text-gray-600">
              {t('howItWorksSubtitle')}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-2xl font-bold">1</span>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">{t('step1Title')}</h3>
                <p className="mt-2 text-gray-600">
                  {t('step1Description')}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-2xl font-bold">2</span>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">{t('step2Title')}</h3>
                <p className="mt-2 text-gray-600">
                  {t('step2Description')}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-2xl font-bold">3</span>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">{t('step3Title')}</h3>
                <p className="mt-2 text-gray-600">
                  {t('step3Description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}