import { useState, useEffect, useRef } from 'react';
import {
  getConversationMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
  subscribeToMessageUpdates,
  subscribeToTypingIndicators,
  updateTypingIndicator,
  type Message,
  type TypingIndicator,
} from '@/services/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  onBack?: () => void;
}

export function ChatWindow({ conversationId, currentUserId, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadMessages();
    markConversationRead(conversationId, currentUserId);

    // Subscribe to new messages
    const messageChannel = subscribeToMessages(conversationId, (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
      
      // Mark as read if not from current user
      if (message.sender_id !== currentUserId) {
        markConversationRead(conversationId, currentUserId);
      }
    });

    // Subscribe to message updates
    const updateChannel = subscribeToMessageUpdates(conversationId, (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
      );
    });

    // Subscribe to typing indicators
    const typingChannel = subscribeToTypingIndicators(conversationId, (indicators) => {
      setTypingUsers(indicators.filter((i) => i.user_id !== currentUserId));
    });

    return () => {
      messageChannel.unsubscribe();
      updateChannel.unsubscribe();
      typingChannel.unsubscribe();
    };
  }, [conversationId, currentUserId]);

  const loadMessages = async () => {
    try {
      const data = await getConversationMessages(conversationId);
      setMessages(data);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(conversationId, currentUserId, newMessage.trim());
      setNewMessage('');
      setReplyingTo(null);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update typing indicator
    updateTypingIndicator(conversationId, currentUserId);

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      // Typing indicator will expire automatically after 10 seconds
    }, 8000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Find the replied-to message
  const getReplyToMessage = (replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    return messages.find((msg) => msg.id === replyToId);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h2 className="font-semibold">Chat</h2>
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId;
          const isDeleted = message.is_deleted;
          const replyToMessage = getReplyToMessage(message.reply_to_id);
          const isReply = !!replyToMessage;

          return (
            <div
              key={message.id}
              className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar for received messages */}
              {!isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {message.sender?.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] md:max-w-[60%]`}>
                {/* Sender name for received messages */}
                {!isOwn && (
                  <span className="text-xs text-gray-500 mb-1 px-3">
                    {message.sender?.full_name}
                  </span>
                )}

                {/* Message Bubble */}
                <div
                  className={`relative group ${
                    isDeleted ? 'opacity-60' : ''
                  }`}
                >
                  {/* Reply Preview */}
                  {isReply && replyToMessage && (
                    <div
                      className={`mb-1 px-3 py-2 rounded-t-2xl border-l-4 text-xs ${
                        isOwn
                          ? 'bg-blue-600/90 border-blue-300 text-blue-50'
                          : 'bg-gray-200 border-primary text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1 opacity-90">
                        <Reply className="w-3 h-3" />
                        <span className="font-semibold">
                          {replyToMessage.sender_id === currentUserId ? 'You' : replyToMessage.sender?.full_name}
                        </span>
                      </div>
                      <p className="truncate opacity-80 text-xs">
                        {replyToMessage.content}
                      </p>
                    </div>
                  )}

                  {/* Message Content Bubble */}
                  <div
                    className={`px-4 py-2.5 shadow-sm ${
                      isOwn
                        ? isReply
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-l-2xl rounded-tr-2xl rounded-br-md'
                          : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
                        : isReply
                          ? 'bg-white text-gray-900 border border-gray-200 rounded-r-2xl rounded-tl-2xl rounded-bl-md'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-md'
                    }`}
                  >
                    {isDeleted ? (
                      <p className="text-sm italic opacity-70">This message was deleted</p>
                    ) : (
                      <>
                        {(!message.message_type || message.message_type === 'text') && (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                        )}
                        {message.message_type === 'file' && (
                          <div className="flex items-center gap-2">
                            <span>📎</span>
                            <a
                              href={message.file_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm underline hover:no-underline"
                            >
                              {message.file_name}
                            </a>
                          </div>
                        )}
                        {message.message_type === 'image' && (
                          <img
                            src={message.file_url || ''}
                            alt={message.file_name || 'Image'}
                            className="max-w-full rounded-lg"
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Message Actions - Show on hover */}
                  {!isDeleted && (
                    <button
                      onClick={() => handleReply(message)}
                      className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white shadow-md hover:bg-gray-50 ${
                        isOwn ? '-left-10' : '-right-10'
                      }`}
                      title="Reply"
                    >
                      <Reply className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>

                {/* Message Info */}
                <div className={`flex items-center gap-2 mt-1 px-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs text-gray-400">
                    {message.created_at && formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {message.is_edited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>
              </div>

              {/* Avatar for sent messages */}
              {isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    You
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex gap-2 items-center pl-12">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {typingUsers[0]?.user_name || 'Someone'} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 border-t bg-white">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-4 pt-3 pb-2 border-b bg-blue-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                  <Reply className="w-3 h-3" />
                  <span className="font-semibold">
                    Replying to {replyingTo.sender_id === currentUserId ? 'yourself' : replyingTo.sender?.full_name}
                  </span>
                </div>
                <p className="text-sm text-gray-700 truncate bg-white rounded px-2 py-1">
                  {replyingTo.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelReply}
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-blue-100"
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                placeholder={replyingTo ? 'Type your reply...' : 'Type a message...'}
                disabled={sending}
                className="pr-12 py-6 rounded-full border-2 border-gray-200 focus:border-blue-400 transition-colors"
              />
            </div>
            <Button 
              onClick={handleSend} 
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
