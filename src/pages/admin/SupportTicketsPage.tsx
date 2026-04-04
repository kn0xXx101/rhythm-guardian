import { SupportTickets } from '@/components/admin/SupportTickets';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function SupportTicketsPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Support Tickets"
        text="Manage user support requests from AI Assistant"
      />
      <SupportTickets />
    </div>
  );
}
