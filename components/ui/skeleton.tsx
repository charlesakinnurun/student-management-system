import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden="true" />;
}

/** Table-shaped loading placeholder used while a list request is in flight. */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton key={columnIndex} className={cn("h-8", columnIndex === 0 ? "flex-[2]" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}
