import { SkeletonCard, SkeletonTable, Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* Featured + 3 KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5">
          <SkeletonCard className="min-h-[200px]" />
        </div>
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>

      {/* Chart */}
      <div className="card-static p-5">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-40 mb-6" />
        <Skeleton className="h-[200px] lg:h-[280px] w-full" />
      </div>

      {/* Table */}
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
