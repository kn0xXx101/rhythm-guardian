import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserConversations, type SimpleConversation } from '@/services/simple-chat-fixed';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EnhancedChatWindow } from '@/components/chat/EnhancedChatWindow';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<SimpleConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      const data = await getUserConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to view messages</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-gray-50">
      {/* Conversation List - Fixed, no scrolling */}
      <div className={`${selectedUserId ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r bg-white flex-col`}>
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-4 border-b">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Messages
          </h1>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm mt-2">Start a conversation by messaging someone</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherUserId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;
              const otherUserName = conv.participant1_id === user.id ? conv.participant2_name : conv.participant1_name;
              const otherUserAvatar = conv.participant1_id === user.id ? conv.participant2_avatar : conv.participant1_avatar;
              
              return (
                <button
                  key={otherUserId}
                  onClick={() => setSelectedUserId(otherUserId)}
                  className={`w-full p-4 border-b hover:bg-gray-50 transition-colors text-left ${
                    selectedUserId === otherUserId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={otherUserAvatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {otherUserName?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate">{otherUserName}</span>
                        {(conv.unread_count || 0) > 0 && (
                          <Badge variant="default" className="ml-2">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conv.last_message_preview}</p>
                      <span className="text-xs text-gray-400">
                        {conv.last_message_at
                          ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                          : 'No messages'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Window - Only messages scroll */}
      <div className={`${selectedUserId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {selectedUserId ? (
          <EnhancedChatWindow
            otherUserId={selectedUserId}
            otherUserName={
              (() => {
                const conv = conversations.find((c) => {
                  const otherUserId = c.participant1_id === user.id ? c.participant2_id : c.participant1_id;
                  return otherUserId === selectedUserId;
                });
                return conv ? (conv.participant1_id === user.id ? conv.participant2_name : conv.participant1_name) || 'User' : 'User';
              })()
            }
            onBack={() => setSelectedUserId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
