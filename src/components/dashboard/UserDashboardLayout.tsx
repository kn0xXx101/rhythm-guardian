import { useEffect, useRef, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import { TopNav } from '@/components/layout/TopNav';
import { BackToTop } from '@/components/ui/back-to-top';
import { useToast } from '@/hooks/use-toast';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import { useBookingReminders } from '@/hooks/use-booking-reminders';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { NavigationAssistant } from '@/components/navigation/NavigationAssistant';
import { useNavigationAssistantContext } from '@/features/navigation-assistant/use-navigation-assistant-context';
import {
  hirerDashboardTourSteps,
  musicianDashboardTourSteps,
} from '@/components/onboarding/dashboard-tour-steps';

const TOUR_NAME = {
  hirer: 'hirer_orientation_v1',
  musician: 'musician_orientation_v1',
} as const;

type WelcomeGate = 'loading' | 'tour' | 'ready';

const UserDashboardLayout = ({ userType }: { userType: 'hirer' | 'musician' }) => {
  const location = useLocation();
  const { toast } = useToast();
  const { isCollapsed, isMobile, isMobileOpen, setMobileSidebarOpen } = useSidebarContext();
  const hasShownWelcome = useRef(false);
  const [welcomeGate, setWelcomeGate] = useState<WelcomeGate>('loading');
  useBookingReminders(userType);

  const handleTourReady = useCallback((needsTour: boolean) => {
    setWelcomeGate(needsTour ? 'tour' : 'ready');
  }, []);

  const handleTourComplete = useCallback(() => {
    setWelcomeGate('ready');
  }, []);

  // If tour status never resolves (e.g. network hang), unblock welcome after a short wait.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setWelcomeGate((g) => (g === 'loading' ? 'ready' : g));
    }, 12000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (welcomeGate !== 'ready') return;

    const welcomeKey = `welcomeShown_${userType}`;
    const hasBeenShown = sessionStorage.getItem(welcomeKey) === 'true';

    if (!hasBeenShown && !hasShownWelcome.current) {
      if (location.pathname === '/hirer' && userType === 'hirer') {
        toast({
          variant: 'welcome',
          title: 'Welcome to your Hirer Dashboard',
          description: 'Find musicians, manage bookings, and stay in touch — all from here.',
        });
        sessionStorage.setItem(welcomeKey, 'true');
        hasShownWelcome.current = true;
      } else if (location.pathname === '/musician' && userType === 'musician') {
        toast({
          variant: 'welcome',
          title: 'Welcome to your Musician Dashboard',
          description: 'Keep your profile current, respond to bookings, and track your earnings.',
        });
        sessionStorage.setItem(welcomeKey, 'true');
        hasShownWelcome.current = true;
      }
    }
  }, [welcomeGate, location.pathname, toast, userType]);

  // Adjust margin based on sidebar state: collapsed = 4rem (64px), expanded = 16rem (256px)
  const sidebarMargin = isMobile
    ? 'ml-0' // On mobile, sidebar slides over, so no margin
    : isCollapsed
      ? 'ml-16' // Collapsed: 4rem
      : 'ml-64'; // Expanded: 16rem
  const isConversationRoute = /\/(chat|communications)(\/|$)/.test(location.pathname);
  const assistant = useNavigationAssistantContext({
    role: userType,
    pathname: location.pathname,
    tourCompleted: welcomeGate === 'ready',
  });

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour
        tourName={TOUR_NAME[userType]}
        steps={userType === 'hirer' ? hirerDashboardTourSteps : musicianDashboardTourSteps}
        onReady={handleTourReady}
        onComplete={handleTourComplete}
      />
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
          className={cn(
            'container flex flex-1 flex-col min-h-0 max-w-full overflow-x-hidden',
            isConversationRoute ? 'py-2 lg:py-3 px-2 sm:px-3' : 'py-6 lg:py-10 px-3 sm:px-4'
          )}
        >
          <NavigationAssistant
            role={userType}
            pathname={location.pathname}
            tourCompleted={welcomeGate === 'ready'}
            signals={assistant.signals}
            ready={assistant.ready && welcomeGate === 'ready'}
          />
          <Outlet />
        </main>
      </div>
      <BackToTop />
    </div>
  );
};

export default UserDashboardLayout;
