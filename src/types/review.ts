export interface Review {
  id: string;
  bookingId: string;
  musicianId: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientImage?: string;
  musicianName: string;
  musicianImage?: string;
  eventType: string;
  eventDate: string;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number; // 1-5 stars
  };
  recentReviews: Review[];
}

export interface ReviewFormData {
  rating: number;
  comment: string;
  eventType: string;
  eventDate: string;
}
