'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import MarkdownContent, { formatMarkdownSpacing } from '@/components/MarkdownContent';
import type { WorkspaceData } from './WorkspaceShell';

export default function SummaryTab({ data }: { data: WorkspaceData }) {
  const t = useTranslations('workspace');
  const formatted = useMemo(() => formatMarkdownSpacing(data.content), [data.content]);

  return (
    <div className="space-y-6">
      {/* Diagram pages extracted from the original document */}
      {data.diagrams.length > 0 && (
        <div className="bg-surface border border-line rounded-card shadow-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink mb-3">{t('diagramsTitle')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.diagrams.map((d) => (
              <a
                key={d.page}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border border-line rounded-btn overflow-hidden bg-sunken hover:shadow-pop hover:-translate-y-0.5 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.url}
                  alt={t('diagramsPage', { page: d.page })}
                  loading="lazy"
                  className="w-full aspect-[3/4] object-cover object-top bg-white"
                />
                <span className="block px-2 py-1.5 text-xs text-ink-soft group-hover:text-ink text-center">
                  {t('diagramsPage', { page: d.page })}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface border border-line rounded-card shadow-card">
        <div className="p-6 sm:p-8">
          <div className="prose max-w-none">
            <MarkdownContent content={formatted} />
          </div>
        </div>
      </div>
    </div>
  );
}
