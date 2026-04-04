import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  Search,
  User,
  Settings,
  LogOut,
  SunMoon,
  Moon,
  Sun,
  ChevronRight,
  Home,
  Music,
  Calendar,
  MessageCircle,
  BarChart4,
  Users,
  CreditCard,
  TrendingUp,
  Loader2,
  UserCircle,
  Menu,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchUsers } from '@/hooks/use-search-users';
import { useBookings } from '@/hooks/use-bookings';
import { useConversations, useSearchMessages } from '@/hooks/use-messages';

interface TopNavProps {
  userType?: 'hirer' | 'musician' | 'admin';
  className?: string;
}

// Define searchable routes/routes for command palette
const searchRoutes = [
  { id: 'home', label: 'Dashboard', path: '/', icon: Home, category: 'Navigation' },
  { id: 'hirer-dashboard', label: 'Hirer Dashboard', path: '/hirer', icon: Music, category: 'Hirer' },
  { id: 'musician-dashboard', label: 'Musician Dashboard', path: '/musician', icon: Music, category: 'Musician' },
  { id: 'admin-dashboard', label: 'Admin Dashboard', path: '/admin', icon: BarChart4, category: 'Admin' },
  { id: 'analytics', label: 'Analytics', path: '/admin/analytics', icon: TrendingUp, category: 'Admin' },
  { id: 'users', label: 'Users Management', path: '/admin/users', icon: Users, category: 'Admin' },
  { id: 'transactions', label: 'Transactions', path: '/admin/transactions', icon: CreditCard, category: 'Admin' },
  { id: 'audit-logs', label: 'Audit Logs', path: '/admin/audit-logs', icon: Shield, category: 'Admin' },
  { id: 'bookings', label: 'My Bookings', path: '/hirer/bookings', icon: Calendar, category: 'Hirer' },
  { id: 'messages', label: 'Messages', path: '/hirer/chat', icon: MessageCircle, category: 'Hirer' },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: Settings, category: 'Admin' },
];

// Define settings sections for search
const settingsSections = [
  { id: 'general', label: 'General Settings', path: '/admin/settings', tab: 'general', category: 'Settings' },
  { id: 'security', label: 'Security Settings', path: '/admin/settings', tab: 'security', category: 'Settings' },
  { id: 'notifications', label: 'Notification Settings', path: '/admin/settings', tab: 'notifications', category: 'Settings' },
  { id: 'appearance', label: 'Appearance Settings', path: '/admin/settings', tab: 'appearance', category: 'Settings' },
  { id: 'integrations', label: 'Integrations', path: '/admin/settings', tab: 'integrations', category: 'Settings' },
  { id: 'userManagement', label: 'User Management', path: '/admin/settings', tab: 'userManagement', category: 'Settings' },
  { id: 'bookingPayments', label: 'Booking & Payments', path: '/admin/settings', tab: 'bookingPayments', category: 'Settings' },
  { id: 'chatCommunication', label: 'Chat & Communication', path: '/admin/settings', tab: 'chatCommunication', category: 'Settings' },
  { id: 'contentModeration', label: 'Content Moderation', path: '/admin/settings', tab: 'contentModeration', category: 'Settings' },
  { id: 'analyticsReporting', label: 'Analytics & Reporting', path: '/admin/settings', tab: 'analyticsReporting', category: 'Settings' },
  { id: 'platformPolicies', label: 'Platform Policies', path: '/admin/settings', tab: 'platformPolicies', category: 'Settings' },
  { id: 'systemMonitoring', label: 'System Monitoring', path: '/admin/settings', tab: 'systemMonitoring', category: 'Settings' },
];

