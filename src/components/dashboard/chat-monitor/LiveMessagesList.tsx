import { MessageSquare, Clock } from 'lucide-react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonitoredMessage } from './types';

interface LiveMessagesListProps {
  monitoredMessages: MonitoredMessage[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const LiveMessagesList = ({
  monitoredMessages,
  searchTerm,
  setSearchTerm,
}: LiveMessagesListProps) => {
  // Group messages by contactId for live monitoring
  const messagesByContact = monitoredMessages.reduce(
    (acc, message) => {
      if (!acc[message.contactId]) {
        acc[message.contactId] = [];
      }
      acc[message.contactId].push(message);
      return acc;
    },
    {} as Record<number, MonitoredMessage[]>
  );

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Live Messages
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search live chats..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {Object.keys(messagesByContact).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p>No live messages yet</p>
              <p className="text-xs mt-2">Messages will appear here as users chat</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(messagesByContact).map(([contactId, messages]) => {
                const latestMessage = messages[messages.length - 1];
                return (
                  <div
                    key={contactId}
                    className="p-3 border rounded-md cursor-pointer hover:bg-muted"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm">Contact #{contactId}</div>
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        Live
                      </Badge>
                    </div>
                    <p className="text-sm line-clamp-2 bg-muted p-2 rounded-sm">
                      "{latestMessage.text}"
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(latestMessage.timestamp).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </>
  );
};
