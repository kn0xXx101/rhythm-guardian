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

      <Card
        variant="glass"
        className="mt-2 sm:mt-3 flex min-h-0 flex-1 flex-col overflow-hidden isolate h-[calc(100dvh-9.5rem)] sm:h-[calc(100dvh-10.75rem)] md:h-[calc(100dvh-11.25rem)]"
      >
        <div className="grid h-full min-h-0 overflow-hidden grid-cols-1 md:grid-cols-3">
          {/* Contacts list */}
          <div className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
            {contactsList}
          </div>

          {/* Chat area */}
          <div className="col-span-2 flex min-h-0 flex-col overflow-hidden overscroll-none">
            {chatArea}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatLayout;
