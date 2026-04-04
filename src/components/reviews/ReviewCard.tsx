import { memo } from 'react';
import { Review } from '@/types/review';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: Review;
}

export const ReviewCard = memo(function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center space-x-4 pb-2">
        <Avatar>
          <AvatarImage src={review.clientImage} alt={review.clientName} />
          <AvatarFallback>{review.clientName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{review.clientName}</h4>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < review.rating
                    ? 'fill-warning text-warning'
                    : 'fill-muted text-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {review.eventType} • {new Date(review.eventDate).toLocaleDateString()}
          </p>
          <p className="text-sm">{review.comment}</p>
        </div>
      </CardContent>
    </Card>
  );
});
