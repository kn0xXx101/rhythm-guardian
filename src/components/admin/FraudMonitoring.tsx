import { useState, useEffect } from 'react';
import { getFlaggedUsers, getHighRiskUsers, clearFraudFlag, flagUserForReview, type FraudDetection } from '@/services/anti-fraud';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  UserX, 
  TrendingUp,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export function FraudMonitoring() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flaggedUsers, setFlaggedUsers] = useState<FraudDetection[]>([]);
  const [highRiskUsers, setHighRiskUsers] = useState<FraudDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [flagged, highRisk] = await Promise.all([
        getFlaggedUsers(),
        getHighRiskUsers(),
      ]);
      
      setFlaggedUsers(flagged);
      setHighRiskUsers(highRisk);
    } catch (error) {
      console.error('Error loading fraud data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fraud monitoring data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearFlag = async (userId: string) => {
    if (!user) return;

    setActionLoading(userId);
    try {
      const success = await clearFraudFlag(userId, user.id);
      
      if (success) {
        toast({
          title: 'Flag Cleared',
          description: 'User has been cleared and can resume normal activities.',
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error clearing flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear user flag.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlagUser = async (userId: string, reason: string) => {
    if (!user) return;

    setActionLoading(userId);
    try {
      const success = await flagUserForReview(userId, reason, user.id);
      
      if (success) {
        toast({
          title: 'User Flagged',
          description: 'User has been flagged for manual review.',
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error flagging user:', error);
      toast({
        title: 'Error',
        description: 'Failed to flag user.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 80) {
      return <Badge variant="destructive">Critical Risk</Badge>;
    } else if (riskScore >= 60) {
      return <Badge className="bg-orange-100 text-orange-800">High Risk</Badge>;
    } else if (riskScore >= 40) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
    }
  };

  const formatRiskFactors = (factors: string[]) => {
    const factorLabels: Record<string, string> = {
      new_account: 'New Account',
      failed_payments: 'Failed Payments',
      high_cancellation_rate: 'High Cancellation Rate',
      suspicious_activity: 'Suspicious Activity',
      multiple_complaints: 'Multiple Complaints',
    };

    return factors.map(factor => factorLabels[factor] || factor).join(', ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    totalFlagged: flaggedUsers.length,
    totalHighRisk: highRiskUsers.length,
    criticalRisk: highRiskUsers.filter(u => u.risk_score >= 80).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Users</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalFlagged}</div>
            <p className="text-xs text-muted-foreground">Suspended accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalHighRisk}</div>
            <p className="text-xs text-muted-foreground">Risk score ≥ 70</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalRisk}</div>
            <p className="text-xs text-muted-foreground">Risk score ≥ 80</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Fraud Monitoring Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="flagged" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="flagged" className="gap-2">
                <UserX className="w-4 h-4" />
                Flagged Users ({stats.totalFlagged})
              </TabsTrigger>
              <TabsTrigger value="high-risk" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                High Risk Users ({stats.totalHighRisk})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="flagged" className="space-y-4 mt-6">
              {flaggedUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>No flagged users at the moment</p>
                  <p className="text-sm">All users are in good standing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {flaggedUsers.map((detection) => (
                    <Card key={detection.id} className="border-red-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={(detection as any).user?.avatar_url} />
                              <AvatarFallback className="bg-red-100 text-red-600">
                                {(detection as any).user?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">
                                  {(detection as any).user?.full_name || 'Unknown User'}
                                </h3>
                                <Badge variant="destructive">Flagged</Badge>
                                {getRiskBadge(detection.risk_score)}
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">
                                {(detection as any).user?.email}
                              </p>
                              
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                  <span className="font-medium">Reason:</span>
                                  <span>{detection.flagged_reason}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">Flagged:</span>
                                  <span>
                                    {detection.flagged_at 
                                      ? formatDistanceToNow(new Date(detection.flagged_at), { addSuffix: true })
                                      : 'Unknown'
                                    }
                                  </span>
                                </div>
                                
                                {detection.risk_factors.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <TrendingUp className="w-4 h-4 text-orange-500 mt-0.5" />
                                    <span className="font-medium">Risk Factors:</span>
                                    <span>{formatRiskFactors(detection.risk_factors)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleClearFlag(detection.user_id)}
                              disabled={actionLoading === detection.user_id}
                              size="sm"
                              className="gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {actionLoading === detection.user_id ? 'Clearing...' : 'Clear Flag'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="high-risk" className="space-y-4 mt-6">
              {highRiskUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>No high-risk users detected</p>
                  <p className="text-sm">All users have acceptable risk scores</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {highRiskUsers.map((detection) => (
                    <Card key={detection.id} className="border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={(detection as any).user?.avatar_url} />
                              <AvatarFallback className="bg-orange-100 text-orange-600">
                                {(detection as any).user?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">
                                  {(detection as any).user?.full_name || 'Unknown User'}
                                </h3>
                                {getRiskBadge(detection.risk_score)}
                                {detection.is_flagged && (
                                  <Badge variant="destructive">Flagged</Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">
                                {(detection as any).user?.email}
                              </p>
                              
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-orange-500" />
                                  <span className="font-medium">Risk Score:</span>
                                  <span className="font-mono">{detection.risk_score}/100</span>
                                </div>
                                
                                {detection.risk_factors.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                                    <span className="font-medium">Risk Factors:</span>
                                    <span>{formatRiskFactors(detection.risk_factors)}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">Last Updated:</span>
                                  <span>
                                    {formatDistanceToNow(new Date(detection.updated_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {!detection.is_flagged && (
                              <Button
                                onClick={() => handleFlagUser(detection.user_id, 'High risk score detected')}
                                disabled={actionLoading === detection.user_id}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                {actionLoading === detection.user_id ? 'Flagging...' : 'Flag User'}
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          The fraud detection system automatically calculates risk scores based on user behavior, 
          payment history, and account activity. Users with high risk scores should be monitored 
          closely, and those flagged for review have restricted access until cleared.
        </AlertDescription>
      </Alert>
    </div>
  );
}