import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

interface SupportTicket {
  id: string;
  user_id: string;
  status: string;
  priority: string;
  subject: string;
  original_message: string;
  created_at: string;
  session_status?: string;
  session_expires_at?: string | null;
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
    <div className="grid grid-cols-1 gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-2 lg:gap-6 lg:p-6">
      {/* Tickets list — full width on mobile until a ticket is open (master/detail) */}
      <Card
        className={`min-h-0 flex flex-col overflow-hidden ${
          selectedTicket ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <CardHeader className="flex-shrink-0 pb-2 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">Support Tickets</CardTitle>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Tap a ticket to read and reply. Replies are delivered to the user via the AI Assistant.
          </p>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 space-y-3 overflow-y-auto sm:space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void selectTicket(ticket);
                }
              }}
              className={`rounded-xl border p-3 sm:p-4 cursor-pointer transition-colors active:bg-muted/80 ${
                selectedTicket?.id === ticket.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => void selectTicket(ticket)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'}>
                  {ticket.status}
                </Badge>
                <Badge variant="outline">{ticket.priority}</Badge>
              </div>
              <h4 className="font-medium text-sm sm:text-base leading-snug">{ticket.subject}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                From: {ticket.user_info?.full_name || 'Unknown User'}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ticket thread — full screen on mobile when selected */}
      {selectedTicket && (
        <Card
          className={[
            'flex min-h-0 flex-col overflow-hidden',
            // Use available space on desktop/web without full-viewport overstretch.
            // This eliminates the big empty area below while keeping the layout "normal".
            'md:h-[clamp(40rem,78dvh,58rem)]',
            'lg:h-[clamp(44rem,80dvh,62rem)]',
          ].join(' ')}
        >
          <CardHeader className="flex-shrink-0 space-y-3 border-b pb-3 sm:pb-4">
            <div className="flex flex-wrap items-start gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 lg:hidden"
                onClick={() => setSelectedTicket(null)}
              >
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                All tickets
              </Button>
              <CardTitle className="flex-1 min-w-0 text-base sm:text-lg">Conversation</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resolveTicket(selectedTicket.id)}
                className="w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-offset-0"
              >
                Mark resolved
              </Button>
            </div>
            <div>
              <h4 className="font-medium text-sm sm:text-base">{selectedTicket.subject}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                User: {selectedTicket.user_info?.full_name} ({selectedTicket.user_info?.role})
              </p>
              {selectedTicket.session_expires_at && (
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                  Session expires: {new Date(selectedTicket.session_expires_at).toLocaleString()}
                </p>
              )}
            </div>
          </CardHeader>
          {/* Only the thread scrolls; composer stays pinned */}
          <CardContent className="flex min-h-0 flex-1 flex-col p-3 pt-4 sm:p-6 overflow-hidden">
            {/*
              When there are no replies yet, avoid forcing a tall scroll container.
              This keeps the web/desktop view compact instead of showing a large empty panel.
            */}
            {(() => {
              const hasThread = (selectedTicket.messages?.length ?? 0) > 0;
              const original = (selectedTicket.original_message || '').trim();
              const hasOriginal = original.length > 0;
              return (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-3 rounded-lg border bg-muted/20 p-2 pb-28 sm:p-3 sm:pb-32">
                  {hasOriginal ? (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs font-medium text-muted-foreground sm:text-sm">Original request</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{original}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs font-medium text-muted-foreground sm:text-sm">Original request</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        No original request was captured for this ticket yet.
                      </p>
                    </div>
                  )}

                  {selectedTicket.messages?.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl p-3 text-sm ${
                        message.sender_type === 'admin'
                          ? 'ml-0 border border-primary/20 bg-primary/10 sm:ml-6'
                          : 'mr-0 border border-border bg-card sm:mr-6'
                      }`}
                    >
                      <p className="mb-1 text-[11px] text-muted-foreground sm:text-xs">
                        {message.sender_name} · {new Date(message.created_at).toLocaleString()}
                      </p>
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                    </div>
                  ))}

                  {!hasThread && (
                    <div className="rounded-lg border border-dashed bg-background/40 p-3 text-sm text-muted-foreground">
                      No replies yet. Your response below will be sent to the user in the AI Assistant chat.
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="sticky bottom-0 -mx-3 sm:-mx-6 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70">
              <div className="space-y-2 px-3 pt-3 pb-3 sm:space-y-3 sm:px-6 sm:pt-4 sm:pb-6">
                <Textarea
                  placeholder="Type your reply… (user sees this in the AI Assistant chat)"
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={4}
                  className="min-h-[120px] max-h-[35dvh] resize-none sm:min-h-[140px] focus-visible:ring-2 focus-visible:ring-offset-0"
                />
                <Button
                  onClick={sendResponse}
                  disabled={!responseMessage.trim() || isSending}
                  className="w-full focus-visible:ring-2 focus-visible:ring-offset-0"
                >
                  {isSending ? 'Sending…' : 'Send via AI Assistant'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}