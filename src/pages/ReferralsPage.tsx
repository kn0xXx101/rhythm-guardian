import { useAuth } from '@/contexts/AuthContext';
import { ReferralDashboard } from '@/components/referrals/ReferralDashboard';
import { Navigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function ReferralsPage() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <DashboardHeader
        heading="Referrals & Rewards"
        text="Earn points by inviting friends and redeem them for rewards."
      />

      <ReferralDashboard userId={user.id} />
    </div>
  );
}
