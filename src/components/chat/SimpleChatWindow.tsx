// Simple Chat Window - Works with simple messages table
import { useState, useEffect, useRef } from 'react';
import {
  getConversationMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
  type SimpleMessage,
} from '@/services/simple-chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SimpleChatWindowProps {
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  onBack?: () => void;
}

export function SimpleChatWindow({
  currentUserId,
  otherUserId,
  otherUserName,
  onBack,
}: SimpleChatWindowProps) {
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    markConversationRead(currentUserId, otherUserId);

    // Subscribe to new messages
    const channel = subscribeToMessages(currentUserId, otherUserId, (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();

      // Mark as read if from other user
      if (message.sender_id === otherUserId) {
        markConversationRead(currentUserId, otherUserId);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId, otherUserId]);

  const loadMessages = async () => {
    try {
      const data = await getConversationMessages(currentUserId, otherUserId);
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
      const sent = await sendMessage(currentUserId, otherUserId, newMessage.trim());
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {otherUserName?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <h2 className="font-semibold">{otherUserName}</h2>
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId;

          return (
            <div key={message.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {/* Avatar for received messages */}
              {!isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                  <AvatarImage src={message.sender?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {message.sender?.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] md:max-w-[60%]`}>
                {/* Sender name for received messages */}
                {!isOwn && (
                  <span className="text-xs text-gray-500 mb-1 px-3">{message.sender?.full_name}</span>
                )}

                {/* Message Bubble */}
                <div
                  className={`px-4 py-2.5 shadow-sm ${
                    isOwn
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                </div>

                {/* Message Info */}
                <div className={`flex items-center gap-2 mt-1 px-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {isOwn && message.read && <span className="text-xs text-gray-400">✓ Read</span>}
                </div>
              </div>

              {/* Avatar for sent messages */}
              {isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                  <AvatarFallback className="bg-blue-500 text-white text-xs">You</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 border-t bg-white p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
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
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}