import { RatingSummary } from '@/types/review';
import { Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ReviewSummaryProps {
  summary: RatingSummary;
}

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  const { averageRating, totalReviews, ratingDistribution } = summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
        <div className="flex-1">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.round(averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Based on {totalReviews} reviews</p>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(ratingDistribution)
          .reverse()
          .map(([rating, count]) => {
            const percentage = (count / totalReviews) * 100;
            return (
              <div key={rating} className="flex items-center space-x-2">
                <span className="text-sm w-8">{rating} stars</span>
                <Progress value={percentage} className="flex-1" />
                <span className="text-sm text-muted-foreground w-12">{count}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
