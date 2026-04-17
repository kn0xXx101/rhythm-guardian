import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Calendar,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatGHSWithSymbol } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { HirerOverview } from '@/components/dashboard/HirerOverview';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { ProfileCompletionBanner } from '@/components/profile/ProfileCompletionBanner';

interface RecentBooking {
  id: string;
  musician_name: string;
  event_date: string;
  status: string;
  total_amount: number;
}

const HirerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(
            'id, event_date, status, total_amount, price, musician:profiles(full_name)'
          )
          .eq('hirer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          // If table doesn't exist, just show empty state
          if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
            console.log('Bookings table not yet created, showing empty state');
            setRecentBookings([]);
            return;
          }
          throw error;
        }

        const recent =
          bookings?.slice(0, 5).map((booking: any) => ({
            id: booking.id,
            musician_name: booking.musician?.full_name || 'Unknown',
            event_date: booking.event_date,
            status: booking.status,
            total_amount: booking.total_amount ?? booking.price ?? 0,
          })) || [];

        setRecentBookings(recent);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        // Only show toast for real errors, not missing tables
        if (!error.message?.includes('does not exist') && !error.message?.includes('relation')) {
          toast({
            title: 'Error',
            description: 'Failed to load dashboard data',
            variant: 'destructive',
          });
        }
        setRecentBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, toast]);

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }
    > = {
      pending: { variant: 'default', icon: Clock },
      confirmed: { variant: 'outline', icon: CheckCircle },
      completed: { variant: 'secondary', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: XCircle },
    };

    const config = variants[status] || { variant: 'outline', icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-8 animate-slide-in">
      <DashboardHeader
        heading="Hirer Dashboard"
        text="Welcome back! Manage your bookings and find talented musicians."
        action={{
          label: "Find Musicians",
          href: "/hirer/search",
          icon: Search
        }}
      />

      <ProfileCompletionBanner />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} className="h-32" />
            ))}
          </div>
          <CardSkeleton className="h-96" />
        </div>
      ) : (
        <>
          <HirerOverview />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Link to="/hirer/search" className="block h-full cursor-pointer">
              <Card variant="gradient-border" className="h-full group hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:from-blue-600 group-hover:to-blue-700 transition-colors duration-200">
                    <Search className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">Find Musicians</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Search for talented musicians by location, instrument type, and availability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    className="w-full justify-start pl-0 group-hover:text-primary transition-colors duration-200"
                  >
                    Browse Musicians <TrendingUp className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link to="/hirer/bookings" className="block h-full cursor-pointer">
              <Card variant="gradient-border" className="h-full group hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-3 group-hover:from-green-600 group-hover:to-green-700 transition-colors duration-200">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">Manage Bookings</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    View and manage your upcoming and past bookings with musicians
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    className="w-full justify-start pl-0 group-hover:text-primary transition-colors duration-200"
                  >
                    View Bookings <TrendingUp className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link to="/hirer/chat" className="block h-full cursor-pointer">
              <Card variant="gradient-border" className="h-full group hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 group-hover:from-purple-600 group-hover:to-purple-700 transition-colors duration-200">
                    <MessageCircle className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">Messages</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Chat with musicians about your event details and requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    className="w-full justify-start pl-0 group-hover:text-primary transition-colors duration-200"
                  >
                    Open Messages <TrendingUp className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Recent Bookings</CardTitle>
                  <CardDescription className="mt-1">Your latest booking activity</CardDescription>
                </div>
                <Link to="/hirer/bookings">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by searching for musicians to book for your events
                  </p>
                  <Link to="/hirer/search">
                    <Button>
                      <Search className="h-4 w-4 mr-2" />
                      Find Musicians
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{booking.musician_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.event_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatGHSWithSymbol(booking.total_amount)}
                          </p>
                          {getStatusBadge(booking.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="gradient" className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Star className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Quick Tips</CardTitle>
                  <CardDescription>Make the most of your bookings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  Book musicians in advance to ensure availability for your event
                </p>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">Communicate clearly about event details and expectations</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  Leave reviews after events to help other hirers make informed decisions
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default HirerDashboard;
