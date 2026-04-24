import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { auditService } from '@/services/audit';
import {
  rpcAddTicketMessage,
  rpcGetSupportTickets,
  rpcGetTicketMessages,
  rpcResolveTicket,
  type SupportTicketListRow,
  type TicketMessageRow,
} from '@/lib/support-ticket-rpc';

type SupportTicket = SupportTicketListRow & { messages?: TicketMessageRow[] };

const TICKETS_QUERY_KEY = ['admin', 'support-tickets'] as const;

export function SupportTickets() {
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const ticketsQuery = useQuery({
    queryKey: TICKETS_QUERY_KEY,
    queryFn: rpcGetSupportTickets,
    staleTime: 30_000,
  });

  const messagesQuery = useQuery({
    queryKey: ['admin', 'support-ticket-messages', selectedTicketId],
    queryFn: () => rpcGetTicketMessages(selectedTicketId!),
    enabled: Boolean(selectedTicketId),
  });

  const tickets = ticketsQuery.data ?? [];

  const selectedTicket = useMemo((): SupportTicket | null => {
    if (!selectedTicketId) return null;
    const base = tickets.find((t) => t.id === selectedTicketId);
    if (!base) return null;
    return { ...base, messages: messagesQuery.data ?? [] };
  }, [tickets, selectedTicketId, messagesQuery.data]);

  const isLoading = ticketsQuery.isLoading;

  const openTicket = (ticket: SupportTicketListRow) => {
    setSelectedTicketId(ticket.id);
  };

  const sendResponse = async () => {
    if (!selectedTicket || !responseMessage.trim() || !user) return;

    setIsSending(true);
    try {
      await rpcAddTicketMessage({
        ticketId: selectedTicket.id,
        senderType: 'admin',
        senderId: user.id,
        content: responseMessage.trim(),
      });

      await auditService.logEvent({
        action: 'support_ticket_admin_reply',
        entityType: 'support_ticket',
        entityId: selectedTicket.id,
        description: 'Admin sent a reply on a support ticket',
        metadata: { contentLength: responseMessage.trim().length },
      });

      toast({
        title: 'Response Sent',
        description: 'Your response has been sent to the user via AI Assistant',
      });

      setResponseMessage('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'support-ticket-messages', selectedTicket.id] });
      await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
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
    if (!user?.id) return;
    try {
      await rpcResolveTicket({
        ticketId,
        adminId: user.id,
      });

      await auditService.logEvent({
        action: 'support_ticket_resolved',
        entityType: 'support_ticket',
        entityId: ticketId,
        description: 'Admin marked a support ticket as resolved',
      });

      toast({
        title: 'Ticket Resolved',
        description: 'Support ticket has been marked as resolved',
      });

      await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
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
                  openTicket(ticket);
                }
              }}
              className={`rounded-xl border p-3 sm:p-4 cursor-pointer transition-colors active:bg-muted/80 ${
                selectedTicket?.id === ticket.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => openTicket(ticket)}
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
                onClick={() => setSelectedTicketId(null)}
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
            {messagesQuery.isLoading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
                Loading messages…
              </div>
            ) : (
              (() => {
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
              })()
            )}

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
                  disabled={!responseMessage.trim() || isSending || messagesQuery.isLoading}
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
