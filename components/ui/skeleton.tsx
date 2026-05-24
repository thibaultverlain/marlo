/**
 * Skeleton primitives — placeholders animes pendant le chargement.
 * Utilise la classe .skeleton de globals.css (shimmer gradient).
 *
 * Exemples :
 *   <Skeleton className="h-4 w-32" />            // ligne de texte
 *   <Skeleton className="h-10 w-10 rounded-full" /> // avatar
 *   <SkeletonText lines={3} />                    // paragraphe
 *   <SkeletonTable rows={5} cols={4} />           // tableau
 *   <SkeletonCard />                              // card type KPI
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  if (lines === 1) return <Skeleton className={`h-3.5 w-full ${className}`} />;
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card-static p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-32 mt-4" />
      <Skeleton className="h-3 w-24 mt-2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card-static overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--color-bg-raised)] border-b border-[var(--color-border)]">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-2.5 w-16" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} className="px-4 py-3 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, ci) => (
              <Skeleton key={ci} className={`h-3.5 ${ci === 0 ? "w-1/3" : "w-20"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonListItem({ withAvatar = false }: { withAvatar?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-4">
      {withAvatar && <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-md flex-shrink-0" />
    </div>
  );
}
