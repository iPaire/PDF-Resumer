'use client';

// Open exam-style questions with reveal-answer accordions.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { HelpCircle, RefreshCw } from 'react-feather';
import { Button, Badge, Card, CardBody } from '@/components/ui';
import MathText from '@/components/MathText';
import ArtifactSection from './ArtifactSection';
import type { WorkspaceData } from './WorkspaceShell';

interface ImportantQuestion {
  question: string;
  modelAnswer: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

const DIFFICULTY_TONE: Record<string, 'success' | 'warn' | 'danger'> = {
  basic: 'success',
  intermediate: 'warn',
  advanced: 'danger',
};

function isPaid(plan: string) {
  return plan === 'trial' || plan === 'standard' || plan === 'premium';
}

export default function QuestionsTab({
  data,
  onGenerated,
}: {
  data: WorkspaceData;
  onGenerated: (type: string) => void;
}) {
  const t = useTranslations('workspace');
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <ArtifactSection
      summaryId={data.id}
      type="questions"
      exists={data.artifacts.some((a) => a.type === 'questions')}
      locked={!isPaid(data.plan)}
      icon={<HelpCircle size={22} />}
      emptyTitle={t('empty.questionsTitle')}
      emptyDescription={t('empty.questionsDescription')}
      sectionLabel={t('sections.questions')}
      onGenerated={onGenerated}
    >
      {(content: { questions: ImportantQuestion[] }, regenerate) => (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-ink">{t('sections.questions')}</h2>
            <Button variant="ghost" size="sm" onClick={regenerate}>
              <RefreshCw size={14} />
              {t('regenerate')}
            </Button>
          </div>
          <div className="space-y-3">
            {content.questions.map((q, i) => (
              <Card key={i}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-ink leading-relaxed">
                      <span className="text-accent font-semibold mr-1.5">{i + 1}.</span>
                      <MathText text={q.question} />
                    </p>
                    <Badge tone={DIFFICULTY_TONE[q.difficulty] || 'warn'} className="shrink-0 mt-0.5">
                      {t(`questionsUi.${q.difficulty}`)}
                    </Badge>
                  </div>
                  <button
                    onClick={() => setRevealed((p) => ({ ...p, [i]: !p[i] }))}
                    className="mt-3 text-sm font-medium text-accent hover:text-accent-strong cursor-pointer"
                  >
                    {revealed[i] ? t('questionsUi.hideAnswer') : t('questionsUi.showAnswer')}
                  </button>
                  {revealed[i] && (
                    <div className="mt-3 bg-accent-soft rounded-md px-4 py-3 text-sm text-ink leading-relaxed">
                      <MathText text={q.modelAnswer} />
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
