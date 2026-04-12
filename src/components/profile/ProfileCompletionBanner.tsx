import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { calculateProfileCompletion } from '@/lib/profile-completion';

export function ProfileCompletionBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [completion, setCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [hasPaymentDetails, setHasPaymentDetails] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [documentsSubmitted, setDocumentsSubmitted] = useState(false);
  const [documentsVerified, setDocumentsVerified] = useState(false);

  useEffect(() => {
    if (user?.role === 'musician') {
      calculateCompletion();
    }
  }, [user]);

  const calculateCompletion = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id || '')
        .single();

      if (!profile) return;

      // Set verification status
      setDocumentsSubmitted(profile.documents_submitted || false);
      setDocumentsVerified(profile.documents_verified || false);

      const result = calculateProfileCompletion(profile);
      
      setCompletion(result.percentage);
      setMissingFields(result.missingFields);
      
      // Check for payment details specifically for the verification button
      const hasPayment = !!((profile.bank_account_number && profile.bank_account_name && profile.bank_code) || 
                          (profile.mobile_money_number && profile.mobile_money_name && profile.mobile_money_provider));
      setHasPaymentDetails(hasPayment);
      
    } catch (error) {
      console.error('Error calculating profile completion:', error);
    }
  };

  const handleSubmitVerification = async () => {
    if (completion < 80) {
      toast({
        title: 'Profile Incomplete',
        description: 'Please complete at least 80% of your profile before submitting for verification.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasPaymentDetails) {
      toast({
        title: 'Payment Details Required',
        description: 'Please add your payment details before submitting for verification.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Fetch required_documents so we can store submission timestamp there (schema-safe).
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('required_documents')
        .eq('user_id', user?.id || '')
        .single();

      if (fetchError) throw fetchError;

      const nowIso = new Date().toISOString();
      const requiredDocs = Array.isArray((currentProfile as any)?.required_documents)
        ? ((currentProfile as any).required_documents as any[])
        : [];

      const updatedRequiredDocs =
        requiredDocs.length > 0
          ? requiredDocs.map((doc) => ({
              ...doc,
              submitted_at: doc?.submitted_at || nowIso,
            }))
          : requiredDocs;

      const { error } = await supabase
        .from('profiles')
        .update({
          documents_submitted: true,
          ...(updatedRequiredDocs.length > 0 ? { required_documents: updatedRequiredDocs } : {}),
        })
        .eq('user_id', user?.id || '');

      if (error) throw error;

      setDocumentsSubmitted(true);
      toast({
        title: 'Submitted Successfully',
        description: 'Your profile has been submitted for verification. We\'ll review it soon!',
      });
    } catch (error: any) {
      console.error('Error submitting for verification:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit profile for verification.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (user?.role !== 'musician') {
    return null;
  }

  // Don't show if verified
  if (documentsVerified) {
    return null;
  }

  return (
    <Card className={`border-l-4 ${documentsSubmitted ? 'border-l-yellow-500' : completion >= 80 ? 'border-l-green-500' : 'border-l-blue-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Profile Status
            {documentsVerified ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : documentsSubmitted ? (
              <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
            ) : completion >= 80 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
          </CardTitle>
        </div>
        <CardDescription>
          {documentsVerified
            ? 'Your profile has been verified!'
            : documentsSubmitted
              ? 'Your profile is under review'
              : completion >= 80
                ? 'Your profile is ready — submit for verification to start receiving bookings'
                : 'Complete your profile to get more bookings'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Verification Status Alerts */}
        {documentsVerified && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Your profile has been verified! You can now receive bookings.
            </p>
          </div>
        )}

        {documentsSubmitted && !documentsVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 font-medium">
              Your profile is pending verification. We'll review your details soon.
            </p>
          </div>
        )}

        {!documentsSubmitted && !hasPaymentDetails && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Please add your payment details to receive payouts
            </p>
          </div>
        )}

        {!documentsSubmitted && completion < 80 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              Please complete at least 80% of your profile before submitting for verification.
            </p>
          </div>
        )}

        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm font-semibold">{completion}%</span>
          </div>
          
          <Progress value={completion} className="h-2" />

          {missingFields.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Missing:</span>{' '}
              {missingFields.slice(0, 4).join(', ')}
              {missingFields.length > 4 && ` and ${missingFields.length - 4} more`}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button 
            onClick={() => navigate('/musician/profile')}
            variant="outline"
            className="flex-1"
          >
            Complete Profile
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <Button 
            onClick={handleSubmitVerification}
            disabled={isVerifying || documentsSubmitted || completion < 80 || !hasPaymentDetails}
            className="flex-1"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : documentsVerified ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Verified
              </>
            ) : documentsSubmitted ? (
              'Pending Review'
            ) : (
              'Submit for Verification'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
