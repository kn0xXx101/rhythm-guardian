import { type Conversation } from '@/services/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentUserId: string;
  loading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
  loading,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-gray-500 text-center">
          No conversations yet. Start chatting with musicians or hirers!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const otherUser =
          conversation.participant_1_id === currentUserId
            ? {
                name: conversation.participant_2_name,
                avatar: conversation.participant_2_avatar,
              }
            : {
                name: conversation.participant_1_name,
                avatar: conversation.participant_1_avatar,
              };

        const isSelected = conversation.id === selectedId;
        const hasUnread = (conversation.unread_count || 0) > 0;

        return (
          <button
            key={conversation.id}
            onClick={() => conversation.id && onSelect(conversation.id)}
            className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b ${
              isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage src={otherUser.avatar || undefined} />
              <AvatarFallback>
                {otherUser.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`font-semibold truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                  {otherUser.name || 'Unknown User'}
                </h3>
                {conversation.last_message_at && (
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(conversation.last_message_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>

              {conversation.booking_event_type && (
                <p className="text-xs text-blue-600 mb-1">
                  📅 {conversation.booking_event_type}
                </p>
              )}

              <div className="flex items-center justify-between">
                <p
                  className={`text-sm truncate ${
                    hasUnread ? 'font-medium text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {conversation.last_message_preview || 'No messages yet'}
                </p>
                {hasUnread && (
                  <Badge variant="default" className="ml-2 flex-shrink-0">
                    {conversation.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
