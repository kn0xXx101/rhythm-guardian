import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NavigationItem, NavigationSection } from './navigation-items';
import { Separator } from '@/components/ui/separator';

interface SidebarNavigationProps {
  navigationItems?: NavigationItem[];
  navigationSections?: NavigationSection[];
  isCollapsed?: boolean;
  searchQuery?: string;
}

const SidebarNavigation = ({
  navigationItems,
  navigationSections,
  isCollapsed = false,
  searchQuery = '',
}: SidebarNavigationProps) => {
  const location = useLocation();

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Filter items based on search query
  const filterItems = (items: NavigationItem[]) => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const keywordMatch = item.keywords?.some((keyword) => keyword.toLowerCase().includes(query));
      return nameMatch || keywordMatch;
    });
  };

  // Filter sections based on search query
  const filterSections = (sections: NavigationSection[]) => {
    if (!searchQuery.trim()) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: filterItems(section.items),
      }))
      .filter((section) => section.items.length > 0);
  };

  const renderNavItem = (item: NavigationItem) => {
    const active = isActive(item.path, item.exact);

    const navLink = (
      <Link
        key={item.name}
        to={item.path}
        className={cn(
          'flex items-center px-4 py-2 text-sm rounded-md group transition-all duration-200 relative',
          active
            ? 'bg-sidebar-accent text-white font-medium shadow-md ring-1 ring-white/20'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white hover:shadow-sm ring-1 ring-sidebar-border/50',
          isCollapsed && 'justify-center px-2'
        )}
      >
        {/* Active indicator - left border */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
        )}

        <span
          className={cn(
            'flex-shrink-0 transition-all duration-200',
            isCollapsed ? 'mr-0' : 'mr-3',
            active ? 'text-white scale-105' : 'text-sidebar-foreground group-hover:text-white group-hover:scale-105'
          )}
        >
          {item.icon}
        </span>

        <span
          className={cn(
            'whitespace-nowrap transition-all duration-300 overflow-hidden',
            isCollapsed ? 'w-0 opacity-0' : 'opacity-100'
          )}
        >
          {item.name}
        </span>
      </Link>
    );

    // Show tooltip when collapsed
    if (isCollapsed) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>{navLink}</TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-sidebar-accent text-white border-sidebar-border"
          >
            {item.name}
            {active && <span className="ml-2 text-xs opacity-75">(Active)</span>}
          </TooltipContent>
        </Tooltip>
      );
    }

    return navLink;
  };

  // Use sections if provided, otherwise fall back to flat items
  if (navigationSections) {
    const filteredSections = filterSections(navigationSections);

    return (
      <TooltipProvider delayDuration={0}>
        <nav className="px-2 py-4 space-y-4">
          {filteredSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {/* Section title */}
              {!isCollapsed && (
                <div className="px-4 py-2 mb-1">
                  <span className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    {section.title}
                  </span>
                </div>
              )}

              {/* Section items */}
              <div className="space-y-1">{section.items.map((item) => renderNavItem(item))}</div>

              {/* Separator between sections (except last) */}
              {sectionIndex < filteredSections.length - 1 && !isCollapsed && (
                <Separator className="bg-sidebar-border my-2" />
              )}
            </div>
          ))}
        </nav>
      </TooltipProvider>
    );
  }

  // Fallback to flat navigation items
  if (navigationItems) {
    const filteredItems = filterItems(navigationItems);

    return (
      <TooltipProvider delayDuration={0}>
        <nav className="px-2 py-4 space-y-1">
          {filteredItems.map((item) => renderNavItem(item))}
        </nav>
      </TooltipProvider>
    );
  }

  return null;
};

export default SidebarNavigation;
