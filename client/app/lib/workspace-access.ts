// lib/workspace-access.ts - Single source of truth for which learning
// workspace features each subscription plan can use, and at what size.
//
// Free users deliberately SEE every section (locked ones show an upgrade CTA)
// so the product's full value stays discoverable.

export const ARTIFACT_TYPES = ['concepts', 'flashcards', 'questions', 'notes', 'quiz'] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export type WorkspaceFeature = ArtifactType | 'chat';

export function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as readonly string[]).includes(value);
}

function isPaid(plan: string | null | undefined): boolean {
  return plan === 'trial' || plan === 'standard' || plan === 'premium';
}

/** Which workspace features a plan can generate/use at all. */
export function canUseFeature(plan: string | null | undefined, feature: WorkspaceFeature): boolean {
  if (isPaid(plan)) return true;
  // Free plan: summary (always available), concepts, flashcards and a
  // limited chat. Quiz, questions and notes are visible but locked.
  return feature === 'concepts' || feature === 'flashcards' || feature === 'chat';
}

/** Regenerating an existing artifact (force=true) is paid-only. */
export function canRegenerate(plan: string | null | undefined): boolean {
  return isPaid(plan);
}

/** Max user messages per document chat. Infinity for paid plans. */
export function chatMessageLimit(plan: string | null | undefined): number {
  return isPaid(plan) ? Infinity : 10;
}

export interface ArtifactSizes {
  flashcards: number;
  questions: number;
  quiz: number;
  concepts: number;
}

/** How many items each generated artifact contains, by plan. */
export function artifactSizes(plan: string | null | undefined): ArtifactSizes {
  if (isPaid(plan)) {
    return { flashcards: 25, questions: 12, quiz: 12, concepts: 15 };
  }
  return { flashcards: 10, questions: 6, quiz: 5, concepts: 10 };
}
