import { useState, useEffect } from 'react';
import { getSuggestedMessages, useSuggestedMessage, replaceMessageVariables, type SuggestedMessage } from '@/services/anti-fraud';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Sparkles, Clock, MapPin, CreditCard, Star } from 'lucide-react';

interface SuggestedMessagesProps {
  onSelectMessage: (message: string) => void;
  variables?: Record<string, string>;
  className?: string;
}

const categoryIcons = {
  booking_inquiry: MessageSquare,
  payment_confirmation: CreditCard,
  event_details: Clock,
  location_sharing: MapPin,
  post_event: Star,
  general: Sparkles,
};

const categoryLabels = {
  booking_inquiry: 'Booking Inquiry',
  payment_confirmation: 'Payment',
  event_details: 'Event Details',
  location_sharing: 'Location',
  post_event: 'Post-Event',
  general: 'General',
};

export function SuggestedMessages({ onSelectMessage, variables = {}, className }: SuggestedMessagesProps) {
  const [messages, setMessages] = useState<SuggestedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadSuggestedMessages();
  }, []);

  const loadSuggestedMessages = async () => {
    try {
      const data = await getSuggestedMessages();
      setMessages(data);
    } catch (error) {
      console.error('Error loading suggested messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async (message: SuggestedMessage) => {
    try {
      // Replace variables in the message template
      const processedMessage = replaceMessageVariables(message.message_template, variables);
      
      // Track usage
      await useSuggestedMessage(message.id);
      
      // Update local usage count
      setMessages(prev => 
        prev.map(m => 
          m.id === message.id 
            ? { ...m, usage_count: m.usage_count + 1 }
            : m
        )
      );
      
      // Send the message
      onSelectMessage(processedMessage);
    } catch (error) {
      console.error('Error using suggested message:', error);
    }
  };

  const filteredMessages = selectedCategory === 'all' 
    ? messages 
    : messages.filter(m => m.category === selectedCategory);

  const categories = Array.from(new Set(messages.map(m => m.category)));

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          Quick Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <div className="px-4 pb-3">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              {categories.slice(0, 5).map(category => {
                const Icon = categoryIcons[category as keyof typeof categoryIcons];
                return (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    <Icon className="w-3 h-3 mr-1" />
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="max-h-64 overflow-y-auto px-4 pb-4">
            <TabsContent value={selectedCategory} className="mt-0 space-y-2">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No suggested messages available</p>
                </div>
              ) : (
                filteredMessages.map((message) => {
                  const Icon = categoryIcons[message.category as keyof typeof categoryIcons];
                  const processedMessage = replaceMessageVariables(message.message_template, variables);
                  
                  return (
                    <Button
                      key={message.id}
                      variant="ghost"
                      className="w-full h-auto p-3 text-left justify-start hover:bg-blue-50 border border-gray-200 hover:border-blue-300"
                      onClick={() => handleSelectMessage(message)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2 leading-relaxed">
                            {processedMessage}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {categoryLabels[message.category as keyof typeof categoryLabels]}
                            </Badge>
                            {message.usage_count > 0 && (
                              <span className="text-xs text-gray-500">
                                Used {message.usage_count} times
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })
              )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}