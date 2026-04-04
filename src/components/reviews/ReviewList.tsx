import { useState, useMemo, memo } from 'react';
import { Review } from '@/types/review';
import { ReviewCard } from './ReviewCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReviewListProps {
  reviews: Review[];
  itemsPerPage?: number;
}

export const ReviewList = memo(function ReviewList({ reviews, itemsPerPage = 5 }: ReviewListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = useMemo(
    () => Math.ceil(reviews.length / itemsPerPage),
    [reviews.length, itemsPerPage]
  );
  const currentReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return reviews.slice(startIndex, endIndex);
  }, [reviews, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {currentReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
});
