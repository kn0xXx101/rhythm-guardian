import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileCompletionBanner } from '@/components/profile/ProfileCompletionBanner';
import { User, Calendar, MessageCircle, TrendingUp, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSettings } from '@/api/settings';
import { MusicianOverview } from '@/components/dashboard/MusicianOverview';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FeeBreakdown } from '@/components/musician/FeeBreakdown';
const MusicianDashboard = () => {
  const [adminPercentage, setAdminPercentage] = useState(0.1);

  // Fetch admin commission percentage from settings
  useEffect(() => {
    const fetchAdminPercentage = async () => {
      try {
        const settings = await getSettings();
        if (settings?.bookingPayments?.platformCommissionRate !== undefined) {
          setAdminPercentage(settings.bookingPayments.platformCommissionRate / 100);
        }
      } catch (error) {
        console.error('Failed to fetch admin commission rate:', error);
      }
    };
    fetchAdminPercentage();
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-6 animate-slide-in">
      <DashboardHeader
        heading="Musician Dashboard"
        text="Welcome to your musician dashboard. Here you can manage your profile, bookings, and payments."
        action={{
          label: "Edit Profile",
          href: "/musician/profile",
          variant: "outline"
        }}
      />

      <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded text-blue-900 text-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 text-blue-600" />
          <div>
            <div className="font-semibold mb-1">How Musician Payments Work</div>
            <p className="mb-2">
              Payments are held securely until your service is completed. After both parties confirm completion,
              your earnings (minus platform commission and payment processing fees) are automatically released to your account.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <span>Platform Commission: <strong>{(adminPercentage * 100).toFixed(1)}%</strong></span>
              <span>Payment Processing: <strong>1.5% + GHS 0.50</strong></span>
              <FeeBreakdown
                bookingAmount={100}
                platformCommissionRate={adminPercentage * 100}
                className="ml-auto"
              />
            </div>
          </div>
        </div>
      </div>

      <MusicianOverview />

      {/* Profile Status - Full Width */}
      <ProfileCompletionBanner />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Link to="/musician/profile" className="block h-full">
          <Card variant="gradient-border" className="h-full">
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <User className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Manage Profile</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Update your profile, skills, availability, and portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full justify-start pl-0 group-hover:text-primary transition-all"
              >
                Edit Profile <TrendingUp className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link to="/musician/bookings" className="block h-full">
          <Card variant="gradient-border" className="h-full">
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Manage Bookings</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                View and respond to booking requests from clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full justify-start pl-0 group-hover:text-primary transition-all"
              >
                View Bookings <TrendingUp className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link to="/musician/chat" className="block h-full">
          <Card variant="gradient-border" className="h-full">
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Messages</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Chat with potential clients about bookings and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full justify-start pl-0 group-hover:text-primary transition-all"
              >
                Open Messages <TrendingUp className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No upcoming bookings at the moment.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MusicianDashboard;
