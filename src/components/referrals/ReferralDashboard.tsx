import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Gift, Mail, Share2, TrendingUp } from 'lucide-react';
import { referralsService } from '@/services/referrals';
import { Referral, Reward } from '@/types/features';
import { toast } from '@/hooks/use-toast';

interface ReferralDashboardProps {
  userId: string;
}

export function ReferralDashboard({ userId }: ReferralDashboardProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [refs, rews, points] = await Promise.all([
        referralsService.getUserReferrals(userId),
        referralsService.getAvailableRewards(),
        referralsService.getTotalPoints(userId),
      ]);
      setReferrals(refs);
      setRewards(rews);
      setTotalPoints(points);

      if (refs.length > 0) {
        setReferralCode(refs[0].referral_code);
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    }
  };

  const handleCreateReferral = async () => {
    if (!email) {
      toast({ title: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    try {
      const referral = await referralsService.createReferral(email);
      setReferralCode(referral.referral_code);
      setReferrals((prev) => [referral, ...prev]);
      setEmail('');
      toast({ title: 'Referral created successfully!' });
    } catch (error) {
      toast({ title: 'Failed to create referral', variant: 'destructive' });
    }
  };

  const handleCopyLink = () => {
    if (referralCode) {
      const link = referralsService.generateReferralLink(referralCode);
      navigator.clipboard.writeText(link);
      toast({ title: 'Referral link copied!' });
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    try {
      await referralsService.redeemReward(rewardId, userId);
      toast({ title: 'Reward redeemed successfully!' });
      loadData();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to redeem reward', variant: 'destructive' });
    }
  };

  const completedReferrals = referrals.filter((r) => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="gradient-border" className="hover-scale">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-xs text-muted-foreground">Available to spend</p>
          </CardContent>
        </Card>

        <Card variant="gradient-border" className="hover-scale">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReferrals}</div>
            <p className="text-xs text-muted-foreground">Successful referrals</p>
          </CardContent>
        </Card>

        <Card variant="gradient-border" className="hover-scale">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referrals.filter((r) => r.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting signup</p>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Refer a Friend</CardTitle>
          <CardDescription>Earn points when your friends sign up</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Friend's email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={handleCreateReferral} className="group">
              <Mail className="mr-2 h-4 w-4" />
              Invite
              <TrendingUp className="ml-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>

          {referralCode && (
            <div className="flex gap-2">
              <Input value={referralsService.generateReferralLink(referralCode)} readOnly />
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Available Rewards</CardTitle>
          <CardDescription>Redeem your points for great rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className="border-primary/10 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{reward.name}</h3>
                      </div>
                      {reward.description && (
                        <p className="text-sm text-muted-foreground mb-3">{reward.description}</p>
                      )}
                      <Badge variant="secondary">{reward.points_required} points</Badge>
                    </div>
                    <Button
                      size="sm"
                      disabled={totalPoints < reward.points_required}
                      onClick={() => handleRedeemReward(reward.id)}
                      className="group"
                    >
                      Redeem
                      <TrendingUp className="ml-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No referrals yet. Start inviting friends!
            </p>
          ) : (
            <div className="space-y-2">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{referral.referred_email}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      referral.status === 'completed'
                        ? 'default'
                        : referral.status === 'rewarded'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {referral.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
