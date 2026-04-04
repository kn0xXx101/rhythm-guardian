import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  BarChart4,
  CreditCard,
  LogOut,
  SunMoon,
  Settings,
  Server,
  TrendingUp,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarContext } from '@/contexts/SidebarContext';
import SidebarLogo from './sidebar/SidebarLogo';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const AdminSidebar = () => {
  const { siteName } = useSiteSettings();
  const { theme, toggleTheme } = useTheme();
  const { isMobileOpen, setMobileSidebarOpen, isCollapsed, toggleCollapse, isMobile } = useSidebarContext();
  const location = useLocation();

  const navigationItems = [
    {
      name: 'Overview',
      path: '/admin',
      icon: <BarChart4 className="animated-icon" />,
      exact: true,
    },
    {
      name: 'Analytics',
      path: '/admin/analytics',
      icon: <TrendingUp className="animated-icon" />,
    },
    {
      name: 'Users Management',
      path: '/admin/users',
      icon: <Users className="animated-icon" />,
    },
    {
      name: 'Bookings',
      path: '/admin/bookings',
      icon: <Calendar className="animated-icon" />,
    },
    {
      name: 'Transactions',
      path: '/admin/transactions',
      icon: <CreditCard className="animated-icon" />,
    },
    {
      name: 'Communications',
      path: '/admin/communications',
      icon: <Headphones className="animated-icon" />,
    },
    {
      name: 'Fraud Monitoring',
      path: '/admin/fraud-monitoring',
      icon: <Shield className="animated-icon" />,
    },
    {
      name: 'Deployment',
      path: '/admin/deployment',
      icon: <Server className="animated-icon" />,
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: <Settings className="animated-icon" />,
    },
  ];

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Close sidebar on mobile when navigating
  const handleNavigation = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Desktop collapse toggle button - positioned relative to sidebar */}
      {!isMobile && (
        <div
          className={cn(
            'fixed top-4 z-50 transition-all duration-300 ease-in-out pointer-events-none',
            isCollapsed ? 'left-2' : 'left-[14rem]'
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="h-9 w-9 bg-sidebar/90 backdrop-blur-md border border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground hover:text-white shadow-md hover:shadow-lg active:scale-95 pointer-events-auto"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'bg-sidebar fixed inset-y-0 left-0 z-40 transform transition-all duration-300 ease-in-out overflow-y-auto',
          isMobile ? 'w-64' : isCollapsed ? 'w-16' : 'w-64',
          isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
          'flex flex-col justify-between border-r border-sidebar-border/50'
        )}
      >
        <div>
          {/* Logo */}
          <SidebarLogo isCollapsed={isCollapsed && !isMobile} />

          <Separator className="bg-sidebar-border opacity-50" />

          {/* Navigation */}
          <nav id="navigation" aria-label="Main navigation" className="px-2 py-4 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={handleNavigation}
                className={cn(
                  'flex items-center px-4 py-2.5 text-sm rounded-md hover:bg-sidebar-accent/50 group transition-all duration-200',
                  isActive(item.path, item.exact)
                    ? 'bg-sidebar-accent text-white font-medium shadow-sm'
                    : 'text-sidebar-foreground hover:text-white',
                  isCollapsed && !isMobile && 'justify-center px-2'
                )}
                title={isCollapsed && !isMobile ? item.name : undefined}
              >
                <span
                  className={cn(
                    'transition-colors',
                    !isCollapsed || isMobile ? 'mr-3' : '',
                    isActive(item.path, item.exact)
                      ? 'text-primary'
                      : 'text-sidebar-foreground group-hover:text-primary'
                  )}
                >
                  {item.icon}
                </span>
                {(!isCollapsed || isMobile) && item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 space-y-2">
          <Separator className="bg-sidebar-border opacity-50" />
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm text-sidebar-foreground rounded-md hover:bg-sidebar-accent/50 group transition-colors",
              isCollapsed && !isMobile ? "justify-center px-2" : "justify-start"
            )}
            title={isCollapsed && !isMobile ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : undefined}
          >
            <SunMoon className={cn(
              "text-sidebar-foreground group-hover:text-primary transition-colors animated-icon",
              !isCollapsed || isMobile ? "mr-3" : ""
            )} />
            {(!isCollapsed || isMobile) && (theme === 'light' ? 'Dark Mode' : 'Light Mode')}
          </Button>

          <Link to="/login">
            <Button
              variant="ghost"
              className={cn(
                "flex w-full items-center px-4 py-2 text-sm text-sidebar-foreground rounded-md hover:bg-sidebar-accent/50 group transition-colors",
                isCollapsed && !isMobile ? "justify-center px-2" : "justify-start"
              )}
              title={isCollapsed && !isMobile ? "Logout" : undefined}
            >
              <LogOut className={cn(
                "text-sidebar-foreground group-hover:text-destructive transition-colors animated-icon",
                !isCollapsed || isMobile ? "mr-3" : ""
              )} />
              {(!isCollapsed || isMobile) && "Logout"}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
