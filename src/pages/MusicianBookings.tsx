import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, MessageCircle, Check, X, CreditCard, Clock, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBookingContext } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatGHSWithSymbol } from '@/lib/currency';
import { useNavigate } from 'react-router-dom';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ReviewDialog } from '@/components/booking/ReviewDialog';
import { checkAndExpireBookings } from '@/services/booking-expiration';
import { supabase } from '@/lib/supabase';
import {
  isBookingEventWindowPast,
  isWithinPostServiceConfirmationWindow,
} from '@/utils/booking-event-window';

const MusicianBookings = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const {
    bookings,
    updateBooking,
    confirmService,
    isLoading,
    refetch,
  } = useBookingContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkExpiredBookings = async () => {
      const result = await checkAndExpireBookings();
      if (result.success && refetch) {
        await refetch({ silent: true });
      }
    };

    checkExpiredBookings();
  }, [refetch]);

  useEffect(() => {
    const fetchReviewedBookings = async () => {
      if (!user?.id) return;

      try {
        const { data: reviews, error } = await supabase
          .from('reviews')
          .select('booking_id')
          .eq('reviewer_id', user.id);

        if (error) throw error;

        const ids = new Set(
          (reviews?.map((r) => r.booking_id).filter(Boolean) as string[]) || []
        );
        setReviewedBookingIds(ids);
      } catch (error) {
        console.error('Error fetching reviews for bookings:', error);
      }
    };

    fetchReviewedBookings();
  }, [user?.id, bookings]);

  // Filter bookings for current musician
  const musicianBookings = bookings.filter((b) => b.musician.id === user?.id);

  const filteredBookings =
    activeTab === 'all'
      ? musicianBookings
      : musicianBookings.filter((booking) => {
          if (activeTab === 'upcoming') return booking.status === 'upcoming' || booking.status === 'accepted';
          return booking.status === activeTab;
        });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleConfirmService = async (bookingId: string) => {
    try {
      await confirmService(bookingId, 'musician');
      toast({
        title: 'Service Confirmed',
        description: 'You have confirmed that the service has been rendered.',
      });
      void refetch({ silent: true });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to confirm service. Please try again.',
      });
    }
  };

  const handleAccept = async (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking && isBookingEventWindowPast(booking.date, booking.durationHours)) {
      toast({
        variant: 'destructive',
        title: 'Event time has passed',
        description: 'This booking can no longer be accepted. It should move to expired.',
      });
      return;
    }
    try {
      await updateBooking(bookingId, { status: 'upcoming' });
      const booking = bookings.find((b) => b.id === bookingId);
      toast({
        title: 'Booking Accepted',
        description: `You've accepted ${booking?.client.name}'s booking request for ${booking?.date}.`,
      });
      void refetch({ silent: true });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept booking. Please try again.',
      });
    }
  };

  const handleDecline = async (bookingId: string) => {
    try {
      await updateBooking(bookingId, { status: 'cancelled' });
      const booking = bookings.find((b) => b.id === bookingId);
      toast({
        title: 'Booking Declined',
        description: `You've declined ${booking?.client.name}'s booking request.`,
        variant: 'destructive',
      });
      void refetch({ silent: true });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to decline booking. Please try again.',
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await updateBooking(bookingId, { status: 'cancelled' });
      toast({
        title: 'Booking Cancelled',
        description: `You've cancelled the booking.`,
        variant: 'destructive',
      });
      void refetch({ silent: true });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel booking. Please try again.',
      });
    }
  };

  const handleMessage = (clientId: string) => {
    navigate(`/musician/chat?user=${clientId}`);
  };

  const formatBookingDate = (date: string) => {
    if (!date) return 'Date TBD';
    try {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString();
      }
    } catch {
      return date;
    }
    return date;
  };

  const getMapLink = (location?: string) => {
    if (!location) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  const buildCalendarLink = (booking: any) => {
    if (!booking.date) return '';
    const start = new Date(booking.date);
    if (isNaN(start.getTime())) return '';
    const durationHours = booking.durationHours || 1;
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    const formatGoogleDate = (value: Date) =>
      value.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const dates = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;
    const text = encodeURIComponent(`Booking with ${booking.client?.name || 'Client'}`);
    const details = encodeURIComponent(booking.description || 'Booking');
    const location = encodeURIComponent(booking.location || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
  };

  const paymentStatusLabel = (ps: string | undefined) => {
    if (ps === 'unpaid') return 'Unpaid';
    if (ps === 'paid_to_admin' || ps === 'paid') return 'Escrow (paid to platform)';
    return ps?.replace(/_/g, ' ') || 'Unpaid';
  };

  return (
    <div className="container mx-auto max-w-full py-6 sm:py-8 space-y-6 animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold">My Bookings</h1>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 -mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto min-h-10 w-max flex-nowrap gap-1 justify-start sm:w-full sm:flex-wrap">
            <TabsTrigger value="all">All Bookings</TabsTrigger>
            <TabsTrigger value="pending">Booking Requests</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Past Bookings</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab}>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading bookings...</p>
              </div>
            ) : filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => {
                const eventEnded = isBookingEventWindowPast(booking.date, booking.durationHours);
                const withinConfirmWindow = isWithinPostServiceConfirmationWindow(
                  booking.date,
                  booking.durationHours
                );
                const isFunded =
                  booking.paymentStatus === 'paid_to_admin' || booking.paymentStatus === 'paid';
                const canConfirmRendering =
                  booking.status === 'upcoming' ||
                  (booking.status === 'accepted' && isFunded) ||
                  (booking.status === 'expired' && isFunded && withinConfirmWindow);
                const calendarLink = buildCalendarLink(booking);
                const showCalendar =
                  calendarLink &&
                  booking.status !== 'expired' &&
                  booking.status !== 'cancelled' &&
                  booking.status !== 'rejected';
                const cardTone =
                  booking.status === 'expired'
                    ? 'border-amber-900/40 bg-amber-950/10'
                    : booking.status === 'cancelled'
                      ? 'border-destructive/30 bg-destructive/[0.06]'
                      : 'border-border';
                return (
                <Card
                  key={booking.id}
                  className={`overflow-hidden shadow-sm md:hover:shadow-lg md:hover:scale-[1.01] transition-all duration-300 group border-2 touch-manipulation ${cardTone}`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-1/5 p-4 flex flex-col items-center justify-center bg-muted/30 group-hover:bg-muted/50 transition-colors">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-2 ring-2 ring-transparent group-hover:ring-primary transition-all duration-300">
                          <OptimizedImage
                            src={booking.client.image}
                            alt={booking.client.name}
                            className="w-full h-full object-cover rounded-full md:group-hover:scale-110 transition-transform duration-300"
                            fallbackSrc="/placeholder.svg"
                          />
                        </div>
                        <h3 className="font-medium text-center group-hover:text-primary transition-colors">
                          {booking.client.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">Client</span>
                        </div>
                      </div>

                      <div className="md:w-3/5 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {booking.description}
                            </h4>
                            <div className="flex flex-wrap gap-4 mt-2">
                              <div className="flex items-center gap-1 text-sm group-hover:text-primary/80 transition-colors">
                                <Calendar className="h-4 w-4" />
                                <span>{formatBookingDate(booking.date)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm group-hover:text-primary/80 transition-colors">
                                <Clock className="h-4 w-4" />
                                <span>{booking.time || 'Time TBD'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm group-hover:text-primary/80 transition-colors">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {booking.durationHours ? `${booking.durationHours} hours` : 'Hours TBD'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm group-hover:text-primary/80 transition-colors">
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
                              <div className="flex items-center gap-1 text-sm group-hover:text-primary/80 transition-colors">
                                <CreditCard className="h-4 w-4" />
                                <span className="font-medium">
                                  {paymentStatusLabel(booking.paymentStatus)}
                                </span>
                              </div>
                              {booking.payoutStatus && (
                                <div className="flex items-center gap-1 text-xs">
                                  <span
                                    className={
                                      booking.payoutStatus === 'released'
                                        ? 'text-green-600'
                                        : 'text-yellow-600'
                                    }
                                  >
                                    {booking.payoutStatus === 'released'
                                      ? 'Payout Released'
                                      : 'Payout Pending'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusBadgeClass(
                                  booking.status
                                )}`}
                              >
                                {booking.status}
                              </span>
                            </div>
                          </div>
                          <div className="sm:text-right">
                            <p className="font-bold text-xl group-hover:text-primary transition-colors">
                              {formatGHSWithSymbol(booking.price)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-1/5 p-6 flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l">
                        {(booking.paymentStatus === 'paid_to_admin' || booking.paymentStatus === 'paid') &&
                          booking.status !== 'expired' &&
                          booking.status !== 'cancelled' && (
                          <Button
                            className="w-full md:hover:scale-105 transition-transform duration-200 touch-manipulation"
                            onClick={() => handleMessage(booking.client.id)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" /> Message
                          </Button>
                        )}
                        {showCalendar ? (
                          <Button variant="ghost" className="w-full" asChild>
                            <a href={calendarLink} target="_blank" rel="noreferrer">
                              <Calendar className="h-4 w-4 mr-2 inline" />
                              Add to Calendar
                            </a>
                          </Button>
                        ) : (
                          <Button variant="ghost" className="w-full" disabled>
                            Add to Calendar
                          </Button>
                        )}
                        {booking.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              className="w-full text-green-700 hover:text-green-800 hover:bg-green-50"
                              onClick={() => handleAccept(booking.id)}
                            >
                              <Check className="h-4 w-4 mr-2" /> Accept
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDecline(booking.id)}
                            >
                              <X className="h-4 w-4 mr-2" /> Decline
                            </Button>
                          </>
                        )}
                        {canConfirmRendering && (
                          <>
                            {!booking.serviceConfirmedByMusician ? (
                              eventEnded ? (
                              <Button
                                variant="outline"
                                className="w-full text-green-700 border-green-700 hover:bg-green-50"
                                onClick={() => handleConfirmService(booking.id)}
                              >
                                Confirm Rendering
                              </Button>
                              ) : (
                                <div className="text-center text-xs text-muted-foreground py-2 px-2 rounded-md border border-dashed border-muted-foreground/30">
                                  Confirm Rendering unlocks after the scheduled end time for this booking.
                                </div>
                              )
                            ) : (
                              <div className="text-center py-2 px-3 bg-green-50 rounded-md border border-green-200">
                                <span className="text-xs font-medium text-green-700 flex items-center justify-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Rendered
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {booking.status === 'completed' && (
                          <>
                            <div className="text-center py-2 px-3 bg-green-100 rounded-md mb-2">
                              <span className="text-xs font-bold text-green-800 uppercase tracking-wider">
                                Completed
                              </span>
                            </div>
                            {!reviewedBookingIds.has(booking.id) ? (
                              <Button
                                variant="outline"
                                className="w-full text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                onClick={() => {
                                  setSelectedBookingForReview(booking);
                                  setReviewDialogOpen(true);
                                }}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Leave a Review
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full text-green-600 border-green-600 hover:bg-green-50"
                                disabled
                              >
                                ✓ Review Submitted
                              </Button>
                            )}
                          </>
                        )}
                        {booking.status === 'cancelled' && (
                          <Button variant="ghost" className="w-full text-muted-foreground" disabled>
                            Cancelled
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No {activeTab === 'all' ? '' : activeTab} bookings found.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      {selectedBookingForReview && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          bookingId={selectedBookingForReview.id}
          revieweeId={selectedBookingForReview.client.id}
          revieweeName={selectedBookingForReview.client.name}
          reviewerId={user?.id || ''}
          onSuccess={() => void refetch({ silent: true })}
        />
      )}
    </div>
  );
};

export default MusicianBookings;
