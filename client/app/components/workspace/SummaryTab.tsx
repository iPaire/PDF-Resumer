'use client';

import { useMemo } from 'react';
import MarkdownContent, { formatMarkdownSpacing } from '@/components/MarkdownContent';
import type { WorkspaceData } from './WorkspaceShell';

export default function SummaryTab({ data }: { data: WorkspaceData }) {
  const formatted = useMemo(() => formatMarkdownSpacing(data.content), [data.content]);

  return (
    <div className="bg-surface border border-line rounded-card shadow-card">
      <div className="p-6 sm:p-8">
        <div className="prose max-w-none">
          <MarkdownContent content={formatted} />
        </div>
      </div>
    </div>
  );
}
