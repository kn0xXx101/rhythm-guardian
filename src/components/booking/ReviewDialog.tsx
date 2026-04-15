import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  revieweeId: string; // Person being reviewed
  revieweeName: string; // Name of person being reviewed
  reviewerId: string; // Person writing the review
  onSuccess?: () => void; // Callback when review is successfully submitted
}

export function ReviewDialog({
  open,
  onOpenChange,
  bookingId,
  revieweeId,
  revieweeName,
  reviewerId,
  onSuccess,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a star rating',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Review Required',
        description: 'Please write a review',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', reviewerId)
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingReview) {
        toast({
          title: 'Review already submitted',
          description: 'You have already left a review for this booking.',
          variant: 'destructive',
        });
        return;
      }

      // Insert review
      const { error: reviewError } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating,
        content: content.trim(),
      });

      if (reviewError) {
        if (reviewError.code === '23505') {
          toast({
            title: 'Review already submitted',
            description: 'You have already left a review for this booking.',
            variant: 'destructive',
          });
          return;
        }
        throw reviewError;
      }

      // Update reviewee's rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId);

      if (reviews) {
        const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
        const totalReviews = reviews.length;

        await supabase
          .from('profiles')
          .update({
            rating: Number(avgRating.toFixed(2)),
            total_reviews: totalReviews,
          })
          .eq('user_id', revieweeId);
      }

      // Generate star display for notifications
      const starDisplay = '⭐'.repeat(rating);

      // Notify the musician being reviewed
      await supabase.from('notifications').insert({
        user_id: revieweeId,
        type: 'review',
        title: 'New Review Received! ' + starDisplay,
        content: `You received a ${rating}-star review: "${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
        action_url: '/musician/profile',
        read: false,
        priority: 'normal',
        data: {
          bookingId,
          rating,
          reviewerId,
        },
      });

      // Notify all admins about the new review
      const { data: admins } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          user_id: admin.user_id,
          type: 'review' as const,
          title: 'New Review Submitted ' + starDisplay,
          content: `A ${rating}-star review was submitted for ${revieweeName}. Review: "${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
          action_url: '/admin/users',
          read: false,
          priority: 'low' as const,
          data: {
            bookingId,
            rating,
            reviewerId,
            revieweeId,
            revieweeName,
          },
        }));

        await supabase.from('notifications').insert(adminNotifications);
      }

      toast({
        title: 'Review Submitted! ' + starDisplay,
        description: `Thank you for reviewing ${revieweeName}`,
      });

      // Reset form
      setRating(0);
      setContent('');
      onOpenChange(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>
            Share your experience with {revieweeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Rating *</Label>
            <div className="flex gap-3 items-center bg-white dark:bg-gray-900 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full p-1"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-block',
                  }}
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400 drop-shadow-md'
                        : 'fill-gray-200 text-gray-300 hover:fill-gray-300'
                    }`}
                    style={{
                      strokeWidth: 2,
                      display: 'block',
                    }}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm font-medium text-primary bg-primary/10 px-3 py-2 rounded-md">
                {rating === 1 && '⭐ Poor'}
                {rating === 2 && '⭐⭐ Fair'}
                {rating === 3 && '⭐⭐⭐ Good'}
                {rating === 4 && '⭐⭐⭐⭐ Very Good'}
                {rating === 5 && '⭐⭐⭐⭐⭐ Excellent'}
              </p>
            )}
            {rating === 0 && (
              <p className="text-sm text-muted-foreground italic">
                👆 Click on a star to rate
              </p>
            )}
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review" className="text-base font-semibold">Your Review *</Label>
            <Textarea
              id="review"
              placeholder="Tell us about your experience with this musician..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
