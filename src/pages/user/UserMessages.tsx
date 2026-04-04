import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User } from 'lucide-react';
import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const UserMessages = () => {
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-8rem)]">
      <DashboardHeader
        heading="Messages"
        text="Chat with musicians and manage your conversations."
      />

      <Card variant="glass" className="h-[calc(100%-8rem)] overflow-hidden">
        <CardContent className="flex flex-col h-full p-6">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {/* Sample messages */}
            <div className="flex items-start gap-3">
              <Avatar className="border-2 border-primary/10">
                <AvatarImage src="/avatars/john.jpg" />
                <AvatarFallback className="bg-primary/5">
                  <User className="h-6 w-6 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">John Smith</span>
                  <span className="text-xs text-muted-foreground">10:30 AM</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p>
                    Hi there! I'm interested in booking you for my wedding ceremony on June 15th.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 justify-end">
              <div className="flex-1 space-y-2 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-muted-foreground">10:32 AM</span>
                  <span className="font-semibold text-sm">You</span>
                </div>
                <div className="bg-primary text-primary-foreground rounded-lg p-3 inline-block text-sm">
                  <p>Hello! I'd be happy to discuss the details of your wedding ceremony.</p>
                </div>
              </div>
              <Avatar className="border-2 border-primary/10">
                <AvatarImage src="/avatars/you.jpg" />
                <AvatarFallback className="bg-primary/5">
                  <User className="h-6 w-6 text-primary" />
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex items-start gap-3">
              <Avatar className="border-2 border-primary/10">
                <AvatarImage src="/avatars/john.jpg" />
                <AvatarFallback className="bg-primary/5">
                  <User className="h-6 w-6 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">John Smith</span>
                  <span className="text-xs text-muted-foreground">10:33 AM</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p>
                    Great! It will be at the Grand Ballroom from 2 PM to 6 PM. What's your rate for
                    a 4-hour performance?
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-border/50">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 bg-background/50"
            />
            <Button size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserMessages;
