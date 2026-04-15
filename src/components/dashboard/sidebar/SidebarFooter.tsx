import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { LogOut, SunMoon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarFooterProps {
  isCollapsed?: boolean;
}

const SidebarFooter = ({ isCollapsed = false }: SidebarFooterProps) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // AuthContext already surfaces errors via toast
    }
  };

  const themeButton = (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      className={cn(
        'flex w-full items-center text-sm text-sidebar-foreground rounded-md hover:bg-sidebar-accent group transition-all duration-200',
        isCollapsed ? 'justify-center px-2' : 'justify-start px-4'
      )}
    >
      <SunMoon
        className={cn(
          'text-sidebar-foreground group-hover:text-white transition-colors animated-icon flex-shrink-0',
          isCollapsed ? 'mr-0' : 'mr-3'
        )}
      />
      <span
        className={cn(
          'whitespace-nowrap transition-all duration-300 overflow-hidden',
          isCollapsed ? 'w-0 opacity-0' : 'opacity-100'
        )}
      >
        {theme === 'light' ? 'Dark Mode' : theme === 'dark' ? 'Light Mode' : 'System Mode'}
      </span>
    </Button>
  );

  const logoutButton = (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className={cn(
        'flex w-full items-center text-sm text-sidebar-foreground rounded-md hover:bg-sidebar-accent group transition-all duration-200',
        isCollapsed ? 'justify-center px-2' : 'justify-start px-4'
      )}
    >
      <LogOut
        className={cn(
          'text-sidebar-foreground group-hover:text-white transition-colors animated-icon flex-shrink-0',
          isCollapsed ? 'mr-0' : 'mr-3'
        )}
      />
      <span
        className={cn(
          'whitespace-nowrap transition-all duration-300 overflow-hidden',
          isCollapsed ? 'w-0 opacity-0' : 'opacity-100'
        )}
      >
        Logout
      </span>
    </Button>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-4 space-y-2">
        <Separator className="bg-sidebar-border" />

        {isCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>{themeButton}</TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-sidebar-accent text-white border-sidebar-border"
              >
                {theme === 'light' ? 'Dark Mode' : theme === 'dark' ? 'Light Mode' : 'System Mode'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-sidebar-accent text-white border-sidebar-border"
              >
                Logout
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {themeButton}
            {logoutButton}

            {/* Keyboard shortcuts hint */}
            <div className="pt-2 mt-2 border-t border-sidebar-border">
              <div className="text-xs text-sidebar-foreground/60 px-4 py-1">
                <div className="font-medium mb-1">Shortcuts</div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>Toggle sidebar</span>
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-sidebar-foreground/80 bg-sidebar-accent/50 rounded border border-sidebar-border">
                      {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+B
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SidebarFooter;
