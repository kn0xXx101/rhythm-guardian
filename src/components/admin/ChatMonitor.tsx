// Admin Chat Monitoring Dashboard
// Allows admins to monitor all conversations and respond quickly

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { MessageSquare, AlertCircle, Search, Filter, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_name: string;
  user2_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  flagged: boolean;
}

export function ChatMonitor() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFlagged, setFilterFlagged] = useState(false);

  useEffect(() => {
    loadConversations();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin-chat-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);

      // Get all recent conversations
      const { data: messages, error } = await (supabase as any)
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          flagged,
          sender:profiles!messages_sender_id_fkey(full_name),
          receiver:profiles!messages_receiver_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group messages into conversations
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((msg: any) => {
        const user1 = msg.sender_id < msg.receiver_id ? msg.sender_id : msg.receiver_id;
        const user2 = msg.sender_id < msg.receiver_id ? msg.receiver_id : msg.sender_id;
        const convKey = `${user1}-${user2}`;

        if (!conversationMap.has(convKey)) {
          conversationMap.set(convKey, {
            id: convKey,
            user1_id: user1,
            user2_id: user2,
            user1_name: msg.sender_id === user1 ? msg.sender?.full_name : msg.receiver?.full_name,
            user2_name: msg.sender_id === user2 ? msg.sender?.full_name : msg.receiver?.full_name,
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
            flagged: msg.flagged || false,
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      !searchQuery ||
      conv.user1_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.user2_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = !filterFlagged || conv.flagged;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Chat Monitor</h2>
          <p className="text-muted-foreground">Monitor and manage all platform conversations</p>
        </div>
        <Button onClick={loadConversations} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversations.filter((c) => c.flagged).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                conversations.filter((c) => {
                  const msgDate = new Date(c.last_message_at);
                  const today = new Date();
                  return msgDate.toDateString() === today.toDateString();
                }).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversations.filter((c) => c.unread_count > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={filterFlagged ? 'default' : 'outline'}
              onClick={() => setFilterFlagged(!filterFlagged)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {filterFlagged ? 'Show All' : 'Flagged Only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No conversations found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{conv.user1_name}</span>
                      <span className="text-muted-foreground">↔</span>
                      <span className="font-semibold">{conv.user2_name}</span>
                      {conv.flagged && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                    </span>
                  </div>
                  <Button size="sm" variant="outline">
                    View Chat
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}