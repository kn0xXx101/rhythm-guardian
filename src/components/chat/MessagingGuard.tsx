import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canUsersMessage, getFraudDetection } from '@/services/anti-fraud';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CreditCard, AlertTriangle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MessagingGuardProps {
  otherUserId: string;
  otherUserName: string;
  otherUserRole: 'musician' | 'hirer';
  children: React.ReactNode;
}

export function MessagingGuard({ 
  otherUserId, 
  otherUserName, 
  children 
}: MessagingGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [canMessage, setCanMessage] = useState<boolean | null>(null);
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMessagingPermissions();
  }, [user, otherUserId]);

  const checkMessagingPermissions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check if messaging is allowed
      const messagingAllowed = await canUsersMessage(user.id, otherUserId);
      setCanMessage(messagingAllowed);

      // Check fraud risk for current user
      const fraudDetection = await getFraudDetection(user.id);
      setIsHighRisk(fraudDetection ? fraudDetection.risk_score > 70 : false);

    } catch (error) {
      console.error('Error checking messaging permissions:', error);
      setCanMessage(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is flagged as high risk, show warning
  if (isHighRisk) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Account Under Review</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your account has been flagged for review due to security concerns. 
              Messaging is temporarily restricted.
            </p>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please contact support if you believe this is an error.
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              onClick={() => navigate('/support')}
              className="w-full"
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If messaging is not allowed, show payment requirement
  if (canMessage === false) {
    const isHirer = user?.role === 'hirer';
    
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Secure Messaging</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {isHirer ? (
              <>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Shield className="w-5 h-5" />
                  <span>Anti-Fraud Protection Active</span>
                </div>
                <p className="text-gray-600">
                  To protect our musicians from fraud, you need to create a booking 
                  and make payment before messaging {otherUserName}.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Why this requirement?</h4>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• Prevents spam and fraudulent inquiries</li>
                    <li>• Ensures serious booking intentions</li>
                    <li>• Protects musicians' time and effort</li>
                    <li>• Creates a secure transaction environment</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={() => navigate(`/musician/${otherUserId}`)}
                    className="w-full gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Book & Pay to Message
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/musicians')}
                    className="w-full"
                  >
                    Browse Other Musicians
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600">
                  This hirer needs to create a booking and make payment before 
                  you can message each other.
                </p>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    This protects you from spam and ensures serious inquiries only.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/musician/dashboard')}
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // If messaging is allowed, show the chat
  return (
    <div className="h-full">
      <div className="bg-green-50 border-b border-green-200 px-4 py-2">
        <div className="flex items-center gap-2 text-green-800 text-sm">
          <Shield className="w-4 h-4" />
          <span>Secure messaging enabled - Payment verified</span>
        </div>
      </div>
      {children}
    </div>
  );
}