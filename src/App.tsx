import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Navigate, useLocation } from 'react-router-dom';

const ChatRedirect = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('tab', 'chats');
  return <Navigate to={`/admin/communications?${params.toString()}`} replace />;
};

const MessagesRedirect = () => {
  const { user } = useAuth();
  const { search } = useLocation();
  const aiAssistant = new URLSearchParams(search).get('ai_assistant');

  if (!user) return <Navigate to={`/login${search || ''}`} replace />;
  if (user.role === 'admin') return <Navigate to={`/admin/communications?tab=chats${aiAssistant ? '&ai_assistant=true' : ''}`} replace />;
  if (user.role === 'musician') return <Navigate to={`/musician/chat${search || ''}`} replace />;
  return <Navigate to={`/hirer/chat${search || ''}`} replace />;
};

const ReferralsRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'musician') return <Navigate to="/musician/referrals" replace />;
  if (user.role === 'hirer') return <Navigate to="/hirer/referrals" replace />;
  return <Navigate to="/" replace />;
};
import { ChatProvider } from '@/contexts/ChatContext';
import { BookingProvider } from '@/contexts/BookingContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { RouteLoading } from '@/components/ui/route-loading';
import { AnimatedRoutes } from '@/components/ui/animated-routes';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SkipLinks } from '@/components/accessibility/SkipLinks';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { LiveRegion } from '@/components/accessibility/LiveRegion';
import { AppErrorBoundary, RouteErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { SessionManager } from '@/utils/session-manager';
import { SessionDebug } from '@/components/debug/SessionDebug';
import { AdminNotifyAuditToast } from '@/components/debug/AdminNotifyAuditToast';
import { SuspensionCheck } from '@/components/auth/SuspensionCheck';

// Lazy load layout components
const AdminDashboardLayout = lazy(() => import('./components/dashboard/AdminDashboardLayout'));
const UserDashboardLayout = lazy(() => import('./components/dashboard/UserDashboardLayout'));

// Lazy load dashboard components
const Overview = lazy(() => import('./components/dashboard/Overview'));
const Analytics = lazy(() => import('./components/dashboard/Analytics'));
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'));
const BookingsManagement = lazy(() => import('./components/dashboard/BookingsManagement'));
const TransactionsMonitor = lazy(() => import('./components/dashboard/TransactionsMonitor'));
const ChatMonitor = lazy(() => import('./components/dashboard/ChatMonitor'));
const AuditLogs = lazy(() => import('./components/admin/AuditLogs'));
const UserMessaging = lazy(() => import('./pages/admin/UserMessaging'));
const FraudMonitoringPage = lazy(() => import('./pages/admin/FraudMonitoringPage'));
const CommunicationsPage = lazy(() => import('./pages/admin/CommunicationsPage'));
const VerificationsPage = lazy(() => import('./pages/admin/VerificationsPage'));

// Lazy load pages
const Index = lazy(() => import('./pages/Index'));
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const NotFound = lazy(() => import('./pages/NotFound'));
const HirerDashboard = lazy(() => import('./pages/HirerDashboard'));
const HirerProfile = lazy(() => import('./pages/HirerProfile'));
const InstrumentalistSearch = lazy(() => import('./pages/InstrumentalistSearch'));
const HirerBookings = lazy(() => import('./pages/HirerBookings'));
const HirerChat = lazy(() => import('./pages/HirerChat'));
const MusicianDashboard = lazy(() => import('./pages/MusicianDashboard'));
const MusicianProfile = lazy(() => import('./pages/MusicianProfile'));
const MusicianBookings = lazy(() => import('./pages/MusicianBookings'));
const MusicianChat = lazy(() => import('./pages/MusicianChat'));
const AdminChat = lazy(() => import('./pages/admin/AdminChat'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Deployment = lazy(() => import('./pages/admin/Deployment'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const UserBookings = lazy(() => import('./pages/user/UserBookings'));
const UserMessages = lazy(() => import('./pages/user/UserMessages'));
const UserSettings = lazy(() => import('./pages/user/UserSettings'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Favorites = lazy(() => import('./pages/Favorites'));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage'));
const AuthEmailConfirmed = lazy(() => import('./pages/AuthEmailConfirmed'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Notifications = lazy(() => import('./pages/Notifications'));

// Query client is imported from lib/query-client with optimized defaults

const AppContent = () => {
  const { isLoading: themeLoading, resolvedTheme } = useTheme();
  const { isLoading: authLoading } = useAuth();

  // Enable global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  // Initialize session monitoring
  useEffect(() => {
    const cleanup = SessionManager.initializeSessionMonitoring();
    return cleanup;
  }, []);

  // Show loading screen while theme or auth is initializing
  if (themeLoading || authLoading) {
    return (
      <div className={resolvedTheme}>
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className={resolvedTheme}>
      <SkipLinks />
      <LiveRegion id="app-live-region" message="" politeness="polite" />
      <OfflineIndicator />
      {import.meta.env.DEV && <SessionDebug />}
      {import.meta.env.DEV && <AdminNotifyAuditToast />}
      <SuspensionCheck />
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <AppErrorBoundary context="Application">
          <BookingProvider>
            <ChatProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AnimatedRoutes>
                  {/* Public routes */}
                  <Route
                    path="/"
                    element={
                      <RouteErrorBoundary context="Home Page">
                        <Suspense fallback={<RouteLoading />}>
                          <Index />
                        </Suspense>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <Login />
                      </Suspense>
                    }
                  />
                  {/* Redirect old admin login path to correct path */}
                  <Route path="/login/admin" element={<Navigate to="/admin/login" replace />} />
                  <Route path="/login/admin/" element={<Navigate to="/admin/login" replace />} />
                  <Route
                    path="/admin/login"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <AdminLogin />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/signup"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <SignUp />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/auth/email-confirmed"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <AuthEmailConfirmed />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/forgot-password"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <ForgotPassword />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/reset-password"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <ResetPassword />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/pending-approval"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <PendingApproval />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/reviews"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <Reviews />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/privacy"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <Privacy />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/terms"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <Terms />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/search"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <InstrumentalistSearch />
                      </Suspense>
                    }
                  />

                  {/* Protected routes */}
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <Suspense fallback={<RouteLoading />}>
                          <Notifications />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/messages" element={<MessagesRedirect />} />
                  <Route
                    path="/favorites"
                    element={
                      <ProtectedRoute>
                        <Suspense fallback={<RouteLoading />}>
                          <Favorites />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/referrals"
                    element={
                      <ProtectedRoute>
                        <ReferralsRedirect />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <SidebarProvider>
                          <Suspense fallback={<RouteLoading />}>
                            <AdminDashboardLayout />
                          </Suspense>
                        </SidebarProvider>
                      </ProtectedRoute>
                    }
                  >
                    <Route
                      index
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <Overview />
                        </Suspense>
                      }
                    />
                    <Route
                      path="analytics"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <Analytics />
                        </Suspense>
                      }
                    />
                    <Route
                      path="users"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <UsersManagement />
                        </Suspense>
                      }
                    />
                    <Route
                      path="verifications"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <VerificationsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="bookings"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <BookingsManagement />
                        </Suspense>
                      }
                    />
                    <Route
                      path="transactions"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <TransactionsMonitor />
                        </Suspense>
                      }
                    />
                    <Route
                      path="communications"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <CommunicationsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="support"
                      element={<Navigate to="/admin/communications?tab=tickets" replace />}
                    />
                    <Route
                      path="chat-monitor"
                      element={<Navigate to="/admin/communications?tab=monitor" replace />}
                    />
                    <Route
                      path="user-messaging"
                      element={<Navigate to="/admin/communications?tab=chats" replace />}
                    />
                    <Route
                      path="chat"
                      element={<ChatRedirect />}
                    />
                    <Route
                      path="fraud-monitoring"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <FraudMonitoringPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="audit-logs"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <AuditLogs />
                        </Suspense>
                      }
                    />
                    <Route
                      path="chat-monitor"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <ChatMonitor />
                        </Suspense>
                      }
                    />
                    <Route
                      path="user-messaging"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <UserMessaging />
                        </Suspense>
                      }
                    />
                    <Route
                      path="chat"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <AdminChat />
                        </Suspense>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <Settings />
                        </Suspense>
                      }
                    />
                    <Route
                      path="deployment"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <Deployment />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Hirer routes */}
                  <Route
                    path="/hirer"
                    element={
                      <ProtectedRoute requiredRole="hirer">
                        <SidebarProvider>
                          <Suspense fallback={<RouteLoading />}>
                            <UserDashboardLayout userType="hirer" />
                          </Suspense>
                        </SidebarProvider>
                      </ProtectedRoute>
                    }
                  >
                    <Route
                      index
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <HirerDashboard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="search"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <InstrumentalistSearch />
                        </Suspense>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <HirerProfile />
                        </Suspense>
                      }
                    />
                    <Route
                      path="bookings"
                      element={
                        <RouteErrorBoundary context="Hirer Bookings">
                          <Suspense fallback={<RouteLoading />}>
                            <HirerBookings />
                          </Suspense>
                        </RouteErrorBoundary>
                      }
                    />
                    <Route
                      path="chat"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <HirerChat />
                        </Suspense>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <UserSettings />
                        </Suspense>
                      }
                    />
                    <Route
                      path="referrals"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <ReferralsPage />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Musician routes */}
                  <Route
                    path="/musician"
                    element={
                      <ProtectedRoute requiredRole="musician">
                        <SidebarProvider>
                          <Suspense fallback={<RouteLoading />}>
                            <UserDashboardLayout userType="musician" />
                          </Suspense>
                        </SidebarProvider>
                      </ProtectedRoute>
                    }
                  >
                    <Route
                      index
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <MusicianDashboard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <MusicianProfile />
                        </Suspense>
                      }
                    />
                    <Route
                      path="bookings"
                      element={
                        <RouteErrorBoundary context="Musician Bookings">
                          <Suspense fallback={<RouteLoading />}>
                            <MusicianBookings />
                          </Suspense>
                        </RouteErrorBoundary>
                      }
                    />
                    <Route
                      path="chat"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <MusicianChat />
                        </Suspense>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <UserSettings />
                        </Suspense>
                      }
                    />
                    <Route
                      path="referrals"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <ReferralsPage />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* User Dashboard Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <SidebarProvider>
                          <Suspense fallback={<RouteLoading />}>
                            <UserDashboardLayout userType="hirer" />
                          </Suspense>
                        </SidebarProvider>
                      </ProtectedRoute>
                    }
                  >
                    <Route
                      index
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <UserProfile />
                        </Suspense>
                      }
                    />
                    <Route
                      path="bookings"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <UserBookings />
                        </Suspense>
                      }
                    />
                    <Route
                      path="messages"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <UserMessages />
                        </Suspense>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <Suspense fallback={<RouteLoading />}>
                          <UserSettings />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Catch all */}
                  <Route
                    path="*"
                    element={
                      <Suspense fallback={<RouteLoading />}>
                        <NotFound />
                      </Suspense>
                    }
                  />
                </AnimatedRoutes>
              </TooltipProvider>
            </ChatProvider>
          </BookingProvider>
        </AppErrorBoundary>
      </div>
    </div>
  );
};

const App = () => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SiteSettingsProvider>
            <AppContent />
          </SiteSettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </Router>
);

export default App;
