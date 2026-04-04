import React from 'react';
import {
  MessageSquare,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  User,
  Clock,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaggedChat } from './types';

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  timestamp: string;
  flagged?: boolean;
}

interface FlaggedChatDetailProps {
  selectedChat: FlaggedChat;
  chatHistory: ChatMessage[];
  onResolve: (chatId: string) => void;
  onWarn: (chatId: string) => void;
}

export const FlaggedChatDetail = ({
  selectedChat,
  chatHistory,
  onResolve,
  onWarn,
}: FlaggedChatDetailProps) => {
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
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Detail
            </CardTitle>
            <CardDescription>
              Flagged chat between {selectedChat.participants.join(' and ')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onWarn(selectedChat.id)}
              className="flex items-center gap-1"
            >
              <AlertCircle className="h-4 w-4" />
              Warn User
            </Button>
            {selectedChat.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => onResolve(selectedChat.id)}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Resolved
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="bg-muted px-3 py-1 rounded-full text-xs flex items-center gap-1">
            <Flag className="h-3 w-3 text-destructive" />
            <span>Flagged: {new Date(selectedChat.flaggedTime).toLocaleString()}</span>
          </div>
          <div>{getSeverityBadge(selectedChat.severity)}</div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {chatHistory.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.flagged ? 'relative' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{message.sender}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div
                    className={`mt-1 p-3 rounded-md ${
                      message.flagged
                        ? 'bg-destructive/10 border border-destructive/40'
                        : 'bg-muted'
                    }`}
                  >
                    {message.message}
                    {message.flagged && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Flagged message</span>
                      </div>
                    )}
                  </div>
                </div>
                {message.flagged && (
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-destructive rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </>
  );
};
