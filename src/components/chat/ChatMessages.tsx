import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { AI_ASSISTANT_ID } from '@/services/ai-assistant';
import {
  Shield,
  Check,
  CheckCheck,
  Clock,
  Flag,
  Trash2,
  Reply,
  Edit2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { chatMonitorService } from '@/services/chat-monitor';
import { VirtualList } from '@/components/ui/virtual-list';
import type { Message } from '@/types/chat';

type MessageItem =
  | { type: 'message'; message: Message; index: number; showDateSeparator: boolean }
  | { type: 'dateSeparator'; date: string; key: string };

const ChatMessages = memo(() => {
  const { messages, typingIndicators, activeContactId, contacts, deleteMessage, sendMessage } =
    useChat();
  const { toast } = useToast();
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setScrollElement(messagesContainerRef.current);
  }, []);

  // Prepare items with date separators for virtual scrolling
  const messageItems = useMemo<MessageItem[]>(() => {
    const formatDateSeparator = (date: Date) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 86400000);
      const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (msgDay.getTime() === today.getTime()) {
        return 'Today';
      } else if (msgDay.getTime() === yesterday.getTime()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString([], {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
      }
    };

    const items: MessageItem[] = [];
    messages.forEach((msg, index) => {
      const showDateSeparator =
        index === 0 ||
        (() => {
          const prevMsg = messages[index - 1];
          if (!prevMsg) return false;
          const prevDate = new Date(prevMsg.timestamp);
          const currDate = new Date(msg.timestamp);
          const prevDay = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
          const currDay = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
          return prevDay.getTime() !== currDay.getTime();
        })();

      if (showDateSeparator) {
        items.push({
          type: 'dateSeparator',
          date: formatDateSeparator(new Date(msg.timestamp)),
          key: `date-${msg.id}`,
        });
      }

      items.push({
        type: 'message',
        message: msg,
        index,
        showDateSeparator: false,
      });
    });

    return items;
  }, [messages]);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  // Scroll to bottom when active contact changes
  useEffect(() => {
    // Small timeout to allow virtual list to calculate sizes
    const timeoutId = setTimeout(() => {
      scrollToBottom('auto');
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [activeContactId]);

  // Auto-scroll to bottom when new messages arrive,
  // but don't yank the user back down if they're reading history.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    // Only auto-scroll if the user is already near the bottom (within 150px)
    // or if it's the very first load of messages
    if (distanceFromBottom < 150) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  // Get message status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" aria-label="Sending" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" aria-label="Sent" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-blue-600" aria-label="Delivered" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-green-600" aria-label="Read" />;
      default:
        return null;
    }
  };

  // Get typing indicator for active contact
  const activeTypingIndicator = typingIndicators.find(
    (indicator) => indicator.contactId === activeContactId && indicator.isTyping
  );

  const handleReportMessage = async (messageId: string) => {
    try {
      setReportingMessageId(messageId);
      await chatMonitorService.updateMessageFlag(messageId, true, 'Reported by user from chat');
      toast({
        title: 'Message reported',
        description: 'Our team will review this conversation.',
      });
    } catch (error) {
      console.error('Failed to report message:', error);
      toast({
        title: 'Error',
        description: 'Failed to report message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setReportingMessageId(null);
    }
  };

  const handleEditMessage = (messageId: string) => {
    setEditingMessageId(messageId);
    // Dispatch event to trigger MessageInput to enter edit mode
    const event = new CustomEvent('startEditMessage', { detail: { messageId } });
    window.dispatchEvent(event);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      setDeletingMessageId(messageId);
      await deleteMessage(messageId);
      toast({
        title: 'Message deleted',
        description: 'The message has been deleted.',
      });
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingMessageId(null);
    }
  };

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 min-h-0">
      {!activeContactId ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center space-y-2">
            <p>Select a contact to start chatting</p>
            <p className="text-xs">Your messages are end-to-end encrypted when enabled</p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center space-y-2">
            <p>No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        </div>
      ) : (
        <>
          <VirtualList
            items={messageItems}
            scrollElement={scrollElement}
            estimateSize={120}
            threshold={100}
            className="flex flex-col space-y-4"
            itemClassName=""
            getItemKey={(item) => (item.type === 'message' ? item.message.id : item.key)}
            renderItem={(item) => {
              if (item.type === 'dateSeparator') {
                return (
                  <div className="flex items-center justify-center my-2">
                    <div className="px-3 py-1 bg-muted/50 rounded-full text-xs text-muted-foreground">
                      {item.date}
                    </div>
                  </div>
                );
              }

              const { message: msg } = item;

              return (
                <div className={`flex ${msg.isSender ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-xl p-3 relative transition-all duration-200 hover:shadow-md group ${
                      msg.isSender
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {/* Encryption indicator */}
                    {msg.isEncrypted && (
                      <div className="absolute -top-1 -right-1 animate-in zoom-in duration-300">
                        <Badge
                          variant="secondary"
                          className="h-5 w-5 p-0 rounded-full bg-green-600 hover:bg-green-700 hover:scale-110 transition-all duration-200 cursor-help"
                          title="End-to-end encrypted"
                        >
                          <Shield className="h-3 w-3 text-white" />
                        </Badge>
                      </div>
                    )}

                    {/* Reply preview */}
                    {msg.replyToMessage && (
                      <div
                        className={`mb-2 p-2 rounded-lg border-l-2 ${
                          msg.isSender
                            ? 'bg-primary/20 border-primary/40'
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Reply className="h-3 w-3 opacity-60" />
                          <span className="text-xs opacity-70 font-medium">
                            {msg.replyToMessage.isSender
                              ? 'You'
                              : contacts.find((c) => c.id === msg.replyToMessage?.senderId)?.name ||
                                'User'}
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2 opacity-80 truncate">
                          {msg.replyToMessage.isDeleted
                            ? 'This message was deleted'
                            : msg.replyToMessage.text}
                        </p>
                      </div>
                    )}

                    {/* Message content */}
                    <div className="space-y-1">
                      {msg.isDeleted ? (
                        <p className="break-words italic opacity-60">This message was deleted</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="break-words">{msg.text}</p>
                          {/* AI Assistant Escalation Button */}
                          {activeContactId === AI_ASSISTANT_ID && 
                           !msg.isSender && 
                           msg.text.includes('connect you with an administrator') && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2 w-full border-primary/20 hover:bg-primary/10"
                              onClick={() => sendMessage(AI_ASSISTANT_ID, 'connect to admin')}
                            >
                              Connect to Admin
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Message metadata and actions */}
                      <div
                        className={`flex items-center justify-between text-xs gap-2 ${
                          msg.isSender ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Show edited indicator */}
                          {msg.isEdited && <span className="italic opacity-70">edited</span>}
                          {/* Timestamp - show date if older than today */}
                          <span className="whitespace-nowrap">
                            {(() => {
                              const msgDate = new Date(msg.timestamp);
                              const now = new Date();
                              const today = new Date(
                                now.getFullYear(),
                                now.getMonth(),
                                now.getDate()
                              );
                              const msgDay = new Date(
                                msgDate.getFullYear(),
                                msgDate.getMonth(),
                                msgDate.getDate()
                              );

                              if (msgDay.getTime() === today.getTime()) {
                                // Today - show time only
                                return msgDate.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                              } else if (msgDay.getTime() === today.getTime() - 86400000) {
                                // Yesterday
                                return `Yesterday ${msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                              } else {
                                // Older - show date and time
                                return msgDate.toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                              }
                            })()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Status indicator for sent messages */}
                          {msg.isSender && (
                            <div className="flex items-center gap-1">
                              {msg.isEncrypted && <Shield className="h-3 w-3" />}
                              {getStatusIcon(msg.status)}
                            </div>
                          )}

                          {/* Edit, Reply, and Delete buttons (only for sent messages) */}
                          {msg.isSender && !msg.isDeleted && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-xs hover:scale-110 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const event = new CustomEvent('startReplyMessage', {
                                    detail: { messageId: msg.id },
                                  });
                                  window.dispatchEvent(event);
                                }}
                                title="Reply to message"
                              >
                                <Reply className="h-3 w-3" />
                                <span className="sr-only">Reply to message</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-xs hover:scale-110 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                onClick={() => handleEditMessage(msg.id)}
                                disabled={editingMessageId === msg.id}
                                title="Edit message"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span className="sr-only">Edit message</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-xs text-destructive/60 hover:text-destructive hover:bg-destructive/10 hover:scale-110 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                onClick={() => handleDeleteMessage(msg.id)}
                                disabled={deletingMessageId === msg.id}
                                title="Delete message"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span className="sr-only">Delete message</span>
                              </Button>
                            </>
                          )}

                          {/* Reply and Report buttons (only for received messages) */}
                          {!msg.isSender && !msg.isDeleted && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-xs hover:scale-110 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const event = new CustomEvent('startReplyMessage', {
                                    detail: { messageId: msg.id },
                                  });
                                  window.dispatchEvent(event);
                                }}
                                title="Reply to message"
                              >
                                <Reply className="h-3 w-3" />
                                <span className="sr-only">Reply to message</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-xs text-destructive/60 hover:text-destructive hover:bg-destructive/10 hover:scale-110 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReportMessage(msg.id);
                                }}
                                disabled={reportingMessageId === msg.id}
                                title="Report message"
                              >
                                <Flag className="h-3 w-3" />
                                <span className="sr-only">Report message</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Edited indicator */}
                      {msg.isEdited && (
                        <div
                          className={`text-xs italic ${
                            msg.isSender ? 'text-primary-foreground/60' : 'text-muted-foreground/60'
                          }`}
                        >
                          edited{' '}
                          {msg.editedAt &&
                            new Date(msg.editedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
          />
          {/* Typing indicator - always render at bottom, not virtualized */}
          {activeTypingIndicator && (
            <div className="flex justify-start">
              <div className="max-w-[70%] rounded-xl p-3 bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    ></div>
                  </div>
                  <span className="text-xs">
                    {contacts.find((c) => c.id === activeContactId)?.name || 'Contact'} is typing...
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
});

ChatMessages.displayName = 'ChatMessages';

export default ChatMessages;
