import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardSkeleton({ className, ...props }: CardSkeletonProps) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props}>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-2 pt-4">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
