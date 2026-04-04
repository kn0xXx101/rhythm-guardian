import { MessageSquare } from 'lucide-react';

interface EmptyChatDetailProps {
  liveChatActive: boolean;
}

export const EmptyChatDetail = ({ liveChatActive }: EmptyChatDetailProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
      <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
      <h3 className="text-xl font-medium mb-2">No Chat Selected</h3>
      <p className="text-center max-w-md">
        {liveChatActive
          ? 'Live monitoring is active. Messages will appear in real-time as users chat.'
          : 'Select a flagged chat from the list to view details and take action.'}
      </p>
    </div>
  );
};
