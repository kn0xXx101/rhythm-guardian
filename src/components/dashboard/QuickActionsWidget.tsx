import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare, Star, Clock, TrendingUp, Heart, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  badge?: number;
  color: string;
}

interface QuickActionsWidgetProps {
  role: 'musician' | 'hirer';
  pendingActions?: {
    messages?: number;
    bookings?: number;
    reviews?: number;
  };
}

export function QuickActionsWidget({ role, pendingActions }: QuickActionsWidgetProps) {
  const navigate = useNavigate();
  const [recentMusicianId] = useState<string | null>(null);

  const hirerActions: QuickAction[] = [
    {
      icon: <Repeat className="h-5 w-5" />,
      title: 'Book Again',
      description: 'Rebook your favorite musician',
      action: () => navigate('/search'),
      color: 'text-primary',
      badge: recentMusicianId ? 1 : undefined,
    },
    {
      icon: <Heart className="h-5 w-5" />,
      title: 'My Favorites',
      description: 'View saved musicians',
      action: () => navigate('/favorites'),
      color: 'text-destructive',
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: 'New Booking',
      description: 'Find and book a musician',
      action: () => navigate('/search'),
      color: 'text-success',
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: 'Messages',
      description: 'Check your messages',
      action: () => navigate('/hirer/chat'),
      color: 'text-primary',
      badge: pendingActions?.messages,
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: 'Pending Bookings',
      description: 'View pending requests',
      action: () => navigate('/hirer/bookings?status=pending'),
      color: 'text-warning',
      badge: pendingActions?.bookings,
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: 'Leave Review',
      description: 'Review completed bookings',
      action: () => navigate('/reviews'),
      color: 'text-warning',
      badge: pendingActions?.reviews,
    },
  ];

  const musicianActions: QuickAction[] = [
    {
      icon: <Calendar className="h-5 w-5" />,
      title: 'Update Availability',
      description: 'Manage your calendar',
      action: () => navigate('/musician/dashboard?tab=availability'),
      color: 'text-success',
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: 'View Analytics',
      description: 'Check your performance',
      action: () => navigate('/musician/dashboard?tab=analytics'),
      color: 'text-primary',
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: 'Messages',
      description: 'Respond to inquiries',
      action: () => navigate('/musician/chat'),
      color: 'text-primary',
      badge: pendingActions?.messages,
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: 'Booking Requests',
      description: 'Review new requests',
      action: () => navigate('/musician/bookings?status=pending'),
      color: 'text-warning',
      badge: pendingActions?.bookings,
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: 'My Reviews',
      description: 'View and respond',
      action: () => navigate('/reviews'),
      color: 'text-warning',
    },
  ];

  const actions = role === 'musician' ? musicianActions : hirerActions;

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="h-auto flex flex-col items-start p-4 hover:bg-accent relative"
              onClick={action.action}
            >
              {action.badge !== undefined && action.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {action.badge}
                </Badge>
              )}
              <div className={`${action.color} mb-2`}>{action.icon}</div>
              <p className="font-semibold text-sm text-left">{action.title}</p>
              <p className="text-xs text-muted-foreground text-left">{action.description}</p>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