// Define quick actions for search
const getQuickActions = (userType?: 'hirer' | 'musician' | 'admin') => {
  const actions = [];
  
  if (userType === 'hirer') {
    actions.push(
      { id: 'book-again', label: 'Book Again', path: '/search', icon: Music, category: 'Actions' },
      { id: 'favorites', label: 'My Favorites', path: '/favorites', icon: User, category: 'Actions' },
      { id: 'new-booking', label: 'New Booking', path: '/search', icon: Calendar, category: 'Actions' },
      { id: 'edit-profile', label: 'Edit Profile', path: '/hirer/profile', icon: User, category: 'Actions' },
      { id: 'view-messages', label: 'View Messages', path: '/hirer/chat', icon: MessageCircle, category: 'Actions' },
      { id: 'pending-bookings', label: 'Pending Bookings', path: '/hirer/bookings?status=pending', icon: Calendar, category: 'Actions' },
      { id: 'leave-review', label: 'Leave Review', path: '/reviews', icon: User, category: 'Actions' }
    );
  } else if (userType === 'musician') {
    actions.push(
      { id: 'update-availability', label: 'Update Availability', path: '/musician/dashboard?tab=availability', icon: Calendar, category: 'Actions' },
      { id: 'view-bookings', label: 'My Bookings', path: '/musician/bookings', icon: Calendar, category: 'Actions' },
      { id: 'edit-profile', label: 'Edit Profile', path: '/musician/profile', icon: User, category: 'Actions' },
      { id: 'view-messages', label: 'View Messages', path: '/musician/chat', icon: MessageCircle, category: 'Actions' }
    );
  } else if (userType === 'admin') {
    actions.push(
      { id: 'view-analytics', label: 'View Analytics', path: '/admin/analytics', icon: TrendingUp, category: 'Actions' },
      { id: 'manage-users', label: 'Manage Users', path: '/admin/users', icon: Users, category: 'Actions' },
      { id: 'view-transactions', label: 'View Transactions', path: '/admin/transactions', icon: CreditCard, category: 'Actions' },
      { id: 'view-audit-logs', label: 'View Audit Logs', path: '/admin/audit-logs', icon: Shield, category: 'Actions' },
      { id: 'platform-settings', label: 'Platform Settings', path: '/admin/settings', icon: Settings, category: 'Actions' }
    );
  }
  
  return actions;
};

const getBreadcrumbs = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ label: 'Home', path: '/' }];

  if (segments.length === 0) return breadcrumbs;

  // Map route segments to friendly names
  const routeNames: Record<string, string> = {
    admin: 'Admin',
    hirer: 'Hirer',
    musician: 'Musician',
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    users: 'Users',
    transactions: 'Transactions',
    chat: 'Chat',
    bookings: 'Bookings',
    profile: 'Profile',
    search: 'Search',
    settings: 'Settings',
    deployment: 'Deployment',
  };

  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, path: currentPath });
  });

  return breadcrumbs;
};

