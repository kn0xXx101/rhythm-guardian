import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

interface ChatLayoutProps {
  title: string | ReactNode;
  actions?: ReactNode;
  contactsList: ReactNode;
  chatArea: ReactNode;
}

const ChatLayout = ({ title, actions, contactsList, chatArea }: ChatLayoutProps) => {
  return (
    <div className="w-full h-full animate-fade-in flex flex-col">
      <div className="flex-shrink-0">
        {typeof title === 'string' ? (
          <DashboardHeader heading={title}>
            {actions}
          </DashboardHeader>
        ) : (
          title
        )}
      </div>

      <Card variant="glass" className="flex-1 overflow-hidden flex flex-col min-h-0 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full min-h-0">
          {/* Contacts list */}
          <div className="border-r flex flex-col min-h-0 overflow-hidden">{contactsList}</div>

          {/* Chat area */}
          <div className="col-span-2 flex flex-col h-full min-h-0 overflow-hidden">{chatArea}</div>
        </div>
      </Card>
    </div>
  );
};

export default ChatLayout;
