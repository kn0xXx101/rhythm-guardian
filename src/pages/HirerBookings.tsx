import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CreditCard, Guitar, MapPin, MessageCircle, Star, Clock, RefreshCcw } from 'lucide-react';
import { useBookingContext } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PaymentModal } from '@/components/booking/PaymentModal';
import { ReviewDialog } from '@/components/booking/ReviewDialog';
import { formatGHSWithSymbol } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { checkAndExpireBookings } from '@/services/booking-expiration';
import { refundTicketingService } from '@/services/refund-ticketing';
import { supabase } from '@/lib/supabase';
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

const HirerBookings = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [selectedRefundBooking, setSelectedRefundBooking] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [existingReviews, setExistingReviews] = useState<Set<string>>(new Set());
  const {
    bookings,
    updateBooking,
    confirmService,
    isLoading,
    error: bookingError,
    refetch,
  } = useBookingContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for expired bookings when component mounts
  useEffect(() => {
    const checkExpiredBookings = async () => {
      const result = await checkAndExpireBookings();
      if (result.success && result.expiredCount > 0) {
        console.log(`Expired ${result.expiredCount} booking(s)`);
        // Refetch bookings to get updated data
        if (refetch) {
          refetch();
        }
      }
    };

    checkExpiredBookings();
  }, [refetch]);

  // Fetch existing reviews to check which reviewees already have reviews from this user
  useEffect(() => {
    const fetchExistingReviews = async () => {
      if (!user?.id) return;

      try {
        const { data: reviews, error } = await supabase
          .from('reviews')
          .select('reviewee_id')
          .eq('reviewer_id', user.id);

        if (error) throw error;

        const reviewedUserIds = new Set(reviews?.map(r => r.reviewee_id) || []);
        setExistingReviews(reviewedUserIds);
      } catch (error) {
        console.error('Error fetching existing reviews:', error);
      }
    };

    fetchExistingReviews();
  }, [user?.id, bookings]); // Re-fetch when bookings change

  const getMapLink = (location?: string) => {
    if (!location) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  // Filter bookings for current user (hirer)
  const userBookings = bookings?.filter((b) => b?.client?.id === user?.id) || [];

  const filteredBookings =
    activeTab === 'all'
      ? userBookings
      : userBookings.filter((booking) => {
          if (activeTab === 'upcoming') return booking.status === 'upcoming' || booking.status === 'pending';
          return booking.status === activeTab;
        });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMessage = (musicianId: string) => {
    navigate(`/hirer/chat?user=${musicianId}`);
  };

  const handleConfirmService = async (bookingId: string) => {
    try {
      await confirmService(bookingId, 'hirer');
      toast({
        title: 'Service Confirmed',
        description: 'You have confirmed that the service was successfully rendered.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to confirm service. Please try again.',
      });
    }
  };

  const handleCancelRequest = async (bookingId: string) => {
    try {
      await updateBooking(bookingId, { status: 'cancelled' });
      toast({
        title: 'Booking cancelled',
        description: `Booking #${bookingId} has been cancelled.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel booking. Please try again.',
      });
    }
  };

  const handleLeaveReview = (booking: any) => {
    setReviewBooking(booking);
    setShowReviewDialog(true);
  };

  const handlePayNow = (booking: any) => {
    // Transform booking data to match PaymentModal expected structure
    const transformedBooking = {
      id: booking.id,
      totalAmount: booking.price,
      depositAmount: booking.price,
      musician: {
        id: booking.musician?.id,
        name: booking.musician?.name || 'Unknown Musician',
        instruments: booking.musician?.instrument ? [booking.musician.instrument] : [],
      },
      event: {
        type: booking.description || 'Event',
        date: booking.date,
        location: booking.location,
      },
    };
    setSelectedBooking(transformedBooking);
    setShowPaymentModal(true);
  };

  const handleRequestRefundClick = (booking: any) => {
    setSelectedRefundBooking(booking);
    setRefundReason('');
  };

  const submitRefundRequest = async () => {
    if (!user?.id || !selectedRefundBooking || !refundReason.trim()) return;

    setIsRefunding(true);
    try {
      const result = await refundTicketingService.createRefundTicket({
        bookingId: selectedRefundBooking.id,
        userId: user.id,
        reason: refundReason.trim(),
        musicianName: selectedRefundBooking.musician?.name
      });

      if (result.success) {
        toast({
          title: 'Refund Request Submitted',
          description: 'A support ticket has been opened for your request. Our team will investigate shortly.',
        });
        setSelectedRefundBooking(null);
        // Refetch bookings to update status
        if (refetch) {
          refetch();
        }
      } else {
        throw new Error(result.error || 'Failed to submit refund request');
      }
    } catch (error) {
      console.error('Error requesting refund:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit refund request. Please contact support.',
      });
    } finally {
      setIsRefunding(false);
    }
  };

  // Show error if there's a booking error
  if (bookingError) {
    return (
      <div className="container mx-auto py-8 space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <div className="text-center py-12">
          <p className="text-destructive">Error loading bookings: {bookingError}</p>
          <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show loading or message if user is not available
  if (!user) {
    return (
      <div className="container mx-auto py-8 space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">My Bookings</h1>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="all">All Bookings</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col md:flex-row border rounded-lg overflow-hidden h-auto md:h-48"
                  >
                    <Skeleton className="md:w-1/5 h-48 md:h-full w-full" />
                    <div className="md:w-3/5 p-6 space-y-4 flex flex-col justify-center">
                      <Skeleton className="h-6 w-3/4" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="md:w-1/5 p-6 border-l flex flex-col justify-center gap-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="overflow-hidden border-muted/40 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-1/5 p-4 flex flex-col items-center justify-center bg-muted/30">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-2 bg-muted">
                          {booking.musician?.image ? (
                            <img
                              src={booking.musician.image}
                              alt={booking.musician?.name || 'Musician'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                              <Guitar className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-medium text-center">
                          {booking.musician?.name || 'Unknown Musician'}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Guitar className="h-3 w-3" />
                          <span className="text-xs">{booking.musician?.instrument || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {booking.musician?.rating && Number(booking.musician.rating) > 0 ? (
                            <>
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium">
                                {Number(booking.musician.rating).toFixed(1)}
                              </span>
                            </>
                          ) : (
                            <>
                              <Star className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">No reviews</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="md:w-3/5 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-lg">
                              {booking.description || 'No description'}
                            </h4>
                            <div className="flex flex-wrap gap-4 mt-2">
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {booking.date
                                    ? (() => {
                                        try {
                                          const date = new Date(booking.date);
                                          if (!isNaN(date.getTime())) {
                                            return date.toLocaleDateString();
                                          }
                                        } catch (e) {
                                          // Ignore error
                                        }
                                        return booking.date || 'Date TBD';
                                      })()
                                    : 'Date TBD'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-4 w-4" />
                                <span>{booking.time || 'Time TBD'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {booking.durationHours ? `${booking.durationHours} hours` : 'Hours TBD'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-4 w-4" />
                                {booking.location ? (
                                  <a
                                    href={getMapLink(booking.location)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline underline-offset-2"
                                  >
                                    {booking.location}
                                  </a>
                                ) : (
                                  <span>Location TBD</span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusBadgeClass(
                                  booking.status || 'pending'
                                )}`}
                              >
                                {booking.status || 'pending'}
                              </span>
                            </div>
                          </div>
                          <div className="sm:text-right">
                            <p className="font-bold text-xl">
                              {formatGHSWithSymbol(booking.price || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {booking.paymentStatus === 'unpaid' ? 'Unpaid' : 
                               booking.paymentStatus === 'paid_to_admin' ? 'Paid' :
                               booking.paymentStatus === 'refunded' ? 'Refunded' :
                               booking.paymentStatus?.replace('_', ' ') || 'Unpaid'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-1/5 p-6 flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l">
                        {booking.paymentStatus === 'unpaid' && (booking.status !== 'expired' && booking.status !== 'cancelled') && (
                          <Button className="w-full" onClick={() => handlePayNow(booking)}>
                            <CreditCard className="h-4 w-4 mr-2" /> Pay Now
                          </Button>
                        )}
                        
                        {/* Show funded status after payment to reassure the hirer */}
                        {(booking.paymentStatus === 'paid_to_admin' || booking.paymentStatus === 'paid') && (booking.status !== 'expired' && booking.status !== 'cancelled' && booking.status !== 'completed') && (
                          <div className="text-center py-2 px-3 bg-blue-50 rounded-md border border-blue-200">
                            <span className="text-xs font-medium text-blue-700 flex items-center justify-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              Funded / Awaiting Service
                            </span>
                          </div>
                        )}
                        
                        {/* Show refund status for expired/cancelled bookings that were paid */}
                        {(booking.status === 'expired' || booking.status === 'cancelled' || booking.status === 'rejected') && 
                         (booking.paymentStatus === 'refunded' || booking.paymentStatus === 'refund_pending') && (
                          <div className={`text-center py-2 px-3 rounded-md border ${booking.paymentStatus === 'refund_pending' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            <span className="text-xs font-medium flex items-center justify-center gap-1">
                              <RefreshCcw className="h-3 w-3" />
                              {booking.paymentStatus === 'refund_pending' ? 'Refund Under Review' : 'Refund Processed'}
                            </span>
                          </div>
                        )}
                        
                        {/* Show manual refund button only if automatic refund didn't trigger */}
                        {(booking.status === 'expired' || booking.status === 'cancelled' || booking.status === 'rejected') && 
                         (booking.paymentStatus === 'paid_to_admin' || booking.paymentStatus === 'service_completed' || booking.paymentStatus === 'paid') && (
                          <Button 
                            variant="outline" 
                            className="w-full text-orange-700 border-orange-700 hover:bg-orange-50"
                            onClick={() => handleRequestRefundClick(booking)}
                          >
                            <RefreshCcw className="h-4 w-4 mr-2" /> Request Refund
                          </Button>
                        )}
                        
                        {(booking.status !== 'expired' && booking.status !== 'cancelled') && (
                          <Button
                            variant={booking.paymentStatus === 'unpaid' ? 'ghost' : 'default'}
                            className="w-full"
                            onClick={() => handleMessage(booking.musician.id)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" /> Message
                          </Button>
                        )}

                        {booking.status === 'upcoming' && (
                          <>
                            {!booking.serviceConfirmedByHirer ? (
                              <Button
                                variant="outline"
                                className="w-full text-green-700 border-green-700 hover:bg-green-50"
                                onClick={() => handleConfirmService(booking.id)}
                              >
                                Complete Service
                              </Button>
                            ) : (
                              <div className="text-center py-2 px-3 bg-green-50 rounded-md border border-green-200">
                                <span className="text-xs font-medium text-green-700 flex items-center justify-center gap-1">
                                  <Star className="h-3 w-3 fill-green-700" />
                                  Confirmed
                                </span>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleCancelRequest(booking.id)}
                            >
                              Cancel Booking
                            </Button>
                          </>
                        )}

                        {booking.status === 'completed' && !existingReviews.has(booking.musician?.id) && (
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => handleLeaveReview(booking)}
                          >
                            Leave Review
                          </Button>
                        )}
                        {booking.status === 'completed' && existingReviews.has(booking.musician?.id) && (
                          <Button
                            variant="ghost"
                            className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled
                          >
                            ✓ Review Submitted
                          </Button>
                        )}
                        {booking.status === 'pending' && (
                          <Button
                            variant="ghost"
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleCancelRequest(booking.id)}
                          >
                            Cancel Request
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No {activeTab === 'all' ? '' : activeTab} bookings found.
                </p>
                <Button className="mt-4" variant="outline" asChild>
                  <a href="/hirer/search">Find Musicians</a>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {selectedBooking && user && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          booking={selectedBooking}
          userId={user.id}
          userEmail={user.email || ''}
          onPaymentSuccess={() => {
            toast({
              title: 'Payment successful',
              description: 'Your payment has been confirmed!',
            });
            setShowPaymentModal(false);
          }}
        />
      )}

      {reviewBooking && user && (
        <ReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          bookingId={reviewBooking.id}
          revieweeId={reviewBooking.musician?.id}
          revieweeName={reviewBooking.musician?.name || 'Musician'}
          reviewerId={user.id}
          onSuccess={() => {
            // Refresh existing reviews to update the UI
            const fetchExistingReviews = async () => {
              try {
                const { data: reviews, error } = await supabase
                  .from('reviews')
                  .select('reviewee_id')
                  .eq('reviewer_id', user.id);

                if (error) throw error;

                const reviewedUserIds = new Set(reviews?.map(r => r.reviewee_id) || []);
                setExistingReviews(reviewedUserIds);
              } catch (error) {
                console.error('Error fetching existing reviews:', error);
              }
            };
            fetchExistingReviews();
          }}
        />
      )}

      {/* Refund Request Dialog */}
      <Dialog open={!!selectedRefundBooking} onOpenChange={(open) => !open && setSelectedRefundBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request a Refund</DialogTitle>
            <DialogDescription>
              Please explain why you are requesting a refund for this booking. This will create a support ticket for our team to investigate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Reason for refund</Label>
              <Textarea
                id="reason"
                placeholder="e.g. The musician did not show up for the event..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="bg-muted p-3 text-xs rounded-md text-muted-foreground">
              Note: To prevent fraud and ensure fairness, all refund requests are reviewed by our support staff to confirm whether services were rendered. 
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRefundBooking(null)}>
              Cancel
            </Button>
            <Button onClick={submitRefundRequest} disabled={!refundReason.trim() || isRefunding}>
              {isRefunding ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HirerBookings;
