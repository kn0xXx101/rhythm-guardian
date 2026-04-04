import { memo, useMemo } from 'react';
import { Search, CheckCircle, AlertTriangle, Clock, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaggedChat } from './types';

interface FlaggedChatListProps {
  flaggedChats: FlaggedChat[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedChat: FlaggedChat | null;
  onSelectChat: (chat: FlaggedChat) => void;
  liveChatActive: boolean;
}

export const FlaggedChatList = memo(
  ({
    flaggedChats,
    searchTerm,
    setSearchTerm,
    selectedChat,
    onSelectChat,
    liveChatActive,
  }: FlaggedChatListProps) => {
    // Filter chats based on search and tab
    const filteredChats = useMemo(() => {
      return flaggedChats.filter((chat) => {
        const names = chat.participantNames || chat.participants;
        return (
          names.some((name) => name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          chat.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }, [flaggedChats, searchTerm]);

    const pendingChats = useMemo(
      () => filteredChats.filter((chat) => chat.status === 'pending'),
      [filteredChats]
    );
    const resolvedChats = useMemo(
      () => filteredChats.filter((chat) => chat.status === 'resolved'),
      [filteredChats]
    );

    const getSeverityBadge = (severity: string) => {
      switch (severity) {
        case 'low':
          return (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              Low
            </Badge>
          );
        case 'medium':
          return (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
              Medium
            </Badge>
          );
        case 'high':
          return (
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
              High
            </Badge>
          );
        case 'critical':
          return <Badge variant="destructive">Critical</Badge>;
        default:
          return <Badge variant="outline">Unknown</Badge>;
      }
    };

    return (
      <>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {liveChatActive ? (
              <>
                <MessageCircle className="h-5 w-5 text-primary" />
                Live Messages
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Flagged Messages
              </>
            )}
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={liveChatActive ? 'Search live chats...' : 'Search flagged chats...'}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="pending" className="flex-1">
                Pending ({pendingChats.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex-1">
                Resolved ({resolvedChats.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending tab content */}
            <TabsContent value="pending">
              <ScrollArea className="h-[400px]">
                {pendingChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mb-2" />
                    <p>No pending flagged chats</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingChats.map((chat) => (
                      <button
                        key={chat.id}
                        type="button"
                        className={`w-full text-left p-3 border rounded-md transition-colors ${
                          selectedChat?.id === chat.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => onSelectChat(chat)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm">{chat.id}</div>
                          {getSeverityBadge(chat.severity)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {(chat.participantNames || chat.participants).join(' & ')}
                        </div>
                        <p className="text-sm line-clamp-2 bg-muted p-2 rounded-sm">
                          "{chat.flaggedMessage}"
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(chat.flaggedTime).toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Resolved tab content */}
            <TabsContent value="resolved">
              <ScrollArea className="h-[400px]">
                {resolvedChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mb-2" />
                    <p>No resolved flagged chats</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resolvedChats.map((chat) => (
                      <button
                        key={chat.id}
                        type="button"
                        className={`w-full text-left p-3 border rounded-md transition-colors ${
                          selectedChat?.id === chat.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => onSelectChat(chat)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm">{chat.id}</div>
                          <Badge variant="outline">Resolved</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {(chat.participantNames || chat.participants).join(' & ')}
                        </div>
                        <p className="text-sm line-clamp-2 bg-muted p-2 rounded-sm opacity-70">
                          "{chat.flaggedMessage}"
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(chat.flaggedTime).toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </>
    );
  }
);

FlaggedChatList.displayName = 'FlaggedChatList';
