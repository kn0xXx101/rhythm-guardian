import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { TopNav } from '@/components/layout/TopNav';
import { BackToTop } from '@/components/ui/back-to-top';
import { useToast } from '@/hooks/use-toast';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const AdminDashboardLayout = () => {
  const { isMobileOpen, setMobileSidebarOpen, isCollapsed, isMobile } = useSidebarContext();
  const location = useLocation();
  const { toast } = useToast();
  const hasShownWelcome = useRef(false);

  useEffect(() => {
    // Show welcome toast once per session when admin first navigates to dashboard after login
    const welcomeKey = 'welcomeShown_admin';
    const hasBeenShown = sessionStorage.getItem(welcomeKey) === 'true';

    if (!hasBeenShown && !hasShownWelcome.current && location.pathname === '/admin') {
      toast({
        title: 'Welcome back, Admin',
        description: 'Rhythm Guardian console is ready to monitor your musical ecosystem.',
      });
      sessionStorage.setItem(welcomeKey, 'true');
      hasShownWelcome.current = true;
    }
  }, [location.pathname, toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Backdrop */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <AdminSidebar />
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isMobile ? "ml-0" : isCollapsed ? "ml-16" : "ml-64"
      )}>
        <TopNav userType="admin" />
        <main id="main-content" className="container py-6 lg:py-10 px-4">
          <Outlet />
        </main>
      </div>
      <BackToTop />
    </div>
  );
};

export default AdminDashboardLayout;
