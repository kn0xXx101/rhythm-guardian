import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storage';

interface UploadedDocument {
  path: string;
  name: string;
  type: string;
}

export const DocumentUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

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

      setDocuments((prev) => [...prev, doc]);

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
      setDocuments((prev) => prev.filter((d) => d.path !== doc.path));
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Documents</CardTitle>
        <CardDescription>
          Upload a clear photo of your government-issued ID or other verification documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <h4 className="text-sm font-semibold">Uploaded Documents</h4>
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
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

