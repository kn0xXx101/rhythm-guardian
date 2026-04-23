import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { averageRatingFromReviewList } from '@/lib/review-ratings';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Review {
  id: string;
  rating: number;
  content: string | null;
  created_at: string | null;
  reviewer: {
    full_name: string | null;
    avatar_url?: string | null;
  };
}

interface ReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  musicianId: string;
  musicianName: string;
}

export function ReviewsDialog({
  open,
  onOpenChange,
  musicianId,
  musicianName,
}: ReviewsDialogProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (open) {
      fetchReviews();
    }
  }, [open, musicianId]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          content,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('reviewee_id', musicianId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      if (data && data.length > 0) {
        setAverageRating(averageRatingFromReviewList(data));
      } else {
        setAverageRating(0);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Reviews for {musicianName}</span>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground font-normal">
                  ({reviews.length})
                </span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No reviews yet</p>
              <p className="text-sm">This musician hasn't received any reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {review.reviewer?.avatar_url ? (
                        <img
                          src={review.reviewer.avatar_url}
                          alt={review.reviewer.full_name || 'User'}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-base">
                            {review.reviewer?.full_name || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {review.created_at
                              ? new Date(review.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : 'Date unknown'}
                          </p>
                        </div>
                        {renderStars(review.rating)}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {review.content || 'No review text provided'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
