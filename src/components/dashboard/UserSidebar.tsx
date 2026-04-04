import { useState, useEffect, useRef } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import SidebarLogo from './sidebar/SidebarLogo';
import SidebarNavigation from './sidebar/SidebarNavigation';
import SidebarFooter from './sidebar/SidebarFooter';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { hirerNavigationSections, musicianNavigationSections } from './sidebar/navigation-items';

const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

const UserSidebar = ({ userType }: { userType: 'hirer' | 'musician' }) => {
  const { isCollapsed, toggleCollapse, isMobile, isMobileOpen } = useSidebarContext();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (
        event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleCollapse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, toggleCollapse]);
  
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isCollapsed) return;
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isCollapsed]);

  const navigationSections =
    userType === 'hirer' ? hirerNavigationSections : musicianNavigationSections;

  // On mobile: sidebar slides in/out
  // On desktop: sidebar is always visible, but can be collapsed to icon-only mode
  const sidebarWidth = isMobile ? 'w-64' : isCollapsed ? 'w-16' : 'w-64';

  return (
    <>
      {/* Mobile toggle handled via TopNav; sidebar visibility controlled by context */}

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
          'bg-sidebar/90 backdrop-blur-lg border-r border-sidebar-border shadow-xl fixed inset-y-0 left-0 z-40 transition-[width,transform,opacity] duration-300 ease-in-out overflow-y-auto overflow-x-hidden',
          // Mobile: slide in/out
          isMobile ? cn('transform', isMobileOpen ? 'translate-x-0' : '-translate-x-full') : '',
          // Desktop: always visible, just width changes
          sidebarWidth,
          'flex flex-col justify-between'
        )}
      >
        <div>
          {/* Logo */}
          <SidebarLogo isCollapsed={isCollapsed} />

          <Separator className="bg-sidebar-border" />

          {/* Search */}
          {!isCollapsed && (
            <div className="px-3 py-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-sidebar-foreground/60" />
                <Input
                  type="text"
                  placeholder="Search navigation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  ref={searchInputRef}
                  className="pl-8 pr-10 h-9 bg-sidebar-accent/40 border border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-2 focus-visible:ring-sidebar-accent rounded-md transition-all duration-200"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent rounded-md"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav id="navigation" aria-label="Main navigation">
            <SidebarNavigation
              navigationSections={navigationSections}
              isCollapsed={isCollapsed}
              searchQuery={searchQuery}
            />
          </nav>
        </div>

        {/* Footer */}
        <SidebarFooter isCollapsed={isCollapsed} />
      </div>
    </>
  );
};

export default UserSidebar;
