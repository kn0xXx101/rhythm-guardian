import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import ChatLayout from '@/components/chat/ChatLayout';
import AdminContactsList, { AdminContact } from '@/components/chat/AdminContactsList';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessages from '@/components/chat/ChatMessages';
import MessageInput from '@/components/chat/MessageInput';
import ChatSettings from '@/components/chat/ChatSettings';
import AdminContactDetail from '@/components/chat/AdminContactDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Shield, Bell, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AI_ASSISTANT_ID } from '@/services/ai-assistant';
import type { Contact } from '@/types/chat';

const AdminChat = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<AdminContact | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contactsRef = useRef<AdminContact[]>([]);

  const { setActiveContactId, updateContactStatus, chatSettings, isEncryptionEnabled } = useChat();

  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Keep ref in sync with contacts state
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchContacts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const uniqueContacts = new Map<string, AdminContact>();
        const userIds = new Set<string>();

        // Fetch contacts from existing messages (both sent and received)
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('receiver_id, sender_id')
          .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`);

        if (!messagesError && messagesData) {
          messagesData.forEach((msg: any) => {
            const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            if (otherUserId && otherUserId !== user.id) {
              userIds.add(otherUserId);
            }
          });

          // Fetch all profiles for message contacts (exclude admins - only show users)
          if (userIds.size > 0) {
            const { data: messageProfiles, error: messageProfilesError } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url, last_active_at, role')
              .in('user_id', Array.from(userIds))
              .neq('role', 'admin'); // Only fetch non-admin users

            if (!messageProfilesError && messageProfiles) {
              messageProfiles.forEach((profile: any) => {
                const lastActive = profile.last_active_at
                  ? new Date(profile.last_active_at)
                  : new Date();
                const isOnline = new Date().getTime() - lastActive.getTime() < 5 * 60 * 1000;

                uniqueContacts.set(profile.user_id, {
                  id: profile.user_id,
                  name: profile.full_name || 'Unknown User',
                  image: profile.avatar_url || '/placeholder.svg',
                  lastMessage: '',
                  timestamp: '',
                  unread: false,
                  isOnline,
                  lastSeen: profile.last_active_at || new Date().toISOString(),
                  userRole: profile.role || 'user',
                  publicKey: '',
                });
              });
            }
          }
        }

        // Fetch last messages, unread counts, and flagged status for all contacts
        const contactIds = Array.from(uniqueContacts.keys());
        if (contactIds.length > 0) {
          for (const contactId of contactIds) {
            // Fetch last message sent or received with this contact
            const { data: sentMessages } = await supabase
              .from('messages')
              .select('id, content, created_at, sender_id, read')
              .eq('sender_id', user.id)
              .eq('receiver_id', contactId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const { data: receivedMessages } = await supabase
              .from('messages')
              .select('id, content, created_at, sender_id, read')
              .eq('sender_id', contactId)
              .eq('receiver_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Get the most recent message
            let lastMessage = null;
            let lastMessageFromAdmin = false;
            if (sentMessages && receivedMessages) {
              if (new Date(sentMessages.created_at || 0) > new Date(receivedMessages.created_at || 0)) {
                lastMessage = sentMessages;
                lastMessageFromAdmin = true;
              } else {
                lastMessage = receivedMessages;
                lastMessageFromAdmin = false;
              }
            } else if (sentMessages) {
              lastMessage = sentMessages;
              lastMessageFromAdmin = true;
            } else if (receivedMessages) {
              lastMessage = receivedMessages;
              lastMessageFromAdmin = false;
            }

            const contact = uniqueContacts.get(contactId);
            if (contact) {
              if (lastMessage) {
                contact.lastMessage = lastMessage.content?.substring(0, 50) || '';
                contact.timestamp = lastMessage.created_at ? new Date(lastMessage.created_at).toLocaleTimeString() : '';
                contact.lastMessageFromAdmin = lastMessageFromAdmin;
              }

              // Check unread messages from this contact (messages sent TO admin)
              const { count: unreadCount } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('sender_id', contactId)
                .eq('receiver_id', user.id)
                .eq('read', false);

              const unreadCountValue = unreadCount || 0;
              contact.unread = unreadCountValue > 0;
              contact.unreadCount = unreadCountValue;
              // If there are unread messages from user to admin, it's a request
              contact.isRequest = unreadCountValue > 0;

              // Check if this conversation has flagged messages
              const { count: flaggedCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .or(
                  `and(sender_id.eq.${contactId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${contactId})`
                )
                .eq('flagged', true);

              contact.hasFlaggedMessages = (flaggedCount || 0) > 0;
            }
          }
        }

        // Sort contacts: requests first (by unread count desc), then flagged, then by recency
        const allContacts = Array.from(uniqueContacts.values());
        const sortedContacts = allContacts.sort((a, b) => {
          // Requests (unread messages from users) come first
          if (a.isRequest && !b.isRequest) return -1;
          if (!a.isRequest && b.isRequest) return 1;

          // If both are requests, sort by unread count
          if (a.isRequest && b.isRequest) {
            return (b.unreadCount || 0) - (a.unreadCount || 0);
          }

          // Then flagged messages
          if (a.hasFlaggedMessages && !b.hasFlaggedMessages) return -1;
          if (!a.hasFlaggedMessages && b.hasFlaggedMessages) return 1;

          // Then by unread status
          if (a.unread && !b.unread) return -1;
          if (!a.unread && b.unread) return 1;

          // Finally by timestamp (most recent first)
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return bTime - aTime;
        });

        setContacts(sortedContacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setError('Failed to load contacts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [user]);

  // Auto-select contact from URL parameter
  useEffect(() => {
    const userIdFromUrl = searchParams.get('user');
    console.log('AdminChat: URL user parameter:', userIdFromUrl);
    console.log('AdminChat: Contacts loaded:', contacts.length);
    console.log('AdminChat: Currently selected:', selectedContact?.id);
    console.log('AdminChat: Is loading:', isLoading);
    
    if (!userIdFromUrl) return;
    
    // Wait for initial load to complete
    if (isLoading) return;

    // If already selected the right contact, do nothing
    if (selectedContact?.id === userIdFromUrl) {
      console.log('AdminChat: Contact already selected');
      return;
    }

    // Check if contact exists in the list
    const contactToSelect = contacts.find(c => c.id === userIdFromUrl);
    console.log('AdminChat: Found contact in list:', !!contactToSelect);
    
    if (contactToSelect) {
      console.log('AdminChat: Selecting contact:', contactToSelect.name);
      setSelectedContact(contactToSelect);
      setActiveContactId(userIdFromUrl);
    } else {
      // Contact not in list (no previous messages), fetch their profile and add them
      console.log('AdminChat: Contact not in list, fetching profile...');
      
      // Use a ref to prevent multiple fetches
      let isFetching = false;
      
      const fetchAndAddContact = async () => {
        if (isFetching) return;
        isFetching = true;
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, last_active_at, role')
          .eq('user_id', userIdFromUrl)
          .single();

        console.log('AdminChat: Profile fetch result:', { profile, error });

        if (profile) {
          // Double-check the contact wasn't added while we were fetching
          setContacts(prev => {
            const exists = prev.find(c => c.id === profile.user_id);
            if (exists) {
              console.log('AdminChat: Contact already exists, selecting it');
              setSelectedContact(exists);
              setActiveContactId(profile.user_id);
              return prev;
            }
            
            const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : new Date();
            const isOnline = new Date().getTime() - lastActive.getTime() < 5 * 60 * 1000;

            const newContact: AdminContact = {
              id: profile.user_id,
              name: profile.full_name || 'Unknown User',
              image: profile.avatar_url || '/placeholder.svg',
              lastMessage: '',
              timestamp: '',
              unread: false,
              isOnline,
              lastSeen: profile.last_active_at || new Date().toISOString(),
              userRole: profile.role || 'user',
              publicKey: '',
            };

            console.log('AdminChat: Adding new contact:', newContact.name);
            setSelectedContact(newContact);
            setActiveContactId(profile.user_id);
            return [newContact, ...prev];
          });
        } else if (error) {
          console.error('AdminChat: Error fetching profile:', error);
        }
      };
      fetchAndAddContact();
    }
  }, [contacts, searchParams, selectedContact, setActiveContactId, isLoading]);

  // Refresh contact presence (online/offline) periodically
  useEffect(() => {
    if (!chatSettings?.privacy?.onlineStatus || contactsRef.current.length === 0) return;

    let isMounted = true;

    const refreshContactStatuses = async () => {
      const currentContacts = contactsRef.current;
      const contactIds = currentContacts.map((contact) => contact.id?.toString()).filter(Boolean);

      if (contactIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, last_active_at')
        .in('user_id', contactIds);

      if (error) {
        console.error('Error refreshing contact status:', error);
        return;
      }

      if (!isMounted || !data) return;

      setContacts((prev) =>
        prev.map((contact) => {
          const profile = data.find((p: any) => p.user_id === contact.id?.toString());
          if (!profile) return contact;

          const lastSeen = profile.last_active_at || contact.lastSeen || new Date().toISOString();
          const lastActive = profile.last_active_at
            ? new Date(profile.last_active_at)
            : new Date(lastSeen);
          const isOnline = Date.now() - lastActive.getTime() < 5 * 60 * 1000;

          // Sync with chat context for header components
          updateContactStatus(contact.id, { isOnline, lastSeen });

          return { ...contact, isOnline, lastSeen };
        })
      );
    };

    refreshContactStatuses();
    const intervalId = window.setInterval(refreshContactStatuses, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [chatSettings?.privacy?.onlineStatus, updateContactStatus]);

  // Listen for all incoming messages to update contact list
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`all-messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id.eq.${user.id}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          const senderId = msg.sender_id;

          // Skip AI Assistant messages (admin shouldn't chat with AI Assistant)
          if (senderId === AI_ASSISTANT_ID) {
            return;
          }

          // Update contacts list
          setContacts((prev) => {
            const existingContact = prev.find((c) => c.id === senderId);

            if (existingContact) {
              // Fetch updated unread count
              supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('sender_id', senderId)
                .eq('receiver_id', user.id)
                .eq('read', false)
                .then(({ count }) => {
                  setContacts((current) => {
                    const updated = current.map((contact) =>
                      contact.id === senderId
                        ? {
                            ...contact,
                            lastMessage: msg.content?.substring(0, 50) || '',
                            timestamp: new Date(msg.created_at).toLocaleTimeString(),
                            unread: (count || 0) > 0,
                            unreadCount: count || 0,
                            isRequest: (count || 0) > 0,
                            lastMessageFromAdmin: false,
                          }
                        : contact
                    );

                    // Sort contacts with priority
                    const sorted = updated.sort((a, b) => {
                      if (a.isRequest && !b.isRequest) return -1;
                      if (!a.isRequest && b.isRequest) return 1;
                      if (a.hasFlaggedMessages && !b.hasFlaggedMessages) return -1;
                      if (!a.hasFlaggedMessages && b.hasFlaggedMessages) return 1;
                      return (b.unreadCount || 0) - (a.unreadCount || 0);
                    });

                    return sorted;
                  });
                });

              return prev;
            }

            // Contact doesn't exist yet, fetch profile asynchronously
            supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url, last_active_at, role')
              .eq('user_id', senderId)
              .neq('role', 'admin') // Only fetch non-admin users
              .single()
              .then(({ data: profile, error }) => {
                if (error || !profile) {
                  console.error('Error fetching profile for new contact:', error);
                  return;
                }

                const lastActive = profile.last_active_at
                  ? new Date(profile.last_active_at)
                  : new Date();
                const isOnline = new Date().getTime() - lastActive.getTime() < 5 * 60 * 1000;

                // Check for flagged messages and get unread count
                Promise.all([
                  supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .or(
                      `and(sender_id.eq.${senderId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${senderId})`
                    )
                    .eq('flagged', true),
                  supabase
                    .from('messages')
                    .select('id', { count: 'exact' })
                    .eq('sender_id', senderId)
                    .eq('receiver_id', user.id)
                    .eq('read', false),
                ]).then(([{ count: flaggedCount }, { count: unreadCount }]) => {
                  const newContact: AdminContact = {
                    id: senderId,
                    name: profile.full_name || 'Unknown User',
                    image: profile.avatar_url || '/placeholder.svg',
                    lastMessage: msg.content?.substring(0, 50) || '',
                    timestamp: new Date(msg.created_at).toLocaleTimeString(),
                    unread: (unreadCount || 0) > 0,
                    unreadCount: unreadCount || 0,
                    isOnline,
                    lastSeen: profile.last_active_at || new Date().toISOString(),
                    userRole: profile.role || 'user',
                    publicKey: '',
                    hasFlaggedMessages: (flaggedCount || 0) > 0,
                    isRequest: (unreadCount || 0) > 0,
                    lastMessageFromAdmin: false,
                  };

                  // Add new contact and sort
                  setContacts((current) => {
                    // Check again to avoid duplicates (race condition protection)
                    if (current.find((c) => c.id === senderId)) return current;

                    const updated = [...current, newContact];
                    const sorted = updated.sort((a, b) => {
                      if (a.isRequest && !b.isRequest) return -1;
                      if (!a.isRequest && b.isRequest) return 1;
                      if (a.hasFlaggedMessages && !b.hasFlaggedMessages) return -1;
                      if (!a.hasFlaggedMessages && b.hasFlaggedMessages) return 1;
                      return (b.unreadCount || 0) - (a.unreadCount || 0);
                    });

                    return sorted;
                  });
                });
              });

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Listen for messages sent by admin to update contact list
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`admin-sent-messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id.eq.${user.id}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          const receiverId = msg.receiver_id;

          // Skip AI Assistant
          if (receiverId === AI_ASSISTANT_ID) return;

          // Update contact list with admin's sent message
          setContacts((prev) => {
            const existingContact = prev.find((c) => c.id === receiverId);
            if (!existingContact) return prev;

            return prev.map((contact) =>
              contact.id === receiverId
                ? {
                    ...contact,
                    lastMessage: msg.content?.substring(0, 50) || '',
                    timestamp: new Date(msg.created_at).toLocaleTimeString(),
                    lastMessageFromAdmin: true,
                    // If admin replied, it's no longer a request
                    isRequest: false,
                    unread: false,
                    unreadCount: 0,
                  }
                : contact
            );
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Search users by name or email
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, last_active_at, role, email')
        .neq('role', 'admin')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      const results: AdminContact[] = (data || []).map((p: any) => {
        const lastActive = p.last_active_at ? new Date(p.last_active_at) : new Date(0);
        const isOnline = Date.now() - lastActive.getTime() < 5 * 60 * 1000;
        return {
          id: p.user_id,
          name: p.full_name || 'Unknown',
          image: p.avatar_url || '/placeholder.svg',
          lastMessage: '',
          timestamp: '',
          unread: false,
          isOnline,
          lastSeen: p.last_active_at || new Date().toISOString(),
          userRole: p.role || 'user',
          publicKey: '',
        };
      });
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (contact: AdminContact) => {
    // Add to contacts list if not already there
    setContacts((prev) => {
      if (prev.find((c) => c.id === contact.id)) return prev;
      return [contact, ...prev];
    });
    handleSelectContact(contact);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update active contact in chat context when selected contact changes
  const handleSelectContact = (contact: AdminContact | Contact) => {
    const adminContact = contact as AdminContact;
    setSelectedContact(adminContact);
    setActiveContactId(adminContact.id);

    // Mark as read when selecting (reset request status)
    setContacts((prev) =>
      prev.map((c) =>
        c.id === adminContact.id ? { ...c, unread: false, unreadCount: 0, isRequest: false } : c
      )
    );

    // Update contact status in context
    updateContactStatus(adminContact.id, adminContact);
  };

  const renderContactDetail = (contact: AdminContact) => {
    if (!contact) return null;

    return (
      <div className="space-y-2">
        <AdminContactDetail userRole={contact.userRole || 'user'} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {contact.isOnline ? (
            <Badge variant="default" className="bg-green-600">
              Online
            </Badge>
          ) : (
            <Badge variant="secondary">
              {contact.lastSeen
                ? `Last seen ${new Date(contact.lastSeen).toLocaleTimeString()}`
                : 'Offline'}
            </Badge>
          )}
          {isEncryptionEnabled && contact.publicKey && (
            <Badge variant="outline" className="text-green-600">
              <Shield className="h-3 w-3 mr-1" />
              Encrypted
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderHeaderDetail = () => {
    if (!selectedContact) return null;

    return (
      <div className="flex items-center gap-2">
        <AdminContactDetail userRole={selectedContact.userRole || 'user'} />
        <div className="flex items-center gap-1">
          {selectedContact.isOnline ? (
            <Badge variant="default" className="bg-green-600 text-xs">
              Online
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Offline
            </Badge>
          )}
          {isEncryptionEnabled && selectedContact.publicKey && (
            <Badge variant="outline" className="text-green-600 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              E2E
            </Badge>
          )}
        </div>
      </div>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-64 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-8 w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="text-xl font-semibold">Chat Settings</h1>
          <Button variant="outline" onClick={() => setShowSettings(false)}>
            Back to Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatSettings />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout
      title="Messages"
      actions={
        <div className="flex items-center gap-2">
          {chatSettings?.notifications?.enabled && (
            <Badge variant="outline" className="text-green-600">
              <Bell className="h-3 w-3 mr-1" />
              Notifications
            </Badge>
          )}
          {isEncryptionEnabled && (
            <Badge variant="outline" className="text-green-600">
              <Shield className="h-3 w-3 mr-1" />
              Encrypted
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      }
      contactsList={
        <div className={`flex flex-col h-full min-h-0 ${selectedContact ? 'hidden md:flex' : ''}`}>
          {/* Search bar */}
          <div className="p-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowSearch(true)}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {showSearch && searchQuery && (
              <div className="mt-1 border rounded-md bg-background shadow-lg max-h-64 overflow-y-auto z-10">
                {isSearching ? (
                  <div className="p-3 text-sm text-muted-foreground">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No users found</div>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={result.image} />
                        <AvatarFallback>{result.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{result.userRole}</p>
                      </div>
                      {result.isOnline && (
                        <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Contacts list */}
          <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Use the search above to find a user and start a conversation
            </p>
          </div>
        ) : (
          <AdminContactsList
            contacts={contacts}
            selectedContact={selectedContact}
            onSelectContact={handleSelectContact}
            renderContactDetail={renderContactDetail}
          />
        )
          }
          </div>
        </div>
      }
      chatArea={
        <div className={`flex flex-col h-full min-h-0 overflow-hidden ${selectedContact ? '' : 'hidden md:flex'}`}>
          {selectedContact ? (
            <>
              <ChatHeader
                contact={selectedContact}
                renderDetailComponent={renderHeaderDetail}
                onBack={() => {
                  setSelectedContact(null);
                  setActiveContactId(null);
                }}
              />
              <ChatMessages />
              <MessageInput />
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-0">
                Select a contact to start chatting
              </div>
              <MessageInput />
            </>
          )}
        </div>
      }
    />
  );
};

export default AdminChat;
