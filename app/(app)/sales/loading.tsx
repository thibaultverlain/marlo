import { SkeletonTable, Skeleton } from "@/components/ui/skeleton";

export default function SalesLoading() {
  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <SkeletonTable rows={10} cols={5} />
    </div>
  );
}
