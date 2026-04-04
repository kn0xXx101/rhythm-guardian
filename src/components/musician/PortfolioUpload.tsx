import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Music,
  FileImage,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  size: number;
}

interface PortfolioUploadProps {
  onUploadComplete?: () => void;
}

export const PortfolioUpload = ({ onUploadComplete }: PortfolioUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getFileType = (mimeType: string): 'image' | 'video' | 'audio' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'image';
  };

  const getFileIcon = (type: 'image' | 'video' | 'audio') => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage.from('portfolios').upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('portfolios').getPublicUrl(fileName);

        return {
          id: data.path,
          name: file.name,
          url: publicUrl,
          type: getFileType(file.type),
          size: file.size,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setFiles((prev) => [...prev, ...uploadedFiles]);

      toast({
        title: 'Upload successful',
        description: `${uploadedFiles.length} file(s) uploaded successfully.`,
      });

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to upload files. Please try again.',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    try {
      const { error } = await supabase.storage.from('portfolios').remove([file.id]);

      if (error) throw error;

      setFiles((prev) => prev.filter((f) => f.id !== file.id));

      toast({
        title: 'File deleted',
        description: `${file.name} has been removed from your portfolio.`,
      });

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'Failed to delete file. Please try again.',
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Items</CardTitle>
        <CardDescription>
          Upload photos, videos, and audio samples to showcase your work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <FileImage className="h-4 w-4" />
          <AlertDescription>
            Supported formats: Images (JPEG, PNG, WebP), Videos (MP4, MOV), Audio (MP3, WAV, OGG).
            Max file size: 50MB per file.
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="portfolio-upload" className="cursor-pointer">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">Upload multiple files at once</p>
            </div>
          </Label>
          <Input
            id="portfolio-upload"
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Uploaded Files</h4>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {file.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(file)}
                    className="flex-shrink-0 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && !uploading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No files uploaded yet. Start building your portfolio!
          </div>
        )}
      </CardContent>
    </Card>
  );
};
