// Admin Message System Test Component
// Allows admins to test if the messaging system is working properly

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Send, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { sendMessage } from '@/services/simple-chat';

interface TestUser {
  user_id: string;
  full_name: string | null;
  role: string;
}

export function MessageSystemTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [testMessage, setTestMessage] = useState('Test message from admin - ' + new Date().toLocaleTimeString());
  const [testing, setTesting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [testResults, setTestResults] = useState<{
    messageSent: boolean;
    notificationCreated: boolean;
    error?: string;
  } | null>(null);

  const loadTestUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('role', ['musician', 'hirer'])
        .order('full_name')
        .limit(20);

      if (error) throw error;
      
      // Filter out users with null names and transform the data
      const validUsers = (data || [])
        .filter((user): user is { user_id: string; full_name: string; role: string } => 
          user.full_name !== null
        )
        .map(user => ({
          user_id: user.user_id,
          full_name: user.full_name,
          role: user.role
        }));
      
      setTestUsers(validUsers);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load test users: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const runTest = async () => {
    if (!user || !selectedUser || !testMessage.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a user and enter a test message',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResults(null);

    try {
      // Step 1: Send the message
      const sentMessage = await sendMessage(user.id, selectedUser, testMessage.trim());
      
      if (!sentMessage) {
        throw new Error('Failed to send message');
      }

      // Step 2: Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Check if notification was created
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('id, title, content, created_at, metadata, action_url')
        .eq('user_id', selectedUser)
        .eq('type', 'message')
        .contains('metadata', { message_id: sentMessage.id })
        .order('created_at', { ascending: false })
        .limit(1);

      if (notifError) {
        throw new Error('Failed to check notifications: ' + notifError.message);
      }

      const notificationCreated = notifications && notifications.length > 0;
      const notification = notifications?.[0];

      setTestResults({
        messageSent: true,
        notificationCreated,
      });

      if (notificationCreated && notification) {
        // Check if notification shows "Admin" instead of real name
        const showsAdmin = notification.content.includes('Admin sent you a message');
        const hasCorrectUrl = notification.action_url?.includes(`?user=${user.id}`);
        
        toast({
          title: 'Test Results',
          description: `Message sent ✓ | Notification created ✓ | Shows "Admin": ${showsAdmin ? '✓' : '✗'} | Correct URL: ${hasCorrectUrl ? '✓' : '✗'}`,
        });
      } else {
        toast({
          title: 'Test Partially Failed',
          description: 'Message sent but no notification was created. Check the database trigger.',
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      console.error('Test failed:', error);
      setTestResults({
        messageSent: false,
        notificationCreated: false,
        error: error.message,
      });

      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Message System Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Test Users</Label>
          <div className="flex gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a user to test with" />
              </SelectTrigger>
              <SelectContent>
                {testUsers.map((testUser) => (
                  <SelectItem key={testUser.user_id} value={testUser.user_id}>
                    {testUser.full_name || 'Unknown User'} ({testUser.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={loadTestUsers} 
              disabled={loadingUsers}
            >
              {loadingUsers ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Load Users'
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-message">Test Message</Label>
          <Textarea
            id="test-message"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter a test message..."
            rows={3}
          />
        </div>

        <Button 
          onClick={runTest} 
          disabled={testing || !selectedUser || !testMessage.trim()}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Run Test
            </>
          )}
        </Button>

        {testResults && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Test Results:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {testResults.messageSent ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>Message Sent: {testResults.messageSent ? 'Success' : 'Failed'}</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.notificationCreated ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>Notification Created: {testResults.notificationCreated ? 'Success' : 'Failed'}</span>
              </div>
              {testResults.error && (
                <div className="text-red-500 text-sm mt-2">
                  Error: {testResults.error}
                </div>
              )}
              {testResults.notificationCreated && (
                <div className="text-green-600 text-sm mt-2">
                  ✓ Notification should show "Admin sent you a message" and navigate to the correct chat page when clicked.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>How this test works:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Sends a test message from admin to the selected user</li>
            <li>Checks if a notification was automatically created by the database trigger</li>
            <li>Reports the results to help diagnose messaging issues</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}