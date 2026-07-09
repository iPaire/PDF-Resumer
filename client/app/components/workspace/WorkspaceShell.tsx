'use client';

// The learning workspace layout: desktop sidebar / mobile pill bar with the
// seven learning sections, plus the active tab content. Section state lives
// in the ?tab= search param so every section is deep-linkable.
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  FileText,
  MessageCircle,
  Key,
  CheckSquare,
  Layers,
  HelpCircle,
  Edit3,
  ArrowLeft,
  Printer,
} from 'react-feather';
import { Badge } from '@/components/ui';
import SummaryTab from './SummaryTab';
import ConceptsTab from './ConceptsTab';
import FlashcardsTab from './FlashcardsTab';
import QuestionsTab from './QuestionsTab';
import NotesTab from './NotesTab';
import QuizTab from './QuizTab';
import ChatTab from './ChatTab';

export interface WorkspaceQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface WorkspaceData {
  id: string;
  title: string;
  content: string;
  language: string;
  createdAt: string;
  fileName: string | null;
  pages: number | null;
  uploadQuiz: WorkspaceQuizQuestion[] | null;
  hasDocumentText: boolean;
  artifacts: { type: string; updatedAt: string }[];
  chatCount: number;
  plan: string;
}

export type SectionId = 'summary' | 'chat' | 'concepts' | 'quiz' | 'flashcards' | 'questions' | 'notes';

const SECTION_IDS: SectionId[] = ['summary', 'chat', 'concepts', 'quiz', 'flashcards', 'questions', 'notes'];

const SECTION_ICONS: Record<SectionId, React.ComponentType<{ className?: string; size?: number }>> = {
  summary: FileText,
  chat: MessageCircle,
  concepts: Key,
  quiz: CheckSquare,
  flashcards: Layers,
  questions: HelpCircle,
  notes: Edit3,
};

// Which plans can use which section (mirrors lib/workspace-access.ts, which
// stays authoritative server-side).
function isLockedForPlan(plan: string, section: SectionId): boolean {
  const paid = plan === 'trial' || plan === 'standard' || plan === 'premium';
  if (paid) return false;
  return section === 'quiz' || section === 'questions' || section === 'notes';
}

export default function WorkspaceShell({ data }: { data: WorkspaceData }) {
  const t = useTranslations('workspace');
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab') as SectionId | null;
  const initialTab: SectionId = tabParam && SECTION_IDS.includes(tabParam) ? tabParam : 'summary';
  const [active, setActive] = useState<SectionId>(initialTab);

  // Which artifact types already exist (drives the status dots); updated live
  // as the user generates content.
  const [generated, setGenerated] = useState<Set<string>>(
    () => new Set(data.artifacts.map((a) => a.type))
  );
  const markGenerated = useCallback((type: string) => {
    setGenerated((prev) => new Set(prev).add(type));
  }, []);

  const selectTab = (id: SectionId) => {
    setActive(id);
    router.replace(`/workspace/${data.id}?tab=${id}`, { scroll: false });
  };

  const hasStatus = (id: SectionId): boolean => {
    if (id === 'summary') return true;
    if (id === 'chat') return data.chatCount > 0;
    if (id === 'quiz') return generated.has('quiz') || (data.uploadQuiz?.length ?? 0) > 0;
    return generated.has(id);
  };

  const dateLabel = useMemo(
    () => new Date(data.createdAt).toLocaleDateString(),
    [data.createdAt]
  );

  const navItems = SECTION_IDS.map((id) => {
    const Icon = SECTION_ICONS[id];
    const isActive = active === id;
    const locked = isLockedForPlan(data.plan, id);
    return (
      <button
        key={id}
        onClick={() => selectTab(id)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-btn text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
          isActive
            ? 'bg-accent-soft text-accent-strong'
            : 'text-ink-soft hover:bg-sunken hover:text-ink'
        }`}
      >
        <Icon size={17} className="shrink-0" />
        <span className="flex-1 min-w-0 truncate">{t(`sections.${id}`)}</span>
        {locked ? (
          <span className="text-[10px] uppercase font-semibold text-ink-faint">PRO</span>
        ) : (
          hasStatus(id) && <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
        )}
      </button>
    );
  });

  const content = (() => {
    switch (active) {
      case 'summary':
        return <SummaryTab data={data} />;
      case 'chat':
        return <ChatTab data={data} />;
      case 'concepts':
        return <ConceptsTab data={data} onGenerated={markGenerated} />;
      case 'quiz':
        return <QuizTab data={data} onGenerated={markGenerated} />;
      case 'flashcards':
        return <FlashcardsTab data={data} onGenerated={markGenerated} />;
      case 'questions':
        return <QuestionsTab data={data} onGenerated={markGenerated} />;
      case 'notes':
        return <NotesTab data={data} onGenerated={markGenerated} />;
    }
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        {/* Sidebar (desktop) / header (mobile) */}
        <aside className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-20">
            <h1 className="text-lg font-semibold text-ink leading-snug break-words">{data.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {data.pages != null && <Badge>{data.pages} {t('pages')}</Badge>}
              <Badge>{data.language.toUpperCase()}</Badge>
              <Badge>{dateLabel}</Badge>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex flex-col gap-1 mt-6" aria-label="Workspace sections">
              {navItems}
            </nav>

            {/* Mobile nav: horizontal pills */}
            <nav
              className="lg:hidden flex gap-1.5 mt-4 overflow-x-auto pb-2 -mx-4 px-4"
              aria-label="Workspace sections"
            >
              {navItems.map((item, i) => (
                <div key={SECTION_IDS[i]} className="shrink-0">
                  {item}
                </div>
              ))}
            </nav>

            <div className="hidden lg:flex flex-col gap-1 mt-8 pt-5 border-t border-line">
              <Link
                href="/summaries"
                className="flex items-center gap-2 px-3 py-2 rounded-btn text-sm text-ink-soft hover:bg-sunken hover:text-ink transition-colors"
              >
                <ArrowLeft size={15} />
                {t('backToLibrary')}
              </Link>
              <Link
                href={`/summaries/${data.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-btn text-sm text-ink-soft hover:bg-sunken hover:text-ink transition-colors"
              >
                <Printer size={15} />
                {t('printView')}
              </Link>
            </div>
          </div>
        </aside>

        {/* Active section */}
        <div className="flex-1 min-w-0">{content}</div>
      </div>
    </div>
  );
}
