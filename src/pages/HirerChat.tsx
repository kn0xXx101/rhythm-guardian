import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ChatLayout from '@/components/chat/ChatLayout';
import ContactsList, { Contact } from '@/components/chat/ContactsList';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessages from '@/components/chat/ChatMessages';
import MessageInput from '@/components/chat/MessageInput';
import ChatSettings from '@/components/chat/ChatSettings';
import HirerContactDetail from '@/components/chat/HirerContactDetail';
import { Button } from '@/components/ui/button';
import { Settings, Shield, Bell, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'react-router-dom';
import { AI_ASSISTANT_ID } from '@/services/ai-assistant';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ChatSearchBar, type SearchContact } from '@/components/chat/ChatSearchBar';
import { useToast } from '@/hooks/use-toast';

interface HirerContact extends Contact {
  instrument: string;
}

const HirerChat = () => {
  console.log('[HirerChat] Component rendering...');
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState<HirerContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<HirerContact | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contactsRef = useRef<HirerContact[]>([]);

  console.log('[HirerChat] Auth state:', { user: !!user, isAuthLoading });

  const {
    setActiveContactId,
    updateContactStatus,
    chatSettings,
    isEncryptionEnabled,
    messages: allMessagesFromContext,
  } = useChat();

  // Get AI Assistant last message
  const aiAssistantMessages = (allMessagesFromContext as Record<string, any>)?.[AI_ASSISTANT_ID] || [];
  const aiAssistantLastMessage =
    aiAssistantMessages.length > 0
      ? aiAssistantMessages[aiAssistantMessages.length - 1]?.text || 'Ask me anything about the platform!'
      : 'Ask me anything about the platform!';
  const aiAssistantTimestamp =
    aiAssistantMessages.length > 0
      ? new Date(aiAssistantMessages[aiAssistantMessages.length - 1]?.timestamp || Date.now()).toLocaleTimeString()
      : '';
  const aiAssistantUnread =
    aiAssistantMessages.length > 0 &&
    !aiAssistantMessages[aiAssistantMessages.length - 1]?.isSender;

  // Keep ref in sync with contacts state
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  console.log('[HirerChat] Chat context loaded');

  // Update AI Assistant contact when messages change
  useEffect(() => {
    setContacts((prev) => {
      return prev.map((contact) => {
        if (contact.id === AI_ASSISTANT_ID) {
          return {
            ...contact,
            lastMessage: aiAssistantLastMessage.substring(0, 50),
            timestamp: aiAssistantTimestamp,
            unread: aiAssistantUnread && selectedContact?.id !== AI_ASSISTANT_ID,
            instrument: contact.instrument || 'Support',
          } as HirerContact;
        }
        return contact;
      });
    });
  }, [aiAssistantLastMessage, aiAssistantTimestamp, aiAssistantUnread, selectedContact?.id, AI_ASSISTANT_ID]);

  // Fetch musician profile when user param is present
  useEffect(() => {
    const userIdParam = searchParams.get('user');
    if (!userIdParam || !user) return;

    const loadMusicianContact = async () => {
      try {
        // Fetch musician profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, instruments, last_active_at')
          .eq('user_id', userIdParam)
          .single();

        if (error) throw error;
        if (!profile) return;

        const { data: paidBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('hirer_id', user.id)
          .eq('musician_id', userIdParam)
          .eq('payment_status', 'paid')
          .limit(1)
          .maybeSingle();

        if (!paidBooking) {
          toast({
            variant: 'destructive',
            title: 'Payment required',
            description:
              'You can message this musician after you complete payment on an accepted booking.',
          });
          setSearchParams({});
          return;
        }

        const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : new Date();
        const isOnline = new Date().getTime() - lastActive.getTime() < 5 * 60 * 1000;

        const musicianContact: HirerContact = {
          id: userIdParam, // Store UUID as string
          name: profile.full_name || 'Unknown Musician',
          image: profile.avatar_url || '/placeholder.svg',
          lastMessage: '',
          timestamp: '',
          unread: false,
          isOnline,
          lastSeen: profile.last_active_at || new Date().toISOString(),
          instrument: (profile.instruments && profile.instruments[0]) || 'Musician',
          publicKey: '',
        };

        // Check if contact already exists
        setContacts((prev) => {
          const exists = prev.find((c) => c.id === musicianContact.id);
          if (exists) return prev;
          return [...prev, musicianContact];
        });

        // Select the contact
        setSelectedContact(musicianContact);
        setActiveContactId(musicianContact.id);
        updateContactStatus(musicianContact.id, musicianContact);

        // Clear the URL param
        setSearchParams({});
      } catch (error) {
        console.error('Error loading musician contact:', error);
      }
    };

    loadMusicianContact();
  }, [searchParams, user, setSearchParams, setActiveContactId, updateContactStatus, toast]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchContacts = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        console.log('[HirerChat] Starting fetchContacts for user:', user.id);
        
        // 1. Get all messages to identify unique conversation partners
        const { data: allMessages, error: messagesError } = await supabase
          .from('messages')
          .select('sender_id, receiver_id, content, created_at, read_at, read')
          .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;
        console.log('[HirerChat] Total messages found:', allMessages?.length);

        // Group messages by partner and track the most recent one
        const partnerMap = new Map<string, any>();
        allMessages?.forEach((msg: any) => {
          const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          if (!partnerId || partnerId === user.id) return;

          if (!partnerMap.has(partnerId)) {
            partnerMap.set(partnerId, {
              lastMessage: msg.content,
              timestamp: msg.created_at,
              unread: !msg.read && !msg.read_at && msg.receiver_id === user.id
            });
          }
        });

        const partnerIds = Array.from(partnerMap.keys());
        console.log('[HirerChat] Unique message partners:', partnerIds);

        // 2. Fetch profiles for all partners
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, last_active_at, role, instruments')
          .in('user_id', partnerIds);

        if (profilesError) throw profilesError;
        console.log('[HirerChat] Profiles fetched:', profiles?.length);

        const uniqueContacts = new Map<string, HirerContact>();

        // Create a map of profiles for quick lookup
        const profileMap = new Map<string, any>();
        profiles?.forEach((profile: any) => {
          profileMap.set(profile.user_id, profile);
        });

        // Add contacts for all partners identified from messages
        partnerIds.forEach((partnerId) => {
          const profile = profileMap.get(partnerId);
          const partnerInfo = partnerMap.get(partnerId);
          
          if (profile) {
            const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : new Date();
            const isOnline = Date.now() - lastActive.getTime() < 5 * 60 * 1000;
            const isAdmin = profile.role === 'admin';

            uniqueContacts.set(partnerId, {
              id: partnerId,
              name: isAdmin ? 'Admin' : (profile.full_name || 'Unknown User'),
              image: profile.avatar_url || '/placeholder.svg',
              lastMessage: partnerInfo.lastMessage?.substring(0, 50) || '',
              timestamp: new Date(partnerInfo.timestamp).toLocaleTimeString(),
              unread: partnerInfo.unread,
              isOnline,
              lastSeen: profile.last_active_at || new Date().toISOString(),
              instrument: isAdmin ? 'Admin Support' : ((profile.instruments && profile.instruments[0]) || 'Musician'),
              publicKey: '',
              rawTimestamp: partnerInfo.timestamp
            } as any);
          } else {
            // No profile found - could be an admin or a deleted user
            // We still show them so the conversation isn't lost
            uniqueContacts.set(partnerId, {
              id: partnerId,
              name: 'Admin', // Default to Admin for unknown partners with messages
              image: '/placeholder.svg',
              lastMessage: partnerInfo.lastMessage?.substring(0, 50) || '',
              timestamp: new Date(partnerInfo.timestamp).toLocaleTimeString(),
              unread: partnerInfo.unread,
              isOnline: false,
              lastSeen: new Date().toISOString(),
              instrument: 'Support',
              publicKey: '',
              rawTimestamp: partnerInfo.timestamp
            } as any);
          }
        });

        // 3. Add musicians from bookings who haven't messaged yet
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('musician_id, profiles!bookings_musician_id_fkey(user_id, full_name, avatar_url, last_active_at, role, instruments)')
          .eq('hirer_id', user.id)
          .eq('payment_status', 'paid')
          .in('status', ['accepted', 'in_progress', 'completed']);

        if (!bookingsError && bookings) {
          bookings.forEach((booking: any) => {
            const profile: any = booking.profiles;
            if (profile && !uniqueContacts.has(profile.user_id)) {
              const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : new Date();
              const isOnline = Date.now() - lastActive.getTime() < 5 * 60 * 1000;
              const isAdmin = profile.role === 'admin';

              uniqueContacts.set(profile.user_id, {
                id: profile.user_id,
                name: isAdmin ? 'Admin' : (profile.full_name || 'Unknown Musician'),
                image: profile.avatar_url || '/placeholder.svg',
                lastMessage: 'Paid booking confirmed',
                timestamp: '',
                unread: false,
                isOnline,
                lastSeen: profile.last_active_at || new Date().toISOString(),
                instrument: isAdmin ? 'Admin Support' : ((profile.instruments && profile.instruments[0]) || 'Musician'),
                publicKey: '',
                rawTimestamp: null
              } as any);
            }
          });
        }

        // 4. Build final list with sorting
        const aiAssistantContact: HirerContact = {
          id: AI_ASSISTANT_ID,
          name: 'AI Assistant',
          image: '/placeholder.svg',
          lastMessage: aiAssistantLastMessage.substring(0, 50),
          timestamp: aiAssistantTimestamp,
          unread: aiAssistantUnread && selectedContact?.id !== AI_ASSISTANT_ID,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          instrument: 'Support',
          publicKey: '',
        };

        const sortedContacts = Array.from(uniqueContacts.values())
          .sort((a: any, b: any) => {
            const timeA = a.rawTimestamp ? new Date(a.rawTimestamp).getTime() : 0;
            const timeB = b.rawTimestamp ? new Date(b.rawTimestamp).getTime() : 0;
            return timeB - timeA;
          });

        setContacts([aiAssistantContact, ...sortedContacts]);
      } catch (error) {
        console.error('[HirerChat] Error in fetchContacts:', error);
        setError('Failed to load contacts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [user, aiAssistantLastMessage, aiAssistantTimestamp, aiAssistantUnread, AI_ASSISTANT_ID]);

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
    const intervalId = window.setInterval(refreshContactStatuses, 30000); // Refresh every 30 seconds for more realistic status

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
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          const senderId = msg.sender_id;

          // Skip AI Assistant messages (handled by context)
          if (senderId === AI_ASSISTANT_ID) return;

          // Update contacts list
          setContacts((prev) => {
            const existingContactIndex = prev.findIndex((c) => c.id === senderId);

            if (existingContactIndex !== -1) {
              const existingContact = prev[existingContactIndex];
              if (!existingContact) return prev;
              
              // Update existing contact with new message info and move to top
              const updated = [...prev];
              updated[existingContactIndex] = {
                ...existingContact,
                lastMessage: msg.content?.substring(0, 50) || '',
                timestamp: new Date(msg.created_at).toLocaleTimeString(),
                unread: selectedContact?.id !== senderId,
                instrument: existingContact.instrument || 'Musician',
              } as HirerContact;

              // Move the updated contact to the beginning
              if (existingContactIndex > 0) {
                const contact = updated[existingContactIndex];
                const withoutContact = [
                  ...updated.slice(0, existingContactIndex),
                  ...updated.slice(existingContactIndex + 1)
                ];
                return [contact, ...withoutContact];
              }
              return updated;
            }

            // Contact doesn't exist yet, fetch profile asynchronously
            supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url, last_active_at, role, instruments')
              .eq('user_id', senderId)
              .single()
              .then(({ data: profile }) => {
                const lastActive = profile?.last_active_at
                  ? new Date(profile.last_active_at)
                  : new Date();
                const isOnline = profile ? (new Date().getTime() - lastActive.getTime() < 5 * 60 * 1000) : false;
                const isAdmin = profile?.role === 'admin' || !profile; // Default to Admin if profile missing

                const newContact: HirerContact = {
                  id: senderId,
                  name: isAdmin ? 'Admin' : (profile?.full_name || 'Unknown User'),
                  image: profile?.avatar_url || '/placeholder.svg',
                  lastMessage: msg.content?.substring(0, 50) || '',
                  timestamp: new Date(msg.created_at).toLocaleTimeString(),
                  unread: true,
                  isOnline,
                  lastSeen: profile?.last_active_at || new Date().toISOString(),
                  instrument: isAdmin ? 'Admin Support' : ((profile?.instruments && profile.instruments[0]) || 'Musician'),
                  publicKey: '',
                };

                // Add new contact to the beginning of the list
                setContacts((current) => {
                  // Check again to avoid duplicates (race condition protection)
                  if (current.find((c) => c.id === senderId)) return current;
                  return [newContact, ...current];
                });
              });

            return prev; // Return unchanged while fetching
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, selectedContact?.id, AI_ASSISTANT_ID]);

  // Update active contact in chat context when selected contact changes
  const handleSelectContact = (contact: Contact) => {
    const hirerContact = contact as HirerContact;
    setSelectedContact(hirerContact);
    setActiveContactId(hirerContact.id);

    // Mark as read when selecting
    setContacts((prev) =>
      prev.map((c) => (c.id === hirerContact.id ? { ...c, unread: false } : c))
    );

    // Update contact status in context
    updateContactStatus(hirerContact.id, hirerContact);
  };

  const handleSearchSelect = async (result: SearchContact) => {
    if (result.role === 'musician' && user?.id && result.id !== AI_ASSISTANT_ID) {
      const { data: paidBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('hirer_id', user.id)
        .eq('musician_id', result.id)
        .eq('payment_status', 'paid')
        .limit(1)
        .maybeSingle();

      if (!paidBooking) {
        toast({
          variant: 'destructive',
          title: 'Payment required',
          description:
            'Complete payment on an accepted booking with this musician before starting a chat.',
        });
        return;
      }
    }

    const newContact: HirerContact = {
      id: result.id,
      name: result.name,
      image: result.image,
      lastMessage: '',
      timestamp: '',
      unread: false,
      isOnline: result.isOnline,
      lastSeen: result.lastSeen,
      instrument: result.role === 'musician' ? 'Musician' : result.role,
      publicKey: '',
    };
    setContacts((prev) => (prev.find((c) => c.id === result.id) ? prev : [newContact, ...prev]));
    handleSelectContact(newContact);
  };

  const renderContactDetail = (contact: Contact) => {
    if (!contact) return null;
    const hirerContact = contact as HirerContact;

    return (
      <div className="space-y-2">
        <HirerContactDetail instrument={hirerContact.instrument || 'Musician'} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {hirerContact.isOnline ? (
            <Badge variant="default" className="bg-green-600">
              Online
            </Badge>
          ) : (
            <Badge variant="secondary">
              {hirerContact.lastSeen
                ? `Last seen ${new Date(hirerContact.lastSeen).toLocaleTimeString()}`
                : 'Offline'}
            </Badge>
          )}
          {isEncryptionEnabled && hirerContact.publicKey && (
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
        <HirerContactDetail instrument={selectedContact.instrument || 'Musician'} />
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

  console.log('[HirerChat] Render state:', {
    isAuthLoading,
    isLoading,
    error,
    contactsCount: contacts.length,
    showSettings,
  });

  if (isAuthLoading) {
    console.log('[HirerChat] Showing auth loading...');
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

  console.log('[HirerChat] Rendering main chat layout');

  return (
    <ChatLayout
      title={
        <DashboardHeader
          heading="Messages"
          text="Chat with musicians and manage your booking communications."
          className="mb-0"
        >
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
        </DashboardHeader>
      }
      contactsList={
        <div className={`flex flex-col h-full min-h-0 ${selectedContact ? 'hidden md:flex' : ''}`}>
          <ChatSearchBar searchRoles={['musician']} onSelect={handleSearchSelect} />
          <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <p className="text-muted-foreground">No active bookings yet</p>
            <p className="text-sm text-muted-foreground mt-2">Search for a musician above to start chatting</p>
          </div>
        ) : (
          <ContactsList
            contacts={contacts}
            selectedContact={selectedContact}
            onSelectContact={handleSelectContact}
            renderContactDetail={renderContactDetail}
          />
        )}
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

export default HirerChat;
