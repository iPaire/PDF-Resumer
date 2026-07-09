'use client';

// Multiple-choice quiz. Uses the quiz generated at upload time (File.quiz)
// when available; otherwise offers on-demand generation. Both sources share
// the same {question, options, correctAnswer} shape.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Award, CheckSquare, RefreshCw } from 'react-feather';
import { Button, Card, CardBody } from '@/components/ui';
import ArtifactSection from './ArtifactSection';
import type { WorkspaceData, WorkspaceQuizQuestion } from './WorkspaceShell';

function isPaid(plan: string) {
  return plan === 'trial' || plan === 'standard' || plan === 'premium';
}

function QuizPlayer({
  questions,
  onRegenerate,
}: {
  questions: WorkspaceQuizQuestion[];
  onRegenerate?: () => void;
}) {
  const t = useTranslations('workspace');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0),
    0
  );
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  const optionClasses = (qIdx: number, oIdx: number) => {
    const selected = answers[qIdx] === oIdx;
    if (!submitted) {
      return selected
        ? 'border-accent bg-accent-soft text-ink'
        : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-sunken';
    }
    const correct = questions[qIdx].correctAnswer === oIdx;
    if (correct) return 'border-success bg-success-soft text-ink';
    if (selected) return 'border-danger bg-danger-soft text-ink';
    return 'border-line bg-surface text-ink-faint';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-semibold text-ink">{t('sections.quiz')}</h2>
        {onRegenerate && (
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            <RefreshCw size={14} />
            {t('quizUi.newQuiz')}
          </Button>
        )}
      </div>

      {submitted && (
        <div className="mb-6 bg-surface border border-line rounded-card shadow-card p-6 text-center">
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
            score >= questions.length / 2 ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent'
          }`}>
            <Award size={26} />
          </div>
          <p className="text-lg font-semibold text-ink">
            {t('quizUi.score', { score, total: questions.length })}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
          >
            {t('quizUi.retake')}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, qIdx) => (
          <Card key={qIdx}>
            <CardBody>
              <p className="font-medium text-ink leading-relaxed mb-3">
                <span className="text-accent font-semibold mr-1.5">{qIdx + 1}.</span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((option, oIdx) => (
                  <button
                    key={oIdx}
                    disabled={submitted}
                    onClick={() => setAnswers((p) => ({ ...p, [qIdx]: oIdx }))}
                    className={`w-full text-left px-4 py-2.5 rounded-btn border text-sm transition-colors cursor-pointer disabled:cursor-default ${optionClasses(qIdx, oIdx)}`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + oIdx)}.</span>
                    {option}
                  </button>
                ))}
              </div>
              {submitted && q.explanation && (
                <div className="mt-3 bg-sunken rounded-md px-4 py-3 text-sm text-ink-soft leading-relaxed">
                  <span className="font-medium text-ink">{t('quizUi.explanation')}:</span> {q.explanation}
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {!submitted && (
        <div className="mt-6 flex justify-center">
          <Button size="lg" disabled={!allAnswered} onClick={() => setSubmitted(true)}>
            {t('quizUi.check')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function QuizTab({
  data,
  onGenerated,
}: {
  data: WorkspaceData;
  onGenerated: (type: string) => void;
}) {
  const t = useTranslations('workspace');
  const [useUploadQuiz, setUseUploadQuiz] = useState(
    () => (data.uploadQuiz?.length ?? 0) > 0 && !data.artifacts.some((a) => a.type === 'quiz')
  );
  const paid = isPaid(data.plan);

  // The quiz generated at upload time is shown to any plan that has it
  // (it was already paid for); fresh generation is gated like other artifacts.
  if (useUploadQuiz && data.uploadQuiz) {
    return (
      <QuizPlayer
        questions={data.uploadQuiz}
        onRegenerate={paid ? () => setUseUploadQuiz(false) : undefined}
      />
    );
  }

  return (
    <ArtifactSection
      summaryId={data.id}
      type="quiz"
      exists={data.artifacts.some((a) => a.type === 'quiz')}
      locked={!paid}
      icon={<CheckSquare size={22} />}
      emptyTitle={t('empty.quizTitle')}
      emptyDescription={t('empty.quizDescription')}
      sectionLabel={t('sections.quiz')}
      onGenerated={onGenerated}
    >
      {(content: { questions: WorkspaceQuizQuestion[] }, regenerate) => (
        <QuizPlayer questions={content.questions} onRegenerate={paid ? regenerate : undefined} />
      )}
    </ArtifactSection>
  );
}
