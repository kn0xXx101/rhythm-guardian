import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SupportTicket {
  id: string;
  user_id: string;
  status: string;
  priority: string;
  subject: string;
  original_message: string;
  created_at: string;
  user_info?: {
    full_name: string;
    role: string;
  };
  messages?: Array<{
    id: string;
    sender_type: string;
    sender_name: string;
    content: string;
    created_at: string;
  }>;
}

export function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      // Use raw SQL query since tables might not be in types yet
      const { data, error } = await supabase
        .rpc('get_support_tickets' as any)
        .then(result => {
          if (result.error) {
            // Fallback: show message that tickets need to be set up
            console.log('Support tickets not set up yet');
            return { data: [], error: null };
          }
          return result;
        });

      if (error) throw error;

      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      // Don't show error toast - just show empty state
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_ticket_messages' as any, { ticket_id: ticketId });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      return [];
    }
  };

  const selectTicket = async (ticket: SupportTicket) => {
    const messages = await fetchTicketMessages(ticket.id);
    setSelectedTicket({ ...ticket, messages });
  };

  const sendResponse = async () => {
    if (!selectedTicket || !responseMessage.trim() || !user) return;

    setIsSending(true);
    try {
      // Use RPC function to add message
      const { error } = await supabase.rpc('add_ticket_message' as any, {
        p_ticket_id: selectedTicket.id,
        p_sender_type: 'admin',
        p_sender_id: user.id,
        p_content: responseMessage.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Response Sent',
        description: 'Your response has been sent to the user via AI Assistant',
      });

      setResponseMessage('');
      
      // Refresh the selected ticket
      await selectTicket(selectedTicket);
      
      // Refresh tickets list
      await fetchTickets();
    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: 'Error',
        description: 'Failed to send response. Please ensure support tickets are set up.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const resolveTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase.rpc('resolve_ticket' as any, {
        p_ticket_id: ticketId,
        p_admin_id: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Ticket Resolved',
        description: 'Support ticket has been marked as resolved',
      });

      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve ticket',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading support tickets...</div>;
  }

  if (tickets.length === 0) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <h3 className="text-lg font-semibold mb-2">Support Tickets Not Set Up</h3>
          <p className="text-muted-foreground mb-4">
            To enable the support ticket system, please run the SQL migration:
          </p>
          <div className="bg-muted p-4 rounded-lg text-left">
            <p className="text-sm font-mono">
              Run COMPLETE_FIX_SUPPORT_TICKETS.sql in your Supabase SQL Editor
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            This will create the support_tickets and ticket_messages tables with proper permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedTicket?.id === ticket.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => selectTicket(ticket)}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'}>
                  {ticket.status}
                </Badge>
                <Badge variant="outline">{ticket.priority}</Badge>
              </div>
              <h4 className="font-medium">{ticket.subject}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                From: {ticket.user_info?.full_name || 'Unknown User'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ticket Details */}
      {selectedTicket && (
        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resolveTicket(selectedTicket.id)}
              >
                Mark Resolved
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">{selectedTicket.subject}</h4>
              <p className="text-sm text-muted-foreground">
                User: {selectedTicket.user_info?.full_name} ({selectedTicket.user_info?.role})
              </p>
            </div>

            {/* Messages */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Original Request:</p>
                <p className="text-sm mt-1">{selectedTicket.original_message}</p>
              </div>

              {selectedTicket.messages?.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.sender_type === 'admin'
                      ? 'bg-primary/10 ml-4'
                      : 'bg-muted mr-4'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {message.sender_name} • {new Date(message.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm">{message.content}</p>
                </div>
              ))}
            </div>

            {/* Response Form */}
            <div className="space-y-3">
              <Textarea
                placeholder="Type your response to the user..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={4}
              />
              <Button
                onClick={sendResponse}
                disabled={!responseMessage.trim() || isSending}
                className="w-full"
              >
                {isSending ? 'Sending...' : 'Send Response via AI Assistant'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}