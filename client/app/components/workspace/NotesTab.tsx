'use client';

// Condensed AI revision notes, rendered as markdown with copy/print actions.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Edit3, Copy, Printer, RefreshCw } from 'react-feather';
import { Button } from '@/components/ui';
import MarkdownContent from '@/components/MarkdownContent';
import ArtifactSection from './ArtifactSection';
import type { WorkspaceData } from './WorkspaceShell';

function isPaid(plan: string) {
  return plan === 'trial' || plan === 'standard' || plan === 'premium';
}

export default function NotesTab({
  data,
  onGenerated,
}: {
  data: WorkspaceData;
  onGenerated: (type: string) => void;
}) {
  const t = useTranslations('workspace');
  const [copied, setCopied] = useState(false);

  const copy = async (markdown: string) => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <ArtifactSection
      summaryId={data.id}
      type="notes"
      exists={data.artifacts.some((a) => a.type === 'notes')}
      locked={!isPaid(data.plan)}
      icon={<Edit3 size={22} />}
      emptyTitle={t('empty.notesTitle')}
      emptyDescription={t('empty.notesDescription')}
      sectionLabel={t('sections.notes')}
      onGenerated={onGenerated}
    >
      {(content: { markdown: string }, regenerate) => (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-semibold text-ink">{t('sections.notes')}</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => copy(content.markdown)}>
                <Copy size={14} />
                {copied ? t('notesUi.copied') : t('notesUi.copy')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.print()}>
                <Printer size={14} />
                {t('notesUi.print')}
              </Button>
              <Button variant="ghost" size="sm" onClick={regenerate}>
                <RefreshCw size={14} />
                {t('regenerate')}
              </Button>
            </div>
          </div>
          <div className="bg-surface border border-line rounded-card shadow-card p-6 sm:p-8">
            <div className="prose max-w-none">
              <MarkdownContent content={content.markdown} />
            </div>
          </div>
        </div>
      )}
    </ArtifactSection>
  );
}
