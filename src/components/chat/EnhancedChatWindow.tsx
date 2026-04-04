import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MessagingGuard } from './MessagingGuard';
import { SuggestedMessages } from './SuggestedMessages';
import { LocationSharing } from './LocationSharing';
import { ReminderPreferences } from './ReminderPreferences';
import { 
  getConversationMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
  type SimpleMessage,
} from '@/services/simple-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, MapPin, Bell, Sparkles, ArrowLeft, Shield, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface EnhancedChatWindowProps {
  otherUserId: string;
  otherUserName: string;
  bookingId?: string;
  onBack?: () => void;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
}

interface BookingInfo {
  id: string;
  event_type: string;
  event_date?: string | null;
  location?: string | null;
  payment_status: string | null;
  status: string | null;
}

export function EnhancedChatWindow({ 
  otherUserId, 
  otherUserName, 
  bookingId,
  onBack 
}: EnhancedChatWindowProps) {
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [messageVariables, setMessageVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUserProfile();
    if (bookingId) {
      loadBookingInfo();
    }
  }, [otherUserId, bookingId]);

  useEffect(() => {
    // Update message variables when user or booking data changes
    if (otherUser && user) {
      const variables: Record<string, string> = {
        musician_name: otherUser.role === 'musician' ? otherUser.full_name : user.full_name || '',
        hirer_name: otherUser.role === 'hirer' ? otherUser.full_name : user.full_name || '',
        name: otherUser.full_name,
      };

      if (booking) {
        variables.event_type = booking.event_type;
        variables.event_date = booking.event_date ? new Date(booking.event_date).toLocaleDateString() : 'TBD';
        variables.location = booking.location || 'TBD';
        variables.amount = 'GHS 0.00'; // This would come from booking amount
      }

      setMessageVariables(variables);
    }
  }, [otherUser, user, booking]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, avatar_url')
        .eq('user_id', otherUserId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }
      
      // Map user_id to id for consistency with interface
      const userProfile = {
        id: data.user_id,
        full_name: data.full_name,
        role: data.role,
        avatar_url: data.avatar_url,
      };
      
      setOtherUser(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadBookingInfo = async () => {
    if (!bookingId) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, event_type, event_date, location, payment_status, status')
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error loading booking info:', error);
        return;
      }
      setBooking(data);
    } catch (error) {
      console.error('Error loading booking info:', error);
    }
  };

  const handleSuggestedMessage = (_selectedMessage: string) => {
    // This would be passed to the chat component to insert the message
    setShowSuggestions(false);
    // The actual implementation would depend on how SimpleChatWindow handles message insertion
  };

  if (!user || !otherUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <MessagingGuard
      otherUserId={otherUserId}
      otherUserName={otherUserName}
      otherUserRole={otherUser.role as 'musician' | 'hirer'}
    >
      <div className="flex flex-col h-full">
        {/* Header with booking info */}
        <div className="flex-shrink-0 border-b bg-white">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex-1">
                <h2 className="font-semibold">{otherUserName}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Badge variant="outline">{otherUser.role}</Badge>
                  {booking && (
                    <>
                      <span>•</span>
                      <span>{booking.event_type}</span>
                      {booking.event_date && (
                        <>
                          <span>•</span>
                          <span>{new Date(booking.event_date).toLocaleDateString()}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setShowSuggestions(!showSuggestions)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Quick Messages
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </TabsTrigger>
                {bookingId && (
                  <>
                    <TabsTrigger value="location" className="gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </TabsTrigger>
                    <TabsTrigger value="reminders" className="gap-2">
                      <Bell className="w-4 h-4" />
                      Reminders
                    </TabsTrigger>
                  </>
                )}
                <TabsTrigger value="info" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Info
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                <SimpleChatWindow
                  currentUserId={user.id}
                  otherUserId={otherUserId}
                  otherUserName={otherUserName}
                />
              </TabsContent>

              {bookingId && (
                <>
                  <TabsContent value="location" className="flex-1 overflow-y-auto p-4 m-0">
                    <LocationSharing bookingId={bookingId} />
                  </TabsContent>

                  <TabsContent value="reminders" className="flex-1 overflow-y-auto p-4 m-0">
                    <ReminderPreferences 
                      bookingId={bookingId} 
                      eventDate={booking?.event_date || undefined}
                    />
                  </TabsContent>
                </>
              )}

              <TabsContent value="info" className="flex-1 overflow-y-auto p-4 m-0">
                <div className="space-y-4">
                  {/* Security Info */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold">Security & Anti-Fraud</h3>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>✓ Payment verified before messaging enabled</p>
                        <p>✓ User identity and risk assessment completed</p>
                        <p>✓ All messages are monitored for safety</p>
                        <p>✓ Secure transaction environment</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Booking Info */}
                  {booking && (
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">Booking Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Event Type:</span>
                            <span>{booking.event_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Date:</span>
                            <span>
                              {booking.event_date 
                                ? new Date(booking.event_date).toLocaleDateString()
                                : 'TBD'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span>{booking.location || 'TBD'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Status:</span>
                            <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}>
                              {booking.payment_status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Booking Status:</span>
                            <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* User Info */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Contact Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span>{otherUser.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Role:</span>
                          <Badge variant="outline">{otherUser.role}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Suggested Messages Sidebar */}
          {showSuggestions && (
            <div className="w-80 border-l bg-gray-50 overflow-y-auto">
              <div className="p-4">
                <SuggestedMessages
                  onSelectMessage={handleSuggestedMessage}
                  variables={messageVariables}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </MessagingGuard>
  );
}