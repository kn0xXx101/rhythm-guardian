import { useEffect } from 'react';
import { toast } from '@/components/ui/sonner';

type NotifyAuditDetail = {
  type: 'booking' | 'payment' | 'system' | 'message' | 'review' | 'payout';
  title: string;
  actionUrl: string;
  eventKey?: string;
  adminCount: number;
  inserted: number;
  deduped: number;
  errors: number;
};

export const AdminNotifyAuditToast = () => {
  useEffect(() => {
    const onAudit = (event: Event) => {
      const customEvent = event as CustomEvent<NotifyAuditDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      const status = detail.errors > 0 ? 'warn' : detail.inserted > 0 ? 'ok' : 'noop';
      const keyLabel = detail.eventKey ? detail.eventKey : 'no-event-key';
      toast(
        `[Admin notify/${status}] ${detail.type}: ${detail.title}`,
        {
          description: `key=${keyLabel} | admins=${detail.adminCount} | inserted=${detail.inserted} | deduped=${detail.deduped} | errors=${detail.errors}`,
          duration: 5000,
        }
      );
    };

    window.addEventListener('admin-notify:audit', onAudit as EventListener);
    return () => window.removeEventListener('admin-notify:audit', onAudit as EventListener);
  }, []);

  return null;
};
