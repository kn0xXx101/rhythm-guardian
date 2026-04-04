import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Headphones, MessageSquare, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SupportTickets } from '@/components/admin/SupportTickets';
import AdminChat from './AdminChat';
import { ChatMonitor } from '@/components/dashboard/ChatMonitor';
import { BroadcastMessage } from '@/components/admin/BroadcastMessage';

const TABS = ['tickets', 'chats', 'monitor'] as const;
type TabId = (typeof TABS)[number];

export default function CommunicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as TabId) || 'tickets';
  const validTab = TABS.includes(tab) ? tab : 'tickets';

  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Communications"
        text="Support tickets, direct messaging, and chat monitoring"
      />

      <Tabs value={validTab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="chats" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chats
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-6">
          <SupportTickets />
        </TabsContent>

        <TabsContent value="chats" className="mt-6 space-y-4">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 group">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                Broadcast message
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <BroadcastMessage />
            </CollapsibleContent>
          </Collapsible>
          <AdminChat />
        </TabsContent>

        <TabsContent value="monitor" className="mt-6">
          <ChatMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
