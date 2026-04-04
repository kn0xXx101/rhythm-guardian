import { useState } from 'react';
import { Review, ReviewFormData, RatingSummary } from '@/types/review';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewSummary } from '@/components/reviews/ReviewSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

// Mock data - replace with actual API calls
const mockReviews: Review[] = [
  {
    id: '1',
    bookingId: '1',
    musicianId: '1',
    clientId: '1',
    rating: 5,
    comment: 'Amazing performance! The musician was professional and talented.',
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
    clientName: 'John Doe',
    clientImage: '/avatars/john.jpg',
    musicianName: 'Sarah Smith',
    musicianImage: '/avatars/sarah.jpg',
    eventType: 'wedding',
    eventDate: '2024-03-14T18:00:00Z',
  },
  // Add more mock reviews as needed
];

const mockSummary: RatingSummary = {
  averageRating: 4.5,
  totalReviews: 10,
  ratingDistribution: {
    5: 6,
    4: 3,
    3: 1,
    2: 0,
    1: 0,
  },
  recentReviews: mockReviews,
};

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [summary, setSummary] = useState<RatingSummary>(mockSummary);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitReview = async (data: ReviewFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newReview: Review = {
        id: Date.now().toString(),
        bookingId: '1', // Replace with actual booking ID
        musicianId: '1', // Replace with actual musician ID
        clientId: '1', // Replace with actual client ID
        rating: data.rating,
        comment: data.comment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientName: 'Current User', // Replace with actual user name
        clientImage: '/avatars/default.jpg', // Replace with actual user image
        musicianName: 'Sarah Smith', // Replace with actual musician name
        musicianImage: '/avatars/sarah.jpg', // Replace with actual musician image
        eventType: data.eventType,
        eventDate: data.eventDate,
      };

      setReviews((prev) => [newReview, ...prev]);
      setSummary((prev) => ({
        ...prev,
        totalReviews: prev.totalReviews + 1,
        averageRating:
          (prev.averageRating * prev.totalReviews + data.rating) / (prev.totalReviews + 1),
        ratingDistribution: {
          ...prev.ratingDistribution,
          [data.rating]: (prev.ratingDistribution[data.rating] || 0) + 1,
        },
        recentReviews: [newReview, ...prev.recentReviews],
      }));
    } catch (err) {
      setError('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8 animate-fade-in">
      <DashboardHeader
        heading="Reviews"
        text="See what others are saying about our musicians."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Rating Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewSummary summary={summary} />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="reviews">
            <TabsList className="mb-4">
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="write">Write a Review</TabsTrigger>
            </TabsList>

            <TabsContent value="reviews">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <ReviewList reviews={reviews} />
            </TabsContent>

            <TabsContent value="write">
              <Card>
                <CardHeader>
                  <CardTitle>Write a Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReviewForm onSubmit={handleSubmitReview} isLoading={isSubmitting} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
