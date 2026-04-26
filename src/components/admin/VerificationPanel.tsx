import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle, XCircle, FileText, Image as ImageIcon,
  ExternalLink, Loader2, AlertTriangle, BadgeCheck, ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VerificationPanelProps {
  userId: string;
  userName: string;
  documentsSubmitted: boolean;
  documentsVerified: boolean;
  onVerified: () => void;
}

interface StorageFile {
  name: string;
  path: string;
  signedUrl: string | null;
  isImage: boolean;
}

type VerificationProfile = {
  full_name: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  instruments: string[] | null;
  genres: string[] | null;
  hourly_rate: number | null;
  base_price: number | null;
  available_days: string[] | null;
};

export function VerificationPanel({
  userId,
  userName,
  documentsSubmitted,
  documentsVerified,
  onVerified,
}: VerificationPanelProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [profileData, setProfileData] = useState<VerificationProfile | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  useEffect(() => {
    loadProfileRequirements();
  }, [userId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabaseAdmin.storage
        .from('documents')
        .list(`${userId}/id_verification`, { limit: 20 });

      if (!data || data.length === 0) {
        setFiles([]);
        return;
      }

      const filesWithUrls = await Promise.all(
        data.map(async (file) => {
          const path = `${userId}/id_verification/${file.name}`;
          const { data: urlData } = await supabaseAdmin.storage
            .from('documents')
            .createSignedUrl(path, 3600);

          return {
            name: file.name,
            path,
            signedUrl: urlData?.signedUrl || null,
            isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name),
          };
        })
      );

      setFiles(filesWithUrls);
    } catch {
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileRequirements = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select(
          'full_name, phone, location, bio, instruments, genres, hourly_rate, base_price, available_days'
        )
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      setProfileData((data as VerificationProfile | null) || null);
    } catch {
      setProfileData(null);
    }
  };

  const missingRequirements = (() => {
    const missing: string[] = [];
    if (files.length === 0) missing.push('identity document upload');
    if (!profileData?.full_name?.trim()) missing.push('full name');
    if (!profileData?.phone?.trim()) missing.push('phone number');
    if (!profileData?.location?.trim()) missing.push('location');
    if (!profileData?.bio?.trim()) missing.push('bio');
    if (!profileData?.instruments || profileData.instruments.length === 0) {
      missing.push('at least one instrument');
    }
    if (!profileData?.genres || profileData.genres.length === 0) {
      missing.push('at least one genre');
    }
    const hasPricing =
      (typeof profileData?.hourly_rate === 'number' && profileData.hourly_rate > 0) ||
      (typeof profileData?.base_price === 'number' && profileData.base_price > 0);
    if (!hasPricing) missing.push('pricing (hourly or fixed)');
    if (!profileData?.available_days || profileData.available_days.length === 0) {
      missing.push('availability');
    }
    return missing;
  })();

  const canApprove = missingRequirements.length === 0;

  const handleApprove = async () => {
    setIsActioning(true);
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          documents_verified: true,
          documents_submitted: true,
          status: 'active',
          email_verified: true,
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Notify the musician
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: '✅ Verification Approved',
        content: 'Congratulations! Your identity has been verified. You now have a verified badge on your profile.',
        read: false,
        action_url: '/musician/profile',
      });

      toast({ title: 'Verified', description: `${userName} is now a verified musician.` });
      onVerified();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ variant: 'destructive', title: 'Reason required', description: 'Please provide a rejection reason.' });
      return;
    }
    setIsActioning(true);
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          documents_verified: false,
          documents_submitted: false,
          status: 'active',
        })
        .eq('user_id', userId);

      if (error) throw error;

      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: '❌ Verification Rejected',
        content: `Your verification was rejected. Reason: ${rejectionReason}. Please resubmit your documents.`,
        read: false,
        action_url: '/musician/profile',
      });

      toast({ title: 'Rejected', description: `${userName}'s verification has been rejected.` });
      setShowRejectForm(false);
      setRejectionReason('');
      onVerified();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Identity Verification
        </h3>
        {documentsVerified ? (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1">
            <BadgeCheck className="h-3 w-3" /> Verified
          </Badge>
        ) : documentsSubmitted ? (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
            <AlertTriangle className="h-3 w-3" /> Pending Review
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground">No Documents</Badge>
        )}
      </div>

      <Separator />

      {/* Already verified */}
      {documentsVerified && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <BadgeCheck className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Musician is verified</p>
            <p className="text-xs text-blue-600">They have a verified badge on their public profile.</p>
          </div>
        </div>
      )}

      {/* Documents list */}
      {files.length === 0 ? (
        <div className="text-center py-5 text-muted-foreground text-sm border rounded-lg bg-muted/30">
          <FileText className="h-7 w-7 mx-auto mb-2 opacity-40" />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{files.length} document(s) submitted</p>
          {files.map((file) => (
            <div key={file.path} className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                {file.isImage
                  ? <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                  : <FileText className="h-4 w-4 shrink-0 text-red-500" />
                }
                <span className="truncate text-xs text-muted-foreground">{file.name}</span>
              </div>
              {file.signedUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-7 px-2 text-xs gap-1"
                  onClick={() => window.open(file.signedUrl!, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {!documentsVerified && (
        <>
          <Separator />
          {!showRejectForm ? (
            <div className="space-y-2">
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={handleApprove}
                disabled={isActioning || !canApprove}
              >
                {isActioning
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle className="h-4 w-4" />
                }
                Approve & Grant Verified Badge
              </Button>
              {!canApprove && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Missing before approval: {missingRequirements.join(', ')}.
                </div>
              )}
              {documentsSubmitted && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:text-destructive"
                  size="sm"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isActioning}
                >
                  <XCircle className="h-4 w-4" />
                  Reject Documents
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Rejection reason (sent to musician)</Label>
                <Textarea
                  placeholder="e.g. ID is blurry, please resubmit a clearer photo..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={isActioning}
                >
                  {isActioning && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Confirm Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
                  disabled={isActioning}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
