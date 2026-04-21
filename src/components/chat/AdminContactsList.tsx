import { CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Inbox, MessageCircle } from 'lucide-react';
import { getDisplayAvatarUrl } from '@/lib/avatar';

export interface AdminContact {
  id: number | string;
  name: string;
  image: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount?: number;
  isOnline?: boolean;
  lastSeen?: string;
  isTyping?: boolean;
  publicKey?: string;
  userRole?: string;
  hasFlaggedMessages?: boolean;
  isRequest?: boolean; // Messages sent TO admin (user requesting help)
  lastMessageFromAdmin?: boolean;
  [key: string]: any;
}

interface AdminContactsListProps {
  contacts: AdminContact[];
  selectedContact: AdminContact | null;
  onSelectContact: (contact: AdminContact) => void;
  renderContactDetail: (contact: AdminContact) => React.ReactNode;
}

const AdminContactsList = ({
  contacts,
  selectedContact,
  onSelectContact,
  renderContactDetail,
}: AdminContactsListProps) => {
  // Separate contacts into categories
  const requests = contacts.filter((c) => c.isRequest || (c.unread && !c.lastMessageFromAdmin));
  const flagged = contacts.filter(
    (c) => c.hasFlaggedMessages && !c.isRequest && (c.lastMessageFromAdmin || !c.unread)
  );
  const allConversations = contacts.filter((c) => !c.isRequest && !c.hasFlaggedMessages);

  const renderContactItem = (contact: AdminContact) => {
    const isSelected = selectedContact?.id === contact.id;

    return (
      <button
        type="button"
        key={contact.id}
        onClick={() => onSelectContact(contact)}
        className={`flex w-full text-left gap-3 p-4 hover:bg-muted/50 transition-colors border-l-4 ${
          isSelected
            ? 'bg-muted/50 border-primary'
            : contact.hasFlaggedMessages
              ? 'border-red-500'
              : contact.isRequest
                ? 'border-blue-500'
                : 'border-transparent'
        }`}
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <img
              src={getDisplayAvatarUrl(contact.name, contact.image)}
              alt={contact.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getDisplayAvatarUrl(contact.name);
              }}
            />
          </div>
          {/* Online status indicator */}
          {contact.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          )}
          {/* Unread message indicator */}
          {contact.unread && contact.unreadCount !== undefined && contact.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
              {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-medium truncate">{contact.name}</h3>
              {contact.hasFlaggedMessages && (
                <AlertTriangle
                  className="h-4 w-4 text-red-600 flex-shrink-0"
                  aria-label="Flagged messages"
                />
              )}
              {contact.isRequest && (
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 border-blue-300 text-xs flex-shrink-0"
                >
                  New Request
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{contact.timestamp}</span>
          </div>
          {renderContactDetail(contact)}
          <p
            className={`text-sm truncate mt-1 ${
              contact.unread && !contact.lastMessageFromAdmin
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {contact.lastMessage}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <CardHeader className="py-4 flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Conversations</h2>
          {requests.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <div className="flex-1 overflow-y-auto min-h-0">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
            <Inbox className="h-12 w-12 mb-4 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm mt-1">User requests and conversations will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Requests Section */}
            {requests.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Requests ({requests.length})
                    </h3>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                    Users waiting for your response
                  </p>
                </div>
                {requests.map((contact) => renderContactItem(contact))}
              </div>
            )}

            {/* Flagged Section */}
            {flagged.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
                      Flagged ({flagged.length})
                    </h3>
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Conversations with flagged messages
                  </p>
                </div>
                {flagged.map((contact) => renderContactItem(contact))}
              </div>
            )}

            {/* All Conversations Section */}
            {allConversations.length > 0 && (
              <div>
                {(requests.length > 0 || flagged.length > 0) && (
                  <div className="px-4 py-2 bg-muted/50 border-b sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">
                        All Conversations ({allConversations.length})
                      </h3>
                    </div>
                  </div>
                )}
                {allConversations.map((contact) => renderContactItem(contact))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContactsList;
