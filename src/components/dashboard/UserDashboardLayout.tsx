import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import { TopNav } from '@/components/layout/TopNav';
import { BackToTop } from '@/components/ui/back-to-top';
import { useToast } from '@/hooks/use-toast';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const UserDashboardLayout = ({ userType }: { userType: 'hirer' | 'musician' }) => {
  const location = useLocation();
  const { toast } = useToast();
  const { isCollapsed, isMobile, isMobileOpen, setMobileSidebarOpen } = useSidebarContext();
  const hasShownWelcome = useRef(false);

  useEffect(() => {
    // Show welcome toast once per session when user first navigates to their dashboard after login
    const welcomeKey = `welcomeShown_${userType}`;
    const hasBeenShown = sessionStorage.getItem(welcomeKey) === 'true';

    if (!hasBeenShown && !hasShownWelcome.current) {
      if (location.pathname === '/hirer' && userType === 'hirer') {
        toast({
          title: 'Welcome to your Hirer Dashboard',
          description: 'Find and connect with talented musicians for your needs.',
        });
        sessionStorage.setItem(welcomeKey, 'true');
        hasShownWelcome.current = true;
      } else if (location.pathname === '/musician' && userType === 'musician') {
        toast({
          title: 'Welcome to your Musician Dashboard',
          description: 'Manage your profile, bookings and payments.',
        });
        sessionStorage.setItem(welcomeKey, 'true');
        hasShownWelcome.current = true;
      }
    }
  }, [location.pathname, toast, userType]);

  // Adjust margin based on sidebar state: collapsed = 4rem (64px), expanded = 16rem (256px)
  const sidebarMargin = isMobile
    ? 'ml-0' // On mobile, sidebar slides over, so no margin
    : isCollapsed
      ? 'ml-16' // Collapsed: 4rem
      : 'ml-64'; // Expanded: 16rem

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar userType={userType} />
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 z-35 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen flex flex-col',
          sidebarMargin
        )}
      >
        <TopNav userType={userType} />
        <main
          id="main-content"
          className="container flex flex-1 flex-col min-h-0 py-6 lg:py-10 px-4"
        >
          <Outlet />
        </main>
      </div>
      <BackToTop />
    </div>
  );
};

export default UserDashboardLayout;
