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
    <div className="w-full flex flex-col flex-1 min-h-0 animate-fade-in">
      <div className="flex-shrink-0">
        {typeof title === 'string' ? (
          <DashboardHeader heading={title}>
            {actions}
          </DashboardHeader>
        ) : (
          title
        )}
      </div>

      <Card variant="glass" className="flex-1 min-h-0 max-h-[calc(100dvh-11rem)] overflow-hidden flex flex-col mt-4 sm:max-h-[calc(100dvh-10rem)]">
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