export function TopNav({ userType, className }: TopNavProps) {
  const { user, userRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobileSidebar } = useSidebarContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const currentRole = userRole || user?.role;

  const groupedRoutes = useMemo(
    () =>
      searchRoutes.reduce<Record<string, (typeof searchRoutes)[number][]>>((acc, route) => {
        const category = route.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(route);
        return acc;
      }, {}),
    []
  );

  const handleProfileClick = () => {
    setUserMenuOpen(false);
    if (currentRole === 'admin') {
      navigate('/admin');
      return;
    }
    if (currentRole === 'musician') {
      navigate('/musician/profile');
      return;
    }
    if (currentRole === 'hirer') {
      navigate('/dashboard');
      return;
    }
    navigate('/dashboard');
  };

  const handleSettingsClick = () => {
    setUserMenuOpen(false);
    if (currentRole === 'admin') {
      navigate('/admin/settings');
      return;
    }
    if (currentRole === 'musician') {
      navigate('/musician/settings');
      return;
    }
    if (currentRole === 'hirer') {
      navigate('/hirer/settings');
      return;
    }
    // Fallback to dashboard settings
    navigate('/dashboard/settings');
  };

  // Search hooks - only fetch when search query is not empty
  const shouldSearch = searchQuery.trim().length > 0;
  const { data: searchUsers, isLoading: usersLoading } = useSearchUsers(
    shouldSearch ? searchQuery.trim() : '',
    { enabled: shouldSearch }
  );
  const { data: bookings } = useBookings({ userId: user?.id });
  const { data: conversations } = useConversations();
  const { data: searchedMessages } = useSearchMessages(
    shouldSearch ? searchQuery.trim() : ''
  );

  // Filter results based on search query (users are already filtered by the service, but we limit here)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim() || !searchUsers) return [];
    return searchUsers.slice(0, 5); // Limit to 5 results
  }, [searchUsers, searchQuery]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim() || !bookings) return [];
    const query = searchQuery.toLowerCase();
    return bookings
      .filter(b => 
        b.id.toLowerCase().includes(query) ||
        b.musician?.name?.toLowerCase().includes(query) ||
        b.client?.name?.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.location?.toLowerCase().includes(query)
      )
      .slice(0, 5); // Limit to 5 results
  }, [bookings, searchQuery]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim() || !conversations) return [];
    const query = searchQuery.toLowerCase();
    return conversations
      .filter(c => 
        c.lastMessage?.text?.toLowerCase().includes(query) ||
        c.contactId.toLowerCase().includes(query)
      )
      .slice(0, 5); // Limit to 5 results
  }, [conversations, searchQuery]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim() || !searchedMessages) return [];
    return searchedMessages.slice(0, 5); // Limit to 5 results
  }, [searchedMessages, searchQuery]);

  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return settingsSections
      .filter(s => s.label.toLowerCase().includes(query))
      .slice(0, 5); // Limit to 5 results
  }, [searchQuery]);

  const quickActions = useMemo(() => getQuickActions(userType), [userType]);
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return quickActions
      .filter(a => a.label.toLowerCase().includes(query))
      .slice(0, 5); // Limit to 5 results
  }, [quickActions, searchQuery]);

  const handleSearchSelect = (path: string) => {
    navigate(path);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleUserSelect = (userId: string) => {
    if (userType === 'hirer') {
      navigate(`/hirer/chat?user=${userId}`);
    } else if (userType === 'musician') {
      navigate(`/musician/chat?user=${userId}`);
    } else {
      navigate(`/admin/users`);
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleBookingSelect = (bookingId: string) => {
    if (userType === 'hirer') {
      navigate(`/hirer/bookings?id=${bookingId}`);
    } else if (userType === 'musician') {
      navigate(`/musician/bookings?id=${bookingId}`);
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleConversationSelect = (contactId: string) => {
    if (userType === 'hirer') {
      navigate(`/hirer/chat?contact=${contactId}`);
    } else if (userType === 'musician') {
      navigate(`/musician/chat?contact=${contactId}`);
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleMessageSelect = (message: any) => {
    const contactId = message.isSender ? message.receiverId : message.senderId;
    if (userType === 'hirer') {
      navigate(`/hirer/chat?contact=${contactId}&message=${message.id}`);
    } else if (userType === 'musician') {
      navigate(`/musician/chat?contact=${contactId}&message=${message.id}`);
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSettingSelect = (setting: typeof settingsSections[0]) => {
    navigate(`${setting.path}?tab=${setting.tab}`);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleActionSelect = (action: typeof quickActions[0]) => {
    navigate(action.path);
    setSearchOpen(false);
    setSearchQuery('');
  };

  // Open command palette when Ctrl/Cmd+K is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when location changes
  useEffect(() => {
    setUserMenuOpen(false);
    setQuickActionsOpen(false);
  }, [location.pathname]);

  const hasResults = 
    filteredUsers.length > 0 || 
    filteredBookings.length > 0 || 
    filteredConversations.length > 0 || 
    filteredMessages.length > 0 ||
    filteredSettings.length > 0 ||
    filteredActions.length > 0;
  const isLoading = usersLoading && searchQuery.trim().length > 0;

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  const nameInitials =
    user?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || undefined;

  const emailInitial = user?.email ? user.email[0]?.toUpperCase() : undefined;

  const userInitials = nameInitials || emailInitial || 'U';

  return (
    <>
      <header className={cn(
        "sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}>
        <div className="flex h-14 items-center gap-2 px-2 sm:gap-4 sm:px-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -ml-2 mr-2"
            onClick={toggleMobileSidebar}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>

          {/* Breadcrumbs */}
          <Breadcrumb className="flex-1 min-w-0 overflow-hidden">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                // On mobile, only show the last 2 breadcrumbs to save space
                const isHiddenOnMobile = breadcrumbs.length > 2 && index < breadcrumbs.length - 2;
                
                return (
                  <BreadcrumbItem 
                    key={crumb.path} 
                    className={cn(
                      "flex items-center gap-1 min-w-0",
                      isHiddenOnMobile && "hidden sm:flex"
                    )}
                  >
                    {index > 0 && <BreadcrumbSeparator />}
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage className="truncate max-w-[150px] sm:max-w-none">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink 
                        asChild
                        className="truncate max-w-[100px] sm:max-w-none"
                      >
                        <button onClick={() => navigate(crumb.path)}>
                          {crumb.label}
                        </button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Global Search */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            {/* Quick Actions */}
            <DropdownMenu open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex">
                  Quick Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userType === 'hirer' && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/hirer/search')}>
                      <Search className="mr-2 h-4 w-4" />
                      Find Musicians
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/hirer/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/hirer/bookings')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      View Bookings
                    </DropdownMenuItem>
                  </>
                )}
                {userType === 'musician' && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/musician/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/musician/bookings')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      My Bookings
                    </DropdownMenuItem>
                  </>
                )}
                {userType === 'admin' && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/admin/analytics')}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Switcher */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden sm:flex"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <SunMoon className="h-5 w-5" />
              )}
            </Button>

            {/* Notifications */}
            <NotificationBell />

            {/* User Avatar Menu */}
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || undefined} alt={user?.full_name || user?.email || 'User'} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                {currentRole !== 'admin' && (
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={(open) => {
        setSearchOpen(open);
        if (!open) setSearchQuery('');
      }}>
        <CommandInput 
          placeholder="Search pages, musicians, bookings, messages, settings, actions..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {!isLoading && searchQuery.trim().length === 0 && (
            <>
              <CommandEmpty>Start typing to search...</CommandEmpty>
              {Object.entries(groupedRoutes).map(([category, routes]) => (
                <CommandGroup key={category} heading={category}>
                  {routes.map((route) => {
                    const Icon = route.icon;
                    if (!Icon) return null;
                    // Render the icon component safely - icons from lucide-react are valid React components
                    return (
                      <CommandItem
                        key={route.id}
                        value={route.label}
                        onSelect={() => handleSearchSelect(route.path)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{route.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </>
          )}

          {!isLoading && searchQuery.trim().length > 0 && (
            <>
              {filteredUsers.length > 0 && (
                <CommandGroup heading="Musicians">
                  {filteredUsers.map((user) => (
                    <CommandItem
                      key={user.userId}
                      value={`${user.fullName} ${user.location || ''}`}
                      onSelect={() => handleUserSelect(user.userId)}
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{user.fullName}</span>
                        {user.location && (
                          <span className="text-xs text-muted-foreground">{user.location}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {filteredBookings.length > 0 && (
                <>
                  {filteredUsers.length > 0 && <CommandSeparator />}
                  <CommandGroup heading="Bookings">
                    {filteredBookings.map((booking) => (
                      <CommandItem
                        key={booking.id}
                        value={`${booking.id} ${booking.musician?.name || ''} ${booking.client?.name || ''}`}
                        onSelect={() => handleBookingSelect(booking.id)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>Booking #{booking.id.slice(0, 8)}</span>
                          <span className="text-xs text-muted-foreground">
                            {booking.musician?.name || booking.client?.name} - {booking.location}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredConversations.length > 0 && (
                <>
                  {(filteredUsers.length > 0 || filteredBookings.length > 0) && <CommandSeparator />}
                  <CommandGroup heading="Conversations">
                    {filteredConversations.map((conversation) => (
                      <CommandItem
                        key={conversation.contactId}
                        value={`${conversation.contactId} ${conversation.lastMessage?.text || ''}`}
                        onSelect={() => handleConversationSelect(conversation.contactId)}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>Contact {conversation.contactId.slice(0, 8)}</span>
                          {conversation.lastMessage?.text && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {conversation.lastMessage.text}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredMessages.length > 0 && (
                <>
                  {(filteredUsers.length > 0 || filteredBookings.length > 0 || filteredConversations.length > 0) && <CommandSeparator />}
                  <CommandGroup heading="Messages">
                    {filteredMessages.map((message) => (
                      <CommandItem
                        key={message.id}
                        value={`${message.id} ${message.text}`}
                        onSelect={() => handleMessageSelect(message)}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-xs truncate max-w-[200px]">
                            {message.text}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredSettings.length > 0 && (
                <>
                  {(filteredUsers.length > 0 || filteredBookings.length > 0 || filteredConversations.length > 0 || filteredMessages.length > 0) && <CommandSeparator />}
                  <CommandGroup heading="Settings">
                    {filteredSettings.map((setting) => (
                      <CommandItem
                        key={setting.id}
                        value={setting.label}
                        onSelect={() => handleSettingSelect(setting)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{setting.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredActions.length > 0 && (
                <>
                  {(filteredUsers.length > 0 || filteredBookings.length > 0 || filteredConversations.length > 0 || filteredMessages.length > 0 || filteredSettings.length > 0) && <CommandSeparator />}
                  <CommandGroup heading="Actions">
                    {filteredActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <CommandItem
                          key={action.id}
                          value={action.label}
                          onSelect={() => handleActionSelect(action)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <span>{action.label}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {!hasResults && !isLoading && (
                <CommandEmpty>No results found for &quot;{searchQuery}&quot;</CommandEmpty>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
