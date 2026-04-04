// Admin Broadcast Message Component
// Allows admin to send notifications to all users or specific groups

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { SessionManager } from '@/utils/session-manager';
import { Send, Users, Loader2 } from 'lucide-react';

export function BroadcastMessage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'musicians' | 'hirers'>('all');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both title and message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      // Check for valid session first
      const session = await SessionManager.getValidSession();
      if (!session) {
        const errorInfo = SessionManager.handleSessionError({ message: 'No active session' });
        toast({
          variant: 'destructive',
          title: errorInfo.title,
          description: errorInfo.message,
        });
        return;
      }

      // Get target users based on audience selection (exclude admins)
      let query = supabase.from('profiles').select('user_id').neq('role', 'admin');

      if (targetAudience === 'musicians') {
        query = query.eq('role', 'musician');
      } else if (targetAudience === 'hirers') {
        query = query.eq('role', 'hirer');
      } else {
        // For 'all', explicitly get only musicians and hirers
        query = query.in('role', ['musician', 'hirer']);
      }

      const { data: users, error: usersError } = await query;

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      if (!users || users.length === 0) {
        toast({
          title: 'No Recipients',
          description: 'No users found for the selected audience',
          variant: 'destructive',
        });
        return;
      }

      // Create notifications for all target users (without metadata for now)
      const notifications = users.map((user) => ({
        user_id: user.user_id,
        type: 'system' as const,
        title: title.trim(),
        content: `${message.trim()} [Broadcast to ${targetAudience}]`,
        read: false,
        action_url: null,
      }));

      // Insert notifications in batches to avoid potential size limits
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(batch);

        if (notifError) {
          console.error('Error inserting notification batch:', notifError);
          throw new Error(`Failed to send notifications: ${notifError.message}`);
        }

        insertedCount += batch.length;
      }

      toast({
        title: 'Broadcast Sent Successfully',
        description: `Message sent to ${insertedCount} ${targetAudience === 'all' ? 'users (musicians & hirers)' : targetAudience}`,
      });

      // Clear form
      setTitle('');
      setMessage('');
      setTargetAudience('all');
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      
      // Check if it's a session error
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('session') || errorMessage.includes('jwt') || errorMessage.includes('token')) {
        const errorInfo = SessionManager.handleSessionError(error);
        toast({
          variant: 'destructive',
          title: errorInfo.title,
          description: errorInfo.message,
        });
      } else if (errorMessage.includes('notifications') && errorMessage.includes('does not exist')) {
        toast({
          title: 'Database Error',
          description: 'Notifications table not found. Please run database migrations.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Broadcast Failed',
          description: error.message || 'Failed to send broadcast message. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Broadcast Message
        </CardTitle>
        <CardDescription>
          Send a notification to musicians and hirers (admins excluded)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="audience">Target Audience</Label>
          <Select value={targetAudience} onValueChange={(value: any) => setTargetAudience(value)}>
            <SelectTrigger id="audience">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users (Musicians & Hirers)</SelectItem>
              <SelectItem value="musicians">Musicians Only</SelectItem>
              <SelectItem value="hirers">Hirers Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Notification Title</Label>
          <Input
            id="title"
            placeholder="e.g., Platform Maintenance Notice"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={sending}
            maxLength={100}
          />
          <div className="text-xs text-muted-foreground">
            {title.length}/100 characters
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Enter your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
            rows={6}
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground">
            {message.length}/500 characters
          </div>
        </div>

        <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()} className="w-full">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Broadcast
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}