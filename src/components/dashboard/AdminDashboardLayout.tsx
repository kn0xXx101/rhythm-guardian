import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { TopNav } from '@/components/layout/TopNav';
import { BackToTop } from '@/components/ui/back-to-top';
import { useToast } from '@/hooks/use-toast';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { adminDashboardTourSteps } from '@/components/onboarding/dashboard-tour-steps';

const ADMIN_TOUR_NAME = 'admin_orientation_v1';

const AdminDashboardLayout = () => {
  const { isMobileOpen, setMobileSidebarOpen, isCollapsed, isMobile } = useSidebarContext();
  const location = useLocation();
  const { toast } = useToast();
  const hasShownWelcome = useRef(false);
  const isConversationRoute = /\/(chat|communications)(\/|$)/.test(location.pathname);

  useEffect(() => {
    // Show welcome toast once per session when admin first navigates to dashboard after login
    const welcomeKey = 'welcomeShown_admin';
    const hasBeenShown = sessionStorage.getItem(welcomeKey) === 'true';

    if (!hasBeenShown && !hasShownWelcome.current && location.pathname === '/admin') {
      toast({
        variant: 'welcome',
        title: 'Welcome back, Admin',
        description: 'Rhythm Guardian console is ready to monitor your musical ecosystem.',
      });
      sessionStorage.setItem(welcomeKey, 'true');
      hasShownWelcome.current = true;
    }
  }, [location.pathname, toast]);

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour
        tourName={ADMIN_TOUR_NAME}
        steps={adminDashboardTourSteps}
        onComplete={() => {}}
      />
      {/* Mobile Backdrop */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <AdminSidebar />
      <div
        className={cn(
          'ui-3d-scene transition-all duration-300 ease-in-out min-h-screen flex flex-col',
          isMobile ? 'ml-0' : isCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <TopNav userType="admin" />
        <main
          id="main-content"
          className={cn(
            'ui-3d-main container flex flex-1 flex-col min-h-0 max-w-full overflow-x-hidden',
            isConversationRoute ? 'py-2 lg:py-3 px-2 sm:px-3' : 'py-6 lg:py-10 px-4'
          )}
        >
          <Outlet />
        </main>
      </div>
      <BackToTop />
    </div>
  );
};

export default AdminDashboardLayout;
