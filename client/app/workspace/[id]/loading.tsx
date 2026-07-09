import { Skeleton, SkeletonText } from '@/components/ui';

export default function WorkspaceLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 shrink-0 space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="pt-4 space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <Skeleton className="h-8 w-1/3 mb-6" />
          <SkeletonText lines={10} />
        </div>
      </div>
    </div>
  );
}
