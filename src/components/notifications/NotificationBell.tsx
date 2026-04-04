// In-App Notification Bell Component
// Shows unread notification count and dropdown with recent notifications

import { useState, useEffect } from 'react';
import { Bell, MessageCircle, AlertCircle, CreditCard, Calendar } from 'lucide-react';
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
          console.log('New notification from database trigger:', payload.new);
          loadNotifications();
          
          // Play sound and show browser notification
          const notification = payload.new as any;
          notificationService.playNotificationSound();
          notificationService.showBrowserNotification(
            notification.title,
            notification.content
          );
        }
      )
      .subscribe();

    // Also subscribe to message notifications for real-time updates
    const messagesChannel = notificationService.subscribeToNewMessages(
      user.id,
      (notification) => {
        console.log('New message notification:', notification);
        // Don't reload here as the notification trigger should handle it
        // Just ensure we have the latest data
        setTimeout(() => loadNotifications(), 500);
      }
    );

    return () => {
      notificationChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: Notification) => !n.read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) {
      console.error('No user found');
      return;
    }

    try {
      console.log('Marking notification as read:', notificationId, 'for user:', user.id);
      
      // Use the most basic update possible
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', user.id) // Double-check user ownership
        .select('id, read');

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.error('No notification updated - notification not found or not owned by user');
        throw new Error('Notification not found or access denied');
      }

      console.log('Successfully marked as read:', data);

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Reload to ensure consistency
      setTimeout(() => loadNotifications(), 500);
      
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark notification as read',
        variant: 'destructive',
      });
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
      if (notification.type === 'message') {
        // For message notifications, use the action_url which includes the sender ID
        navigate(notification.action_url);
      } else {
        // For other notifications, use the action_url
        navigate(notification.action_url);
      }
    } else {
      // Fallback navigation if no action_url
      switch (userRole) {
        case 'admin':
          navigate('/admin/chat');
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

  const markAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      console.error('No user found');
      return;
    }

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      console.log('Marking all as read. User:', user.id, 'Unread count:', unreadNotifications.length);
      
      if (unreadNotifications.length === 0) {
        toast({
          title: 'Info',
          description: 'No unread notifications',
        });
        return;
      }

      // Try bulk update first (simpler and faster)
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('read', false)
        .select('id');

      if (error) {
        console.error('Bulk update failed, trying individual updates:', error);
        
        // Fallback to individual updates
        const updatePromises = unreadNotifications.map(notification => {
          console.log('Updating notification individually:', notification.id);
          return supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', notification.id)
            .eq('user_id', user.id)
            .select('id');
        });

        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r.error);
        
        if (errors.length > 0) {
          console.error('Individual update errors:', errors);
          throw new Error(`Failed to update ${errors.length} notification(s)`);
        }
        
        console.log('Individual updates successful:', results);
      } else {
        console.log('Bulk update successful:', data);
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      toast({
        title: 'Success',
        description: `Marked ${unreadNotifications.length} notification(s) as read`,
      });
      
      // Reload to ensure consistency
      setTimeout(() => loadNotifications(), 500);
      
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark all as read',
        variant: 'destructive',
      });
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
      case 'system':
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
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead} 
              className="h-auto p-1 px-2 text-xs hover:bg-accent"
            >
              Mark all as read
            </Button>
          )}
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