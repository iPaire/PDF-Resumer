// app/page.tsx - Landing page: "turn any PDF into your personal AI tutor".
'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  MessageCircle,
  Key,
  CheckSquare,
  Layers,
  HelpCircle,
  Edit3,
  ArrowRight,
} from 'react-feather';

export default function Home() {
  const { status } = useSession();
  const t = useTranslations('homepage');
  const tc = useTranslations('common');
  const tw = useTranslations('workspace');

  const features = [
    { icon: <FileText size={20} />, title: tw('sections.summary'), description: t('featureSummaryDesc') },
    { icon: <MessageCircle size={20} />, title: tw('sections.chat'), description: t('featureChatDesc') },
    { icon: <Key size={20} />, title: tw('sections.concepts'), description: t('featureConceptsDesc') },
    { icon: <CheckSquare size={20} />, title: tw('sections.quiz'), description: t('featureQuizDesc') },
    { icon: <Layers size={20} />, title: tw('sections.flashcards'), description: t('featureFlashcardsDesc') },
    { icon: <HelpCircle size={20} />, title: tw('sections.questions'), description: t('featureQuestionsDesc') },
    { icon: <Edit3 size={20} />, title: tw('sections.notes'), description: t('featureNotesDesc') },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-ink tracking-tight leading-tight">
            {t('heroTitle')} <span className="text-accent">{t('heroHighlight')}</span>
          </h1>

          <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-ink-soft">
            {t('heroSubtitle')}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            {status === 'authenticated' ? (
              <>
                <Link
                  href="/upload"
                  className="px-8 py-3 bg-accent text-white font-semibold rounded-btn hover:bg-accent-strong transition-colors inline-flex items-center justify-center gap-2"
                >
                  {t('uploadBtn')}
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href="/summaries"
                  className="px-8 py-3 bg-surface text-ink border border-line-strong font-semibold rounded-btn hover:bg-sunken transition-colors"
                >
                  {tc('library')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="px-8 py-3 bg-accent text-white font-semibold rounded-btn hover:bg-accent-strong transition-colors inline-flex items-center justify-center gap-2"
                >
                  {t('registerBtn')}
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-3 bg-surface text-ink border border-line-strong font-semibold rounded-btn hover:bg-sunken transition-colors"
                >
                  {t('loginBtn')}
                </Link>
              </>
            )}
          </div>

          {/* Free tool - no account required, helps discovery + SEO */}
          <p className="mt-6 text-sm text-ink-faint">
            <Link href="/convert-to-pdf" className="font-medium text-accent hover:text-accent-strong underline underline-offset-2">
              {tc('convertToPdf')}
            </Link>{' '}
            — {tc('convertToPdfDescription')}
          </p>

          {/* Workspace mock */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="bg-surface border border-line rounded-card shadow-pop overflow-hidden text-left">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line bg-sunken">
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              </div>
              <div className="flex">
                <div className="hidden sm:block w-48 border-r border-line p-3 space-y-1">
                  {features.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-btn text-xs font-medium ${
                        i === 1 ? 'bg-accent-soft text-accent-strong' : 'text-ink-soft'
                      }`}
                    >
                      {f.icon}
                      <span className="truncate">{f.title}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-5 space-y-3" aria-hidden="true">
                  <div className="flex justify-end">
                    <div className="bg-accent text-white text-xs rounded-card px-3.5 py-2.5 max-w-[70%]">
                      {t('featureChatDesc')}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-sunken rounded-card px-3.5 py-2.5 max-w-[75%] space-y-1.5">
                      <div className="h-2 w-40 rounded bg-line-strong" />
                      <div className="h-2 w-52 rounded bg-line" />
                      <div className="h-2 w-32 rounded bg-line" />
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-sunken rounded-card px-3.5 py-2.5 max-w-[65%] space-y-1.5">
                      <div className="h-2 w-44 rounded bg-line" />
                      <div className="h-2 w-28 rounded bg-line" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-surface border-y border-line py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-ink">
              {t('featuresTitle')}
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-ink-soft">
              {t('featuresSubtitle')}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-canvas border border-line rounded-card p-5 hover:shadow-card transition-shadow"
              >
                <div className="w-10 h-10 rounded-btn bg-accent-soft text-accent flex items-center justify-center mb-3">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{feature.description}</p>
              </div>
            ))}
            {/* CTA card fills the 8th slot */}
            <Link
              href={status === 'authenticated' ? '/upload' : '/register'}
              className="bg-accent rounded-card p-5 flex flex-col justify-center items-center text-center text-white hover:bg-accent-strong transition-colors"
            >
              <span className="text-2xl mb-2">✨</span>
              <span className="font-semibold">
                {status === 'authenticated' ? t('uploadBtn') : t('registerBtn')}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-ink">
              {t('howItWorks')}
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-ink-soft">
              {t('howItWorksSubtitle')}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-10">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-14 w-14 rounded-full bg-accent-soft text-accent">
                  <span className="text-xl font-bold">{step}</span>
                </div>
                <div className="mt-5">
                  <h3 className="text-lg font-semibold text-ink">{t(`step${step}Title`)}</h3>
                  <p className="mt-2 text-ink-soft">
                    {t(`step${step}Description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing teaser */}
          <div className="mt-20 text-center">
            <p className="text-lg text-ink-soft">{t('pricingTeaser')}</p>
            <Link
              href="/pricing"
              className="mt-4 inline-flex items-center gap-1.5 text-accent hover:text-accent-strong font-semibold"
            >
              {t('pricingCta')}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
