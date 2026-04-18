import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { calculateProfileCompletion } from '@/lib/profile-completion';
import { scheduleFullReload } from '@/utils/schedule-full-reload';

/** Stable layout while profile row is loading — avoids false 0%, alerts, and verified-state flashes on refresh */
function ProfileBannerSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardHeader className="space-y-3 pb-3">
        <Skeleton className="h-7 w-44 rounded-md" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-4 w-9 rounded-md" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

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
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  /** Until true, do not render completion % / alerts (prevents refresh glitch). */
  const [profileStatusReady, setProfileStatusReady] = useState(false);

  useEffect(() => {
    if (!(user?.role === 'musician' || user?.role === 'hirer')) {
      setProfileStatusReady(false);
      return;
    }

    let cancelled = false;
    setProfileStatusReady(false);

    void (async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (cancelled) return;

        if (!profile) {
          setDocumentsSubmitted(false);
          setDocumentsVerified(false);
          setCompletion(0);
          setMissingFields([]);
          setIsProfileComplete(false);
          setHasPaymentDetails(false);
          return;
        }

        setDocumentsSubmitted(profile.documents_submitted || false);
        setDocumentsVerified(profile.documents_verified || false);

        const result = calculateProfileCompletion(profile);

        setCompletion(result.percentage);
        setMissingFields(result.missingFields);
        setIsProfileComplete(result.isComplete);

        const hasPayment = !!(
          (profile.bank_account_number && profile.bank_account_name && profile.bank_code) ||
          (profile.mobile_money_number &&
            profile.mobile_money_name &&
            profile.mobile_money_provider)
        );
        setHasPaymentDetails(hasPayment);
      } catch (error) {
        console.error('Error calculating profile completion:', error);
      } finally {
        if (!cancelled) setProfileStatusReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const handleSubmitVerification = async () => {
    if (!isProfileComplete) {
      toast({
        title: 'Profile Incomplete',
        description: 'Please fill in all required profile fields before submitting for verification.',
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
      scheduleFullReload(700);
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

  if (user?.role !== 'musician' && user?.role !== 'hirer') {
    return null;
  }

  if (!profileStatusReady) {
    return <ProfileBannerSkeleton />;
  }

  if (user?.role === 'hirer' && isProfileComplete) {
    return null;
  }

  if (user?.role === 'musician' && documentsVerified) {
    return null;
  }

  if (user?.role === 'hirer') {
    return (
      <Card
        className={`border-l-4 ${
          isProfileComplete ? 'border-l-green-500' : completion >= 50 ? 'border-l-amber-500' : 'border-l-blue-500'
        }`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            Profile Status
            {isProfileComplete ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
          </CardTitle>
          <CardDescription>
            A complete profile helps musicians respond faster and builds trust for your events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Profile completion</span>
              <span className="text-sm font-semibold tabular-nums">{completion}%</span>
            </div>
            <Progress value={completion} className="h-2.5 *:transition-none" />
            {missingFields.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Still needed:</span>{' '}
                {missingFields.slice(0, 5).join(', ')}
                {missingFields.length > 5 && ` and ${missingFields.length - 5} more`}
              </div>
            )}
          </div>
          <Button onClick={() => navigate('/hirer/profile')} variant="outline" className="w-full mt-4 gap-2">
            {isProfileComplete ? 'View profile' : 'Complete profile'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-l-4 ${
        documentsSubmitted ? 'border-l-yellow-500' : isProfileComplete ? 'border-l-green-500' : 'border-l-blue-500'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Profile Status
            {documentsVerified ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : documentsSubmitted ? (
              <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
            ) : isProfileComplete ? (
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
              : isProfileComplete
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

        {!documentsSubmitted && !isProfileComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              Please complete all required profile fields before submitting for verification.
            </p>
          </div>
        )}

        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm font-semibold">{completion}%</span>
          </div>
          
          <Progress value={completion} className="h-2.5 *:transition-none" />

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
            disabled={isVerifying || documentsSubmitted || !isProfileComplete || !hasPaymentDetails}
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
