'use client';

// Flip-card study experience with local "know it / review again" piles.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Award, Layers, RefreshCw, Shuffle } from 'react-feather';
import { Button, Badge } from '@/components/ui';
import ArtifactSection from './ArtifactSection';
import type { WorkspaceData } from './WorkspaceShell';

interface Flashcard {
  front: string;
  back: string;
}

function isPaid(plan: string) {
  return plan === 'trial' || plan === 'standard' || plan === 'premium';
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function Deck({ cards, plan, regenerate }: { cards: Flashcard[]; plan: string; regenerate: () => void }) {
  const t = useTranslations('workspace');
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [toReview, setToReview] = useState<Set<number>>(new Set());

  const finished = position >= order.length;
  const current = finished ? null : cards[order[position]];

  const advance = (knewIt: boolean) => {
    const idx = order[position];
    if (knewIt) {
      setKnown((p) => new Set(p).add(idx));
      setToReview((p) => {
        const n = new Set(p);
        n.delete(idx);
        return n;
      });
    } else {
      setToReview((p) => new Set(p).add(idx));
    }
    setFlipped(false);
    setPosition((p) => p + 1);
  };

  const restart = (onlyReview = false) => {
    const base = onlyReview ? [...toReview] : cards.map((_, i) => i);
    setOrder(base);
    setPosition(0);
    setFlipped(false);
    if (!onlyReview) {
      setKnown(new Set());
      setToReview(new Set());
    }
  };

  const shuffle = () => {
    setOrder(shuffleArray(order.slice(position)));
    setPosition(0);
    setFlipped(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-semibold text-ink">{t('sections.flashcards')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={shuffle} disabled={finished}>
            <Shuffle size={14} />
            {t('flashcardsUi.shuffle')}
          </Button>
          {isPaid(plan) && (
            <Button variant="ghost" size="sm" onClick={regenerate}>
              <RefreshCw size={14} />
              {t('regenerate')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 text-sm text-ink-soft">
        <span>
          {finished
            ? t('flashcardsUi.progress', { current: order.length, total: order.length })
            : t('flashcardsUi.progress', { current: position + 1, total: order.length })}
        </span>
        <span className="flex items-center gap-2">
          <Badge tone="success">{t('flashcardsUi.knownPile')}: {known.size}</Badge>
          <Badge tone="warn">{t('flashcardsUi.reviewPile')}: {toReview.size}</Badge>
        </span>
      </div>

      {finished ? (
        <div className="bg-surface border border-line rounded-card shadow-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <Award size={26} />
          </div>
          <h3 className="text-lg font-semibold text-ink">{t('flashcardsUi.doneTitle')}</h3>
          <p className="mt-1.5 text-sm text-ink-soft">
            {t('flashcardsUi.doneDescription', { known: known.size, total: cards.length })}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => restart(false)}>{t('flashcardsUi.restart')}</Button>
            {toReview.size > 0 && (
              <Button variant="secondary" onClick={() => restart(true)}>
                {t('flashcardsUi.reviewPile')} ({toReview.size})
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Flip card */}
          <button
            onClick={() => setFlipped((f) => !f)}
            className="w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-card"
            style={{ perspective: '1200px' }}
            aria-label={t('flashcardsUi.flip')}
          >
            <div
              className="relative w-full transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                minHeight: '260px',
              }}
            >
              <div
                className="absolute inset-0 bg-surface border border-line rounded-card shadow-card flex flex-col items-center justify-center p-8"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-lg sm:text-xl font-semibold text-ink text-center leading-relaxed">
                  {current!.front}
                </p>
                <span className="absolute bottom-4 text-xs text-ink-faint">{t('flashcardsUi.flip')}</span>
              </div>
              <div
                className="absolute inset-0 bg-accent-soft border border-line rounded-card shadow-card flex flex-col items-center justify-center p-8"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-base sm:text-lg text-ink text-center leading-relaxed">{current!.back}</p>
              </div>
            </div>
          </button>

          <div className="mt-5 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => advance(false)}>
              {t('flashcardsUi.review')}
            </Button>
            <Button onClick={() => advance(true)}>{t('flashcardsUi.know')}</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function FlashcardsTab({
  data,
  onGenerated,
}: {
  data: WorkspaceData;
  onGenerated: (type: string) => void;
}) {
  const t = useTranslations('workspace');

  return (
    <ArtifactSection
      summaryId={data.id}
      type="flashcards"
      exists={data.artifacts.some((a) => a.type === 'flashcards')}
      locked={false}
      icon={<Layers size={22} />}
      emptyTitle={t('empty.flashcardsTitle')}
      emptyDescription={t('empty.flashcardsDescription')}
      sectionLabel={t('sections.flashcards')}
      onGenerated={onGenerated}
    >
      {(content: { cards: Flashcard[] }, regenerate) => (
        <Deck key={content.cards.length + (content.cards[0]?.front ?? '')} cards={content.cards} plan={data.plan} regenerate={regenerate} />
      )}
    </ArtifactSection>
  );
}
