import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Gift, Mail, Share2, TrendingUp } from 'lucide-react';
import {
  referralsService,
  isSharePlaceholderEmail,
} from '@/services/referrals';
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
  const [shareCode, setShareCode] = useState('');

  const displayReferrals = referrals.filter((r) => !isSharePlaceholderEmail(r.referred_email));

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [linkCode, refs, rews, points] = await Promise.all([
        referralsService.ensureShareReferralCode(userId),
        referralsService.getUserReferrals(userId),
        referralsService.getAvailableRewards(),
        referralsService.getTotalPoints(userId),
      ]);
      setShareCode(linkCode);
      setReferrals(refs);
      setRewards(rews);
      setTotalPoints(points);
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
      setReferrals((prev) => [referral, ...prev]);
      setEmail('');
      toast({ title: 'Invitation sent — invite recorded.' });
    } catch (error) {
      toast({ title: 'Failed to create referral', variant: 'destructive' });
    }
  };

  const handleCopyLink = () => {
    if (shareCode) {
      const link = referralsService.generateReferralLink(shareCode);
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

  const completedReferrals = displayReferrals.filter((r) => r.status === 'completed').length;
  const pendingInvites = displayReferrals.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <div className="text-2xl font-bold">{pendingInvites}</div>
            <p className="text-xs text-muted-foreground">Awaiting signup</p>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Share your link</CardTitle>
          <CardDescription>
            Anyone who signs up with your link and verifies their email can count toward your rewards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shareCode ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={referralsService.generateReferralLink(shareCode)}
                className="min-w-0 font-mono text-xs sm:text-sm"
              />
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" className="flex-1 sm:flex-initial" onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                  onClick={() => {
                    const url = referralsService.generateReferralLink(shareCode);
                    if (navigator.share) {
                      void navigator.share({ title: 'Join Rhythm Guardian', url }).catch(() => {});
                    } else {
                      handleCopyLink();
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Preparing your link…</p>
          )}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Invite by email</CardTitle>
          <CardDescription>Optional — record an invite for a specific address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="Friend's email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0"
            />
            <Button type="button" onClick={handleCreateReferral} className="group shrink-0 sm:w-auto">
              <Mail className="mr-2 h-4 w-4" />
              Invite
              <TrendingUp className="ml-2 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Available Rewards</CardTitle>
          <CardDescription>Redeem your points for rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rewards.map((reward) => (
              <Card key={reward.id} className="border-primary/10 transition-colors hover:border-primary/30">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Gift className="h-5 w-5 shrink-0 text-primary" />
                        <h3 className="font-semibold">{reward.name}</h3>
                      </div>
                      {reward.description && (
                        <p className="mb-3 text-sm text-muted-foreground">{reward.description}</p>
                      )}
                      <Badge variant="secondary">{reward.points_required} points</Badge>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 group"
                      disabled={totalPoints < reward.points_required}
                      onClick={() => handleRedeemReward(reward.id)}
                    >
                      Redeem
                      <TrendingUp className="ml-2 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
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
          <CardTitle>Your referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {displayReferrals.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No email invites yet. Share your link above to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {displayReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-all">{referral.referred_email}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      referral.status === 'completed'
                        ? 'default'
                        : referral.status === 'expired'
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
