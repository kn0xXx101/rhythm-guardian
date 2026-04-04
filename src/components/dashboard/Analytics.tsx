import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { adminService } from "@/services/admin";
import { useLiveRegion } from "@/components/accessibility/LiveRegion";
import { Users, Calendar, DollarSign, Star, RefreshCw, Download, MoreVertical, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Brush } from "recharts";
import { formatGHSWithSymbol } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { exportChartAsImage } from "@/lib/chart-utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function Analytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'bookings' | 'reviews'>('overview');
  const announce = useLiveRegion();

  // Analytics data state
  const [revenueData, setRevenueData] = useState<any>(null);
  const [userGrowthData, setUserGrowthData] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [reviewData, setReviewData] = useState<any>(null);
  const [popularData, setPopularData] = useState<any>(null);

  // Enhanced features state
  const [realTimeUpdates, setRealTimeUpdates] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [chartTypes, setChartTypes] = useState<Record<string, 'line' | 'bar' | 'area'>>({
    revenue: 'area',
    userGrowth: 'line',
    bookings: 'bar',
    reviews: 'line'
  });

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [revenue, users, bookings, reviews, popular] = await Promise.all([
        adminService.getRevenueAnalytics(dateRange),
        adminService.getUserGrowthAnalytics(dateRange),
        adminService.getBookingAnalytics(dateRange),
        adminService.getReviewAnalytics(dateRange),
        adminService.getPopularInstrumentsAndGenres()
      ]);

      setRevenueData(revenue);
      setUserGrowthData(users);
      setBookingData(bookings);
      setReviewData(reviews);
      setPopularData(popular);
      // Announce successful data refresh
      announce('Analytics data refreshed successfully', 'polite');
    } catch (err) {
      setError("Failed to load analytics data. Please try again later.");
      announce('Failed to load analytics data. Please try again later.', 'assertive');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Initialize default date range on mount
  useEffect(() => {
    if (!dateRange) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      setDateRange({
        start: start.toISOString(),
        end: now.toISOString()
      });
    }
  }, []);

  useEffect(() => {
    if (dateRange) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.start, dateRange?.end]);

  // Real-time updates polling
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeUpdates, dateRange]);

  // Helper function to export chart
  const handleExportChart = useCallback((chartId: string, filename: string) => {
    exportChartAsImage(chartId, filename).catch((error) => {
      console.error('Failed to export chart:', error);
    });
  }, []);

  // Helper function to toggle chart type
  const toggleChartType = useCallback((chartKey: string) => {
    setChartTypes((prev) => {
      const types = ['line', 'bar', 'area'] as const;
      type ChartType = typeof types[number];
      const current: ChartType = (prev[chartKey] ?? 'line') as ChartType;
      const next: ChartType = types[(types.indexOf(current) + 1) % types.length]!;
      return { ...prev, [chartKey]: next } as Record<string, ChartType>;
    });
  }, []);

  // Custom tooltip formatter for currency
  const currencyFormatter = useCallback((value: number) => formatGHSWithSymbol(value), []);

  const handleDateRangeChange = useCallback((value: string) => {
    const now = new Date();
    let start: Date;

    switch (value) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '1y':
        start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }

    setDateRange({
      start: start.toISOString(),
      end: now.toISOString()
    });
  }, []);

  if (error) {
    return (
      <Alert variant="destructive" className="animate-slide-in">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={fetchAnalytics} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <DashboardHeader
        heading="Analytics Dashboard"
        text="Comprehensive insights into your platform performance"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="realtime"
              checked={realTimeUpdates}
              onCheckedChange={setRealTimeUpdates}
            />
            <Label htmlFor="realtime" className="text-sm cursor-pointer whitespace-nowrap">
              Real-time
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="comparison"
              checked={comparisonMode}
              onCheckedChange={setComparisonMode}
            />
            <Label htmlFor="comparison" className="text-sm cursor-pointer whitespace-nowrap">
              Comparison
            </Label>
          </div>
          <Select defaultValue="6m" onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchAnalytics} 
            disabled={isLoading}
            aria-label="Refresh analytics data"
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </DashboardHeader>

      {/* Overview Stats */}
      {!isLoading && revenueData && userGrowthData && bookingData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-fluid-2xl font-bold">{formatGHSWithSymbol(revenueData.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Platform fees: {formatGHSWithSymbol(revenueData.platformFees)}
              </p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-fluid-2xl font-bold">{userGrowthData.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {userGrowthData.musicians} musicians, {userGrowthData.hirers} hirers
              </p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-fluid-2xl font-bold">{bookingData.totalBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {bookingData.completedBookings} completed
              </p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-fluid-2xl font-bold">
                {reviewData && reviewData.averageRating > 0 ? reviewData.averageRating.toFixed(1) : 'No reviews'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {reviewData ? reviewData.totalReviews : 0} reviews
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="glass">
              <CardHeader className="space-y-0 pb-2">
                <CardSkeleton className="h-4 w-24 p-0 border-0 bg-transparent" />
              </CardHeader>
              <CardContent>
                <CardSkeleton className="h-8 w-32 mb-2 p-0 border-0 bg-transparent" />
                <CardSkeleton className="h-3 w-40 p-0 border-0 bg-transparent" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'revenue', label: 'Revenue' },
            { id: 'users', label: 'Users' },
            { id: 'bookings', label: 'Bookings' },
            { id: 'reviews', label: 'Reviews' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Revenue Trend */}
            <Card variant="gradient-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Monthly revenue over time</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleChartType('revenue')}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Switch Chart Type
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportChart('revenue-chart', 'revenue-trend')}>
                          <Download className="mr-2 h-4 w-4" />
                          Export as Image
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div id="revenue-chart">
                    <ResponsiveContainer width="100%" height={300}>
                      {chartTypes.revenue === 'area' ? (
                        <AreaChart data={revenueData?.revenueByMonth || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={currencyFormatter} />
                          <Area type="monotone" dataKey="value" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} />
                          <Brush dataKey="month" height={30} stroke="#0088FE" />
                        </AreaChart>
                      ) : chartTypes.revenue === 'line' ? (
                        <LineChart data={revenueData?.revenueByMonth || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={currencyFormatter} />
                          <Line type="monotone" dataKey="value" stroke="#0088FE" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Brush dataKey="month" height={30} stroke="#0088FE" />
                        </LineChart>
                      ) : (
                        <BarChart data={revenueData?.revenueByMonth || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={currencyFormatter} />
                          <Bar dataKey="value" fill="#0088FE" />
                          <Brush dataKey="month" height={30} stroke="#0088FE" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className={cn("grid gap-4", comparisonMode ? "md:grid-cols-2" : "md:grid-cols-2")}>
              {/* User Growth */}
              <Card variant="glass" className={comparisonMode ? "border-primary/20" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Growth {comparisonMode && <span className="text-sm text-muted-foreground">(vs Bookings)</span>}</CardTitle>
                      <CardDescription>Cumulative user registrations</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleChartType('userGrowth')}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Switch Chart Type
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportChart('user-growth-chart', 'user-growth')}>
                          <Download className="mr-2 h-4 w-4" />
                          Export as Image
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <div id="user-growth-chart">
                      <ResponsiveContainer width="100%" height={250}>
                        {chartTypes.userGrowth === 'line' ? (
                          <LineChart data={userGrowthData?.userGrowthByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#00C49F" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Brush dataKey="month" height={20} stroke="#00C49F" />
                          </LineChart>
                        ) : chartTypes.userGrowth === 'area' ? (
                          <AreaChart data={userGrowthData?.userGrowthByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#00C49F" fill="#00C49F" fillOpacity={0.6} />
                            <Brush dataKey="month" height={20} stroke="#00C49F" />
                          </AreaChart>
                        ) : (
                          <BarChart data={userGrowthData?.userGrowthByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#00C49F" />
                            <Brush dataKey="month" height={20} stroke="#00C49F" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bookings Trend */}
              <Card variant="glass" className={comparisonMode ? "border-primary/20" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Bookings Trend {comparisonMode && <span className="text-sm text-muted-foreground">(vs User Growth)</span>}</CardTitle>
                      <CardDescription>Monthly booking count</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleChartType('bookings')}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Switch Chart Type
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportChart('bookings-chart', 'bookings-trend')}>
                          <Download className="mr-2 h-4 w-4" />
                          Export as Image
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <div id="bookings-chart">
                      <ResponsiveContainer width="100%" height={250}>
                        {chartTypes.bookings === 'bar' ? (
                          <BarChart data={bookingData?.bookingsByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" />
                            <Brush dataKey="month" height={20} stroke="#8884d8" />
                          </BarChart>
                        ) : chartTypes.bookings === 'line' ? (
                          <LineChart data={bookingData?.bookingsByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Brush dataKey="month" height={20} stroke="#8884d8" />
                          </LineChart>
                        ) : (
                          <AreaChart data={bookingData?.bookingsByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            <Brush dataKey="month" height={20} stroke="#8884d8" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Popular Instruments */}
            {popularData && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Popular Instruments</CardTitle>
                    <CardDescription>Top 10 most popular instruments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[250px] w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={popularData.instruments || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#FF8042" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Popular Genres</CardTitle>
                    <CardDescription>Top 10 most popular genres</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[250px] w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={popularData.genres || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {(popularData.genres || []).map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && revenueData && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Average Booking Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatGHSWithSymbol(revenueData.averageBookingValue)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Paid Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{revenueData.paidBookings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Completed Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{revenueData.completedBookings}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue by Event Type</CardTitle>
                    <CardDescription>Revenue breakdown by event category</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExportChart('revenue-event-chart', 'revenue-by-event-type')}>
                        <Download className="mr-2 h-4 w-4" />
                        Export as Image
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div id="revenue-event-chart">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(revenueData.revenueByEventType || {}).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatGHSWithSymbol(Number(value))} />
                        <Bar dataKey="value" fill="#0088FE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && userGrowthData && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userGrowthData.activeUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Verified Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userGrowthData.verifiedUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Verification Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userGrowthData.verificationRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Musicians</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userGrowthData.musicians}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Users by Role</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(userGrowthData.usersByRole || {}).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(userGrowthData.usersByRole || {}).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Users by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={Object.entries(userGrowthData.usersByStatus || {}).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#00C49F" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && bookingData && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookingData.conversionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookingData.completionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cancellation Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookingData.cancellationRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookingData.pendingBookings}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Bookings by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(bookingData.bookingsByStatus || {}).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(bookingData.bookingsByStatus || {}).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bookings by Event Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={Object.entries(bookingData.bookingsByEventType || {}).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#FFBB28" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && reviewData && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reviewData.avgPerformanceRating.toFixed(1)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Communication</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reviewData.avgCommunicationRating.toFixed(1)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Professionalism</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reviewData.avgProfessionalismRating.toFixed(1)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reviewData.totalReviews}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reviewData.ratingDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#FF8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Reviews Over Time</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleChartType('reviews')}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Switch Chart Type
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportChart('reviews-time-chart', 'reviews-over-time')}>
                          <Download className="mr-2 h-4 w-4" />
                          Export as Image
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <div id="reviews-time-chart">
                      <ResponsiveContainer width="100%" height={250}>
                        {chartTypes.reviews === 'line' ? (
                          <LineChart data={reviewData.reviewsByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Brush dataKey="month" height={20} stroke="#8884d8" />
                          </LineChart>
                        ) : chartTypes.reviews === 'bar' ? (
                          <BarChart data={reviewData.reviewsByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" />
                            <Brush dataKey="month" height={20} stroke="#8884d8" />
                          </BarChart>
                        ) : (
                          <AreaChart data={reviewData.reviewsByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            <Brush dataKey="month" height={20} stroke="#8884d8" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
