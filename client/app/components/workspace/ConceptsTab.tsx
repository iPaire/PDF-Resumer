'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Key, RefreshCw } from 'react-feather';
import { Button, Card, CardBody } from '@/components/ui';
import ArtifactSection from './ArtifactSection';
import type { WorkspaceData } from './WorkspaceShell';

interface KeyConcept {
  term: string;
  definition: string;
  whyItMatters: string;
  example?: string;
}

function isPaid(plan: string) {
  return plan === 'trial' || plan === 'standard' || plan === 'premium';
}

export default function ConceptsTab({
  data,
  onGenerated,
}: {
  data: WorkspaceData;
  onGenerated: (type: string) => void;
}) {
  const t = useTranslations('workspace');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <ArtifactSection
      summaryId={data.id}
      type="concepts"
      exists={data.artifacts.some((a) => a.type === 'concepts')}
      locked={false}
      icon={<Key size={22} />}
      emptyTitle={t('empty.conceptsTitle')}
      emptyDescription={t('empty.conceptsDescription')}
      sectionLabel={t('sections.concepts')}
      onGenerated={onGenerated}
    >
      {(content: { concepts: KeyConcept[] }, regenerate) => (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-ink">{t('sections.concepts')}</h2>
            {isPaid(data.plan) && (
              <Button variant="ghost" size="sm" onClick={regenerate}>
                <RefreshCw size={14} />
                {t('regenerate')}
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {content.concepts.map((c, i) => (
              <Card key={i} hoverable>
                <CardBody>
                  <h3 className="font-semibold text-ink">{c.term}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{c.definition}</p>
                  {c.whyItMatters && (
                    <p className="mt-3 text-sm text-accent-strong bg-accent-soft rounded-md px-3 py-2">
                      <span className="font-medium">{t('conceptsUi.whyItMatters')}:</span> {c.whyItMatters}
                    </p>
                  )}
                  {c.example && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}
                        className="text-sm font-medium text-ink-soft hover:text-ink cursor-pointer"
                      >
                        {t('conceptsUi.example')} {expanded[i] ? '▾' : '▸'}
                      </button>
                      {expanded[i] && (
                        <p className="mt-1.5 text-sm text-ink-soft bg-sunken rounded-md px-3 py-2">{c.example}</p>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </ArtifactSection>
  );
}
