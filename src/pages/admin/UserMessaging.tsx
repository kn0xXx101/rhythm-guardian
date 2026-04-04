// Admin User Messaging Page
// Allows admin to message individual users and send broadcasts

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Search, MessageSquare, Send } from 'lucide-react';
import { BroadcastMessage } from '@/components/admin/BroadcastMessage';
import { MessageSystemTest } from '@/components/admin/MessageSystemTest';
import { useNavigate } from 'react-router-dom';

interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  status: string;
}

export default function UserMessaging() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, role, avatar_url, status')
        .neq('role', 'admin')
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Transform data to match User interface
      const transformedData = (data || []).map((profile: any) => ({
        user_id: profile.user_id,
        full_name: profile.full_name || 'Unknown User',
        email: profile.email || '', // Email might not be available
        role: profile.role,
        avatar_url: profile.avatar_url,
        status: profile.status || 'active',
      }));

      setUsers(transformedData);
      setFilteredUsers(transformedData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageUser = (userId: string) => {
    // Navigate to admin chat page with this user selected
    navigate(`/admin/chat?user=${userId}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">User Messaging</h1>
        <p className="text-muted-foreground">Message individual users or broadcast to groups</p>
      </div>

      {/* Broadcast Message Section */}
      <BroadcastMessage />

      {/* Message System Test */}
      <MessageSystemTest />

      {/* Individual User Messaging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message Individual Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No users found matching your search' : 'No users found'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.full_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{user.full_name}</span>
                        <Badge variant={user.role === 'musician' ? 'default' : 'secondary'} className="text-xs">
                          {user.role}
                        </Badge>
                        {user.status !== 'active' && (
                          <Badge variant="outline" className="text-xs">
                            {user.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.role} • {user.status}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleMessageUser(user.user_id)}>
                    <Send className="w-4 h-4 mr-2" />
                    Message
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