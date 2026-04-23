import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Shield, ShieldOff, Loader2, X, Reply, AlertCircle, Ticket, HelpCircle, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AI_ASSISTANT_ID } from '@/services/ai-assistant';
import type { Message } from '@/types/chat';
import { analyzeChatMessageForRisks } from '@/lib/anti-scam-chat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MessageInput = () => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [encryptMessage, setEncryptMessage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [riskDialogReasons, setRiskDialogReasons] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sendMessage,
    replyMessage,
    editMessage,
    messages,
    activeContactId,
    setTyping,
    chatSettings,
    isEncryptionEnabled,
    contacts,
    messagingEnabled,
  } = useChat();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const isAIAssistant = activeContactId === AI_ASSISTANT_ID;
  const aiQuickActions =
    userRole === 'musician'
      ? [
          { label: 'Ticket Status', icon: Ticket, text: 'Check my support tickets status', color: 'text-blue-500' },
          { label: 'Talk to Admin', icon: UserPlus, text: 'Connect to admin', color: 'text-orange-500' },
          { label: 'Booking Requests', icon: HelpCircle, text: 'How do I manage booking requests?', color: 'text-green-500' },
          { label: 'Payout Setup', icon: Shield, text: 'How do I set up payout details and get paid?', color: 'text-purple-500' },
        ]
      : [
          { label: 'Ticket Status', icon: Ticket, text: 'Check my support tickets status', color: 'text-blue-500' },
          { label: 'Talk to Admin', icon: UserPlus, text: 'Connect to admin', color: 'text-orange-500' },
          { label: 'How to Book', icon: HelpCircle, text: 'Help with booking', color: 'text-green-500' },
          { label: 'Payments', icon: Shield, text: 'Payments, fees, and refunds', color: 'text-purple-500' },
        ];

  const handleQuickAction = async (text: string) => {
    if (!activeContactId || isSending || !messagingEnabled) return;
    setIsSending(true);
    try {
      await sendMessage(activeContactId, text, false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send quick action.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicators - broadcast to contact when user is typing
  useEffect(() => {
    if (!activeContactId || !chatSettings.privacy.typingIndicators) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (message.trim() && !isTyping) {
      setIsTyping(true);
      // Broadcast typing event to contact (not showing indicator for self)
      setTyping(activeContactId, true);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        // Broadcast that user stopped typing
        setTyping(activeContactId, false);
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, activeContactId, isTyping, setTyping, chatSettings.privacy.typingIndicators]);

  // Auto-encrypt based on settings
  useEffect(() => {
    if (chatSettings.encryption.autoEncrypt && isEncryptionEnabled) {
      setEncryptMessage(true);
    }
  }, [chatSettings.encryption.autoEncrypt, isEncryptionEnabled]);

  // Listen for reply/edit events from ChatMessages
  useEffect(() => {
    const handleStartReply = (e: CustomEvent) => {
      const { messageId } = e.detail;
      const msg = messages.find((m) => m.id === messageId);
      if (msg) {
        setReplyingTo(msg);
        setEditingMessage(null);
      }
    };

    const handleStartEdit = (e: CustomEvent) => {
      const { messageId } = e.detail;
      const msg = messages.find((m) => m.id === messageId);
      if (msg && msg.isSender) {
        setEditingMessage(msg);
        setMessage(msg.text);
        setReplyingTo(null);
      }
    };

    window.addEventListener('startReplyMessage', handleStartReply as EventListener);
    window.addEventListener('startEditMessage', handleStartEdit as EventListener);

    return () => {
      window.removeEventListener('startReplyMessage', handleStartReply as EventListener);
      window.removeEventListener('startEditMessage', handleStartEdit as EventListener);
    };
  }, [messages]);

  // Clear reply/edit when contact changes
  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setMessage('');
  }, [activeContactId]);

  const executeSendFlow = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || !activeContactId || isSending || !messagingEnabled) return;

    setIsSending(true);

    if (isTyping) {
      setIsTyping(false);
      setTyping(activeContactId, false);
    }

    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, trimmed);
        setEditingMessage(null);
        toast({
          title: 'Message edited',
          description: 'Your message has been updated.',
        });
      } else if (replyingTo) {
        await replyMessage(activeContactId, trimmed, replyingTo.id, encryptMessage);
        setReplyingTo(null);
      } else {
        await sendMessage(activeContactId, trimmed, encryptMessage);
      }
      setMessage('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send message. Please try again.',
      });
    } finally {
      setIsSending(false);
    }
  }, [
    message,
    activeContactId,
    isSending,
    messagingEnabled,
    isTyping,
    setTyping,
    editingMessage,
    replyingTo,
    encryptMessage,
    editMessage,
    replyMessage,
    sendMessage,
    toast,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !activeContactId || isSending || !messagingEnabled) return;

    if (!isAIAssistant) {
      const analysis = analyzeChatMessageForRisks(trimmed);
      if (analysis.shouldWarn && analysis.reasons.length > 0) {
        setRiskDialogReasons(analysis.reasons);
        setRiskDialogOpen(true);
        return;
      }
    }

    await executeSendFlow();
  };

  const handleConfirmRiskySend = async () => {
    setRiskDialogOpen(false);
    setRiskDialogReasons([]);
    await executeSendFlow();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const toggleEncryption = () => {
    if (isEncryptionEnabled) {
      setEncryptMessage(!encryptMessage);
    }
  };

  return (
    <div className="p-3 sm:p-4 border-t bg-background flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Quick Actions for AI Assistant */}
      {isAIAssistant && messagingEnabled && !editingMessage && !replyingTo && (
        <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {aiQuickActions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full flex items-center gap-1.5 text-xs bg-muted/30 border-muted hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
              onClick={() => handleQuickAction(action.text)}
              disabled={isSending}
            >
              <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {!isAIAssistant && messagingEnabled && (
        <Alert className="mb-3 border-amber-500/40 bg-amber-500/5">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs leading-relaxed text-foreground/90">
            <span className="font-medium text-foreground">Anti-scam:</span> Keep payment and booking changes on the
            platform. Do not share bank details, OTPs, passwords, or &quot;pay me directly&quot; instructions. Use{' '}
            <strong>Report message</strong> on anything abusive or suspicious.
          </AlertDescription>
        </Alert>
      )}

      {/* Messaging disabled warning */}
      {!messagingEnabled && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Messaging is currently disabled by the administrator. Please contact support if you need
            assistance.
          </AlertDescription>
        </Alert>
      )}
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-2 p-2 bg-muted rounded-lg border-l-2 border-primary relative">
          <div className="flex items-center gap-2 mb-1">
            <Reply className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium">
              Replying to{' '}
              {replyingTo.isSender
                ? 'yourself'
                : contacts.find((c) => c.id === replyingTo.senderId)?.name || 'user'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{replyingTo.text}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={cancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Edit indicator */}
      {editingMessage && (
        <div className="mb-2 p-2 bg-primary/10 rounded-lg border-l-2 border-primary relative">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Editing message</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto"
              onClick={cancelEdit}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder={
                editingMessage
                  ? 'Edit your message...'
                  : activeContactId
                    ? 'Type a message...'
                    : 'Select a contact to start chatting'
              }
              value={message}
              onChange={handleInputChange}
              className="flex-1"
              disabled={!activeContactId || isSending || !messagingEnabled}
              maxLength={chatSettings.encryption.enabled ? 1000 : 2000} // Shorter for encrypted messages
            />

            {/* Encryption toggle button */}
            {isEncryptionEnabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={encryptMessage ? 'default' : 'outline'}
                      size="icon"
                      onClick={toggleEncryption}
                      disabled={!activeContactId}
                      className={encryptMessage ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {encryptMessage ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <ShieldOff className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {encryptMessage
                        ? 'Message will be encrypted'
                        : 'Message will not be encrypted'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Send button */}
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || !activeContactId || isSending || !messagingEnabled}
              className="shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Status indicators */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {encryptMessage && isEncryptionEnabled && (
                <span className="flex items-center gap-1 text-green-600">
                  <Shield className="h-3 w-3" />
                  End-to-end encrypted
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span>
                {message.length}/{chatSettings.encryption.enabled ? 1000 : 2000}
              </span>
              {chatSettings.notifications.enabled && (
                <span className="text-green-600">Notifications on</span>
              )}
            </div>
          </div>
        </div>
      </form>

      <AlertDialog
        open={riskDialogOpen}
        onOpenChange={(open) => {
          setRiskDialogOpen(open);
          if (!open) setRiskDialogReasons([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Double-check this message</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-muted-foreground">
                <p>This message looks like it may involve common scam patterns:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {riskDialogReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                <p className="text-foreground/90">
                  You can edit the message to remove off-platform payment or sensitive details, or send anyway if you
                  are sure it is appropriate.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRiskDialogReasons([])}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmRiskySend()}>Send anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MessageInput;
