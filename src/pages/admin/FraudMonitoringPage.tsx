import { FraudMonitoring } from '@/components/admin/FraudMonitoring';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function FraudMonitoringPage() {
  return (
    <div className="space-y-6 animate-slide-in">
      <DashboardHeader
        heading="Fraud Monitoring"
        text="Monitor user risk scores, review flagged accounts, and manage anti-fraud measures."
      />
      <FraudMonitoring />
    </div>
  );
}