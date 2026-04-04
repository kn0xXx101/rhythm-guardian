import { MessageSquare, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MonitoredMessage } from './types';

interface LiveChatMonitorProps {
  monitoredMessages: MonitoredMessage[];
}

export const LiveChatMonitor = ({ monitoredMessages }: LiveChatMonitorProps) => {
  return (
    <>
      <CardHeader>
        <CardTitle>Live Chat Monitoring</CardTitle>
        <CardDescription>Real-time monitoring of all messages across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {monitoredMessages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">From: {message.senderId}</p>
                    <Badge variant="outline" className="text-xs">
                      To: {message.receiverId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 p-3 rounded-md bg-muted">{message.text}</div>
                </div>
              </div>
            ))}

            {monitoredMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                <h3 className="text-xl font-medium mb-2">No Messages Yet</h3>
                <p className="text-center max-w-md">
                  Live messages will appear here as users chat with each other.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </>
  );
};
