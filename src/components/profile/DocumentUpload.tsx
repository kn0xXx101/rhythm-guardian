import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Image as ImageIcon, Loader2, Trash2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storage';
import { supabase } from '@/lib/supabase';

interface UploadedDocument {
  path: string;
  name: string;
  type: string;
}

export const DocumentUpload = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<{
    documentsSubmitted: boolean;
    documentsVerified: boolean;
  }>({
    documentsSubmitted: false,
    documentsVerified: false,
  });

  // Load existing documents and verification status
  useEffect(() => {
    if (user?.id) {
      loadDocuments();
      loadVerificationStatus();
    }
  }, [user?.id]);

  const loadVerificationStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('documents_submitted, documents_verified')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setVerificationStatus({
        documentsSubmitted: data?.documents_submitted || false,
        documentsVerified: data?.documents_verified || false,
      });
    } catch (error) {
      console.error('Error loading verification status:', error);
    }
  };

  const loadDocuments = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data } = await supabase.storage
        .from('documents')
        .list(`${user.id}/id_verification`, { limit: 20 });

      if (data && data.length > 0) {
        const docsWithUrls = data.map(file => ({
          path: `${user.id}/id_verification/${file.name}`,
          name: file.name,
          type: file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*',
        }));
        setDocuments(docsWithUrls);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateVerificationStatus = async (hasDocuments: boolean) => {
    if (!user?.id) return;

    try {
      // Update documents_submitted status in the database
      // This will trigger the admin notification via the database trigger
      const { error } = await supabase
        .from('profiles')
        .update({ 
          documents_submitted: hasDocuments,
          // Reset verification status if documents are removed
          documents_verified: hasDocuments ? verificationStatus.documentsVerified : false
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setVerificationStatus(prev => ({
        ...prev,
        documentsSubmitted: hasDocuments,
        documentsVerified: hasDocuments ? prev.documentsVerified : false,
      }));

      // Refresh user context to update profile completion
      await refreshUser();

      if (hasDocuments && !verificationStatus.documentsSubmitted) {
        toast({
          title: 'Documents Submitted for Review',
          description: 'Your verification documents have been submitted. Admins will review them shortly.',
        });
      }
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update verification status. Please try again.',
      });
    }
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);

    try {
      const { path } = await storageService.uploadDocument(file, user.id, 'id_verification');

      const doc: UploadedDocument = {
        path,
        name: file.name,
        type: file.type,
      };

      const newDocuments = [...documents, doc];
      setDocuments(newDocuments);

      // Update verification status in database (triggers admin notification)
      await updateVerificationStatus(true);

      toast({
        title: 'Document uploaded',
        description: 'Your verification document has been uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Document upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error?.message || 'Failed to upload document. Please try again.',
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (doc: UploadedDocument) => {
    try {
      await storageService.deleteDocument(doc.path);
      const newDocuments = documents.filter((d) => d.path !== doc.path);
      setDocuments(newDocuments);

      // Update verification status based on remaining documents
      await updateVerificationStatus(newDocuments.length > 0);

      toast({
        title: 'Document deleted',
        description: 'The document has been removed.',
      });
    } catch (error: any) {
      console.error('Document delete failed:', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Failed to delete document. Please try again.',
      });
    }
  };

  const renderIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getStatusBadge = () => {
    if (verificationStatus.documentsVerified) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    } else if (verificationStatus.documentsSubmitted) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
          <Clock className="h-3 w-3" />
          Under Review
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Not Submitted
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Verification Documents</CardTitle>
            <CardDescription>
              Upload a clear photo of your government-issued ID or other verification documents.
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Information */}
        {verificationStatus.documentsVerified ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your identity has been verified! You now have a verified badge on your profile.
            </AlertDescription>
          </Alert>
        ) : verificationStatus.documentsSubmitted ? (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Your documents are under review. Admins have been notified and will verify your identity soon.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Upload your verification documents to get a verified badge and increase trust with clients.
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription>
            Supported formats: images (JPG, PNG) and PDF files. Maximum size is 10MB.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="document-upload">Upload document</Label>
          <div className="flex items-center gap-3">
            <Input
              id="document-upload"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading || !user}
            />
            <Button type="button" disabled={isUploading || !user}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>

        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Uploaded Documents ({documents.length})</h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.path}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    {renderIcon(doc.type)}
                    <span className="truncate max-w-xs">{doc.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={verificationStatus.documentsVerified}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {verificationStatus.documentsVerified && (
              <p className="text-xs text-muted-foreground">
                Documents cannot be deleted after verification. Contact support if you need to update them.
              </p>
            )}
          </div>
        )}

        {/* Verification Requirements */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Verification Requirements:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Government-issued photo ID (National ID, Passport, Driver's License)</li>
            <li>• Clear, readable photo showing all details</li>
            <li>• Document must be valid and not expired</li>
            <li>• Name on ID must match your profile name</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

