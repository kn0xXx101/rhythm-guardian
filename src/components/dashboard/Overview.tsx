import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardIcon,
} from '@/components/ui/card';
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Star,
} from 'lucide-react';
import { CediIcon } from '@/components/ui/cedi-icon';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatGHSWithSymbol } from '@/lib/currency';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { adminService } from '@/services/admin';
import { supabase } from '@/lib/supabase';
import { SessionManager } from '@/utils/session-manager';
import { useToast } from '@/hooks/use-toast';

interface HirerStats {
  totalHirers: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
}

interface MusicianStats {
  totalMusicians: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalEarned: number;
  pendingPayouts: number;
  verifiedMusicians: number;
  averageProfileCompletion: number;
}

export function Overview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hirerStats, setHirerStats] = useState<HirerStats>({
    totalHirers: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalSpent: 0,
  });
  const [musicianStats, setMusicianStats] = useState<MusicianStats>({
    totalMusicians: 0,
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    totalEarned: 0,
    pendingPayouts: 0,
    verifiedMusicians: 0,
    averageProfileCompletion: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for active session first
      const session = await SessionManager.getValidSession();
      if (!session) {
        const errorInfo = SessionManager.handleSessionError({ message: 'No active session' });
        toast({
          variant: 'destructive',
          title: errorInfo.title,
          description: errorInfo.message,
        });
        
        if (errorInfo.shouldRedirectToLogin) {
          navigate('/admin/login', { replace: true });
        }
        return;
      }

      const data = await adminService.getOverviewStats();
      if (!data?.hirerStats || !data?.musicianStats) {
        throw new Error('Invalid overview data received');
      }
      setHirerStats(data.hirerStats);
      setMusicianStats(data.musicianStats);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      
      // Check if it's a session error
      const errorMessage = err?.message?.toLowerCase() || '';
      if (errorMessage.includes('session') || errorMessage.includes('jwt') || errorMessage.includes('token')) {
        const errorInfo = SessionManager.handleSessionError(err);
        toast({
          variant: 'destructive',
          title: errorInfo.title,
          description: errorInfo.message,
        });
        
        if (errorInfo.shouldRedirectToLogin) {
          navigate('/admin/login', { replace: true });
          return;
        }
      }
      
      // Set default values instead of showing error
      setHirerStats({
        totalHirers: 0,
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalSpent: 0,
      });
      setMusicianStats({
        totalMusicians: 0,
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        totalEarned: 0,
        pendingPayouts: 0,
        verifiedMusicians: 0,
        averageProfileCompletion: 0,
      });
      // Only show error if it's not a missing table error or session error
      if (!errorMessage.includes('does not exist') && 
          !errorMessage.includes('relation') && 
          !errorMessage.includes('session') &&
          !errorMessage.includes('jwt')) {
        setError(err.message || 'Failed to load dashboard data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time subscription for bookings updates
  useEffect(() => {
    const channel = supabase
      .channel('overview-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchDashboardData]);

  if (error) {
    return (
      <Alert variant="destructive" className="animate-slide-in">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 animate-slide-in">
      <DashboardHeader
        heading="Dashboard Overview"
        text="Overview of all user dashboards (Hirer and Musician statistics)"
      />

      {/* Hirer Dashboard Overview */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h3 className="text-fluid-2xl font-semibold">Hirer Dashboard Overview</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card
            variant="gradient-border"
            className="group"
            tooltip="Total number of active hirers registered on the platform"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hirers</CardTitle>
              <CardIcon icon={Users} className="text-blue-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-24" />
              ) : (
                <div className="text-fluid-2xl font-bold group-hover:text-blue-600 transition-colors">
                  {hirerStats.totalHirers}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Active hirers on platform</p>
            </CardContent>
          </Card>

          <Card
            variant="gradient-border"
            className="group"
            tooltip="Total bookings created across all time"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <CardIcon icon={Calendar} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-24" />
              ) : (
                <div className="text-fluid-2xl font-bold group-hover:text-primary transition-colors">
                  {hirerStats.totalBookings}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">All time bookings</p>
            </CardContent>
          </Card>

          <Card
            variant="gradient-border"
            className="group"
            tooltip="Bookings awaiting musician response"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              <CardIcon icon={Clock} className="text-yellow-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-16" />
              ) : (
                <div className="text-fluid-2xl font-bold text-yellow-600 group-hover:text-yellow-700 transition-colors">
                  {hirerStats.pendingBookings}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
            </CardContent>
          </Card>

          <Card
            variant="gradient-border"
            className="group"
            tooltip="Total amount spent on completed bookings"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <CardIcon icon={CediIcon} className="text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-32" />
              ) : (
                <div className="text-fluid-2xl font-bold text-green-600 group-hover:text-green-700 transition-colors">
                  {formatGHSWithSymbol(hirerStats.totalSpent)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">On completed bookings</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Confirmed Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-16" />
              ) : (
                <div className="text-fluid-2xl font-bold text-blue-600">
                  {hirerStats.confirmedBookings}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-16" />
              ) : (
                <div className="text-fluid-2xl font-bold text-green-600">
                  {hirerStats.completedBookings}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cancelled Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-16" />
              ) : (
                <div className="text-fluid-2xl font-bold text-red-600">
                  {hirerStats.cancelledBookings}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Musician Dashboard Overview */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 text-purple-600" />
          <h3 className="text-fluid-2xl font-semibold">Musician Dashboard Overview</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card
            variant="gradient-border"
            className="group"
            tooltip="Total number of registered musicians"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Musicians</CardTitle>
              <CardIcon icon={Users} className="text-purple-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-24" />
              ) : (
                <div className="text-fluid-2xl font-bold group-hover:text-purple-600 transition-colors">
                  {musicianStats.totalMusicians}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Registered musicians</p>
            </CardContent>
          </Card>

          <Card
            variant="gradient-border"
            className="group"
            tooltip="Musicians with verified documents"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Musicians</CardTitle>
              <CardIcon icon={UserCheck} className="text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-16" />
              ) : (
                <div className="text-fluid-2xl font-bold text-green-600 group-hover:text-green-700 transition-colors">
                  {musicianStats.verifiedMusicians}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Documents verified</p>
            </CardContent>
          </Card>

          <Card
            variant="gradient-border"
            className="group"
            tooltip="Total earnings from completed bookings"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <CardIcon icon={TrendingUp} className="text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-32" />
              ) : (
                <div className="text-fluid-2xl font-bold text-green-600 group-hover:text-green-700 transition-colors">
                  {formatGHSWithSymbol(musicianStats.totalEarned)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">From completed bookings</p>
            </CardContent>
          </Card>

          <Card
            variant="gradient-border"
            className="group"
            tooltip="Pending payouts awaiting release"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <CardIcon icon={Clock} className="text-yellow-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-32" />
              ) : (
                <div className="text-fluid-2xl font-bold text-yellow-600 group-hover:text-yellow-700 transition-colors">
                  {formatGHSWithSymbol(musicianStats.pendingPayouts)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Awaiting release</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-16" />
              ) : (
                <div className="text-fluid-2xl font-bold">{musicianStats.totalBookings}</div>
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-16" />
              ) : (
                <div className="text-fluid-2xl font-bold text-green-600">
                  {musicianStats.completedBookings}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Profile Completion</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardSkeleton className="h-8 w-16" />
              ) : (
                <div className="text-fluid-2xl font-bold text-blue-600">
                  {musicianStats.averageProfileCompletion}%
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Overview;
