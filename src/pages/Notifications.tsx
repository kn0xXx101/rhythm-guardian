// Notifications Page
// Shows all user notifications with filtering and management options

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  ArrowLeft,
  Loader2,
  BellOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  read_at: string | null;
  action_url: string | null;
  metadata: any;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadNotifications();

    // Subscribe to real-time updates
    const channelSuffix =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const channel = supabase
      .channel(`notifications:${user.id}:${channelSuffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    };
  }, [user, navigate]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      // Get all unread notifications
      const unreadNotifications = notifications.filter(n => !n.read);
      
      if (unreadNotifications.length === 0) {
        toast({
          title: 'Info',
          description: 'No unread notifications to mark',
        });
        return;
      }

      // Update each notification individually to ensure RLS policies work
      const updatePromises = unreadNotifications.map(notification =>
        supabase
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('id', notification.id)
          .eq('user_id', user.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Errors marking notifications as read:', errors);
        throw new Error('Failed to mark some notifications as read');
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      toast({
        title: 'Success',
        description: `Marked ${unreadNotifications.length} notification${unreadNotifications.length !== 1 ? 's' : ''} as read`,
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all as read',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: 'Success',
        description: 'Notification deleted',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const deleteAllRead = async () => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => !n.read));
      
      toast({
        title: 'Success',
        description: 'All read notifications deleted',
      });
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notifications',
        variant: 'destructive',
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-blue-500';
      case 'booking':
        return 'bg-green-500';
      case 'payment':
        return 'bg-yellow-500';
      case 'message':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notifications
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          {notifications.some(n => n.read) && (
            <Button variant="outline" size="sm" onClick={deleteAllRead}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
        <div className="-mx-2 overflow-x-auto px-2 pb-1 [-webkit-overflow-scrolling:touch]">
          <TabsList className="w-max min-h-10 flex-nowrap">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read">
              Read ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : filter === 'read'
                  ? "No read notifications yet."
                  : "You don't have any notifications yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md cursor-pointer ${
                !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Type Indicator */}
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getTypeColor(notification.type)}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        {notification.title}
                        {!notification.read && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {notification.type}
                      </Badge>
                      {notification.action_url && (
                        <span className="text-xs text-blue-500">Click to view</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
