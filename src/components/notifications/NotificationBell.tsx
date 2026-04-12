// In-App Notification Bell Component
// Shows unread notification count and dropdown with recent notifications

import { useState, useEffect, useRef } from 'react';
import { Bell, MessageCircle, AlertCircle, CreditCard, Calendar, ShieldCheck, DollarSign, Star, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import notificationService from '@/services/notification';
import { notificationsService } from '@/services/notificationsService';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  // Prevent loadNotifications from overwriting state right after markAllAsRead
  const suppressReloadRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    notificationService.requestNotificationPermission();

    loadNotifications();

    // Subscribe to notifications table directly (for database trigger notifications)
    const notificationChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as any;
          // Append new notification to local state instead of reloading from DB
          // This prevents cleared/read notifications from reappearing
          const newNotif: Notification = {
            id: n.id,
            type: n.type,
            title: n.title,
            content: n.content,
            read: n.read ?? false,
            action_url: n.action_url ?? null,
            created_at: n.created_at,
          };
          setNotifications(prev => [newNotif, ...prev].slice(0, 10));
          if (!newNotif.read) setUnreadCount(prev => prev + 1);

          notificationService.playNotificationSound();
          notificationService.showBrowserNotification(n.title, n.content);
        }
      )
      .subscribe();

    // Also subscribe to message notifications for real-time updates
    const messagesChannel = notificationService.subscribeToNewMessages(
      user.id,
      (_notification) => {
        // Sound/browser notification handled inside subscribeToNewMessages
        // Don't reload here — the DB INSERT trigger on notifications table
        // will fire the notificationChannel above which reloads automatically
      }
    );

    return () => {
      notificationChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    if (suppressReloadRef.current) return; // blocked after markAllAsRead

    try {
      const data = await notificationsService.getNotifications(user.id, 10);
      
      const mappedNotifications = data.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.message,
        read: n.is_read,
        action_url: n.link ?? null,
        created_at: n.created_at
      }));

      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await notificationsService.markAsRead(notificationId);

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;

    try {
      suppressReloadRef.current = true;
      setTimeout(() => { suppressReloadRef.current = false; }, 3000);

      await notificationsService.markAllAsRead(user.id);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      toast({ title: 'All notifications marked as read' });
    } catch (error: any) {
      suppressReloadRef.current = false;
      console.error('Error marking all as read:', error);
    }
  };

  const clearAllNotifications = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;

    try {
      suppressReloadRef.current = true;
      setTimeout(() => { suppressReloadRef.current = false; }, 3000);

      // Get IDs of read notifications to delete
      const readIds = notifications.filter(n => n.read).map(n => n.id);
      
      if (readIds.length === 0) return;

      // Delete by specific IDs — most reliable approach
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', readIds);

      if (error) {
        console.error('Delete error:', error);
        // Fallback: try deleting all for this user that are read
        await (supabase as any)
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .eq('read', true);
      }

      // Always update local state regardless of DB result
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (error: any) {
      suppressReloadRef.current = false;
      // Still clear from UI even if DB fails
      setNotifications(prev => prev.filter(n => !n.read));
      console.error('Error clearing notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Close dropdown
    setOpen(false);
    
    // Navigate based on notification type and user role
    if (notification.action_url) {
      const url = notification.action_url;
      const resolvedUrl = (() => {
        // Already a full role-specific path — use as-is
        if (url.startsWith('/admin/') || url.startsWith('/musician/') || url.startsWith('/hirer/')) {
          return url;
        }
        // Generic paths — resolve by role
        if (url === '/bookings') {
          return userRole === 'musician' ? '/musician/bookings' : userRole === 'admin' ? '/admin/bookings' : '/hirer/bookings';
        }
        if (url === '/dashboard/messages' || url === '/messages') {
          return userRole === 'admin' ? '/admin/communications' : userRole === 'musician' ? '/musician/chat' : '/hirer/chat';
        }
        if (url === '/transactions') {
          return '/admin/transactions';
        }
        if (url === '/verifications') {
          return '/admin/verifications';
        }
        if (url === '/users') {
          return '/admin/users';
        }
        return url;
      })();
      navigate(resolvedUrl);
    } else {
      // Fallback navigation by role
      switch (userRole) {
        case 'admin':
          navigate('/admin');
          break;
        case 'hirer':
          navigate('/hirer/chat');
          break;
        case 'musician':
          navigate('/musician/chat');
          break;
        default:
          navigate('/dashboard/messages');
          break;
      }
    }
  };

  if (!user) return null;

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'booking':
        return <Calendar className="h-4 w-4 text-green-500" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-yellow-500" />;
      case 'payout':
        return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case 'review':
        return <Star className="h-4 w-4 text-orange-400" />;
      case 'support_response':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'system':
        return <ShieldCheck className="h-4 w-4 text-slate-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 bg-transparent hover:bg-foreground/10 transition-colors"
        >
          <Bell className="h-[22px] w-[22px] text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[#CC0000] text-white text-[10px] font-extrabold leading-none shadow-sm select-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead} 
                className="h-auto p-1 px-2 text-xs hover:bg-accent"
              >
                Mark read
              </Button>
            )}
            {notifications.some(n => n.read) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllNotifications}
                className="h-auto p-1 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-accent"
              >
                Clear read
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`px-4 py-3 cursor-pointer hover:bg-accent ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/20 border-l-2 border-l-blue-500' : ''}`}
                onClick={(e) => handleNotificationClick(notification, e)}
              >
                <div className="flex items-start gap-3 w-full">
                  {/* Notification Type Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Notification Content */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm leading-tight">{notification.title}</span>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notification.content}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        {notification.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="px-4 py-2 cursor-pointer justify-center text-sm font-medium hover:bg-accent"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            navigate('/notifications');
          }}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}