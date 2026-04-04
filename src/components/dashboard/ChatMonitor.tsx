import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatMonitorService } from '@/services/chat-monitor';
import { auditService } from '@/services/audit';
import { FlaggedChatList } from './chat-monitor/FlaggedChatList';
import { FlaggedChatDetail } from './chat-monitor/FlaggedChatDetail';
import { EmptyChatDetail } from './chat-monitor/EmptyChatDetail';
import { LiveChatMonitor } from './chat-monitor/LiveChatMonitor';
import { FlaggedChat, ChatMessage, MonitoredMessage } from './chat-monitor/types';

export function ChatMonitor() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<FlaggedChat | null>(null);
  const [flaggedChats, setFlaggedChats] = useState<FlaggedChat[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [monitoredMessages, setMonitoredMessages] = useState<MonitoredMessage[]>([]);
  const { toast } = useToast();

  // Fetch flagged chats on component mount and refresh periodically
  useEffect(() => {
    const fetchFlaggedChats = async () => {
      try {
        const chats = await chatMonitorService.getFlaggedChats();
        setFlaggedChats(chats);
      } catch (error) {
        console.error('Error fetching flagged chats:', error);
        // Don't show error toast, just log it
        setFlaggedChats([]);
      }
    };

    fetchFlaggedChats();

    const interval = setInterval(fetchFlaggedChats, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [toast]);

  // Live chat monitoring subscription
  useEffect(() => {
    const subscription = chatMonitorService.subscribeToMessages((message) => {
      setMonitoredMessages((prev) => {
        const next = [message, ...prev];
        // Keep only the most recent 100 messages
        return next.slice(0, 100);
      });
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe?.();
      }
    };
  }, []);

  const handleChatSelect = useCallback(
    async (chat: FlaggedChat) => {
      setSelectedChat(chat);

      try {
        const [senderId, receiverId] = chat.participants;

        if (!senderId || !receiverId) {
          throw new Error('Invalid chat participants');
        }

        const history = await chatMonitorService.getChatHistory(senderId, receiverId);
        setChatHistory(history);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch chat history',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleResolve = useCallback(
    async (chatId: string) => {
      try {
        await chatMonitorService.resolveFlaggedChat(chatId);

        setFlaggedChats((prevChats) =>
          prevChats.map((chat) => (chat.id === chatId ? { ...chat, status: 'resolved' } : chat))
        );

        toast({
          title: 'Chat issue resolved',
          description: `Chat ${chatId} has been marked as resolved.`,
        });

        setSelectedChat((prevChat) =>
          prevChat?.id === chatId ? { ...prevChat, status: 'resolved' } : prevChat
        );

        await auditService.logEvent({
          action: 'admin_resolve_flagged_chat',
          entityType: 'chat',
          entityId: chatId,
          description: 'Resolved flagged chat conversation',
          metadata: {
            chatId,
          },
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to resolve chat',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleWarn = useCallback(
    async (chatId: string) => {
      try {
        await chatMonitorService.updateMessageFlag(chatId, true, 'Warning issued by admin');
        await chatMonitorService.sendWarningToSender(chatId);
        toast({
          title: 'Warning issued',
          description: 'A warning has been sent to the sender of the flagged message.',
          variant: 'default',
        });

        await auditService.logEvent({
          action: 'admin_warn_chat_user',
          entityType: 'chat',
          entityId: chatId,
          description: 'Issued warning to user for flagged chat message',
          metadata: {
            chatId,
          },
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to issue warning',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Chat Monitor
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Chat List Panel */}
        <Card className="xl:col-span-1">
          <FlaggedChatList
            flaggedChats={flaggedChats}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedChat={selectedChat}
            onSelectChat={handleChatSelect}
            liveChatActive={false}
          />
        </Card>

        {/* Chat Detail Panel */}
        <Card className="xl:col-span-2">
          {selectedChat ? (
            <FlaggedChatDetail
              selectedChat={selectedChat}
              chatHistory={chatHistory}
              onResolve={handleResolve}
              onWarn={handleWarn}
            />
          ) : (
            <EmptyChatDetail liveChatActive={false} />
          )}
        </Card>

        {/* Live Chat Monitoring Panel */}
        <Card className="xl:col-span-1">
          <LiveChatMonitor monitoredMessages={monitoredMessages} />
        </Card>
      </div>
    </div>
  );
}

export default ChatMonitor;
