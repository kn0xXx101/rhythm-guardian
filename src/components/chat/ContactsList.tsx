import React, { useRef, useEffect, useState, memo } from 'react';
import { CardHeader } from '@/components/ui/card';
import type { Contact } from '@/types/chat';
import { Bot } from 'lucide-react';
import { AI_ASSISTANT_ID } from '@/services/ai-assistant';
import { VirtualList } from '@/components/ui/virtual-list';

// Re-export Contact type for convenience
export type { Contact };

interface ContactsListProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
  renderContactDetail: (contact: Contact) => React.ReactNode;
}

const ContactsList = memo(
  ({ contacts, selectedContact, onSelectContact, renderContactDetail }: ContactsListProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
      setScrollElement(scrollContainerRef.current);
    }, []);

    return (
      <div className="flex flex-col h-full min-h-0">
        <CardHeader className="py-4 flex-shrink-0 border-b">
          <h2 className="font-semibold">Conversations</h2>
        </CardHeader>
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0"
          style={{ scrollBehavior: 'smooth' }}
        >
          <VirtualList
            items={contacts}
            scrollElement={scrollElement}
            estimateSize={80}
            threshold={30}
            emptyMessage={
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <p>No contacts yet</p>
                <p className="text-sm mt-1">Your chat conversations will appear here</p>
              </div>
            }
            getItemKey={(contact) => contact.id}
            itemClassName=""
            renderItem={(contact) => (
              <button
                type="button"
                onClick={() => onSelectContact(contact)}
                className={`flex w-full text-left gap-3 p-4 hover:bg-muted/50 transition-colors ${selectedContact?.id === contact.id ? 'bg-muted/50' : ''
                  }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {contact.id === AI_ASSISTANT_ID ? (
                      <Bot className="w-6 h-6 text-white" />
                    ) : (
                      <img
                        src={contact.image || '/placeholder.svg'}
                        alt={contact.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    )}
                  </div>
                  {/* Online status indicator */}
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                  {/* Unread message indicator */}
                  {contact.unread && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium truncate">{contact.name}</h3>
                    <span className="text-xs text-muted-foreground">{contact.timestamp}</span>
                  </div>
                  {renderContactDetail(contact)}
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {contact.lastMessage}
                  </p>
                </div>
              </button>
            )}
          />
        </div>
      </div>
    );
  }
);

ContactsList.displayName = 'ContactsList';

export default ContactsList;
