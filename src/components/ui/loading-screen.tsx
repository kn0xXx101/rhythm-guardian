import { Loader2 } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export function LoadingScreen() {
  const { siteName } = useSiteSettings();
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="absolute inset-0 animate-pulse bg-primary/10 rounded-full" />
        </div>
        <p className="text-lg font-medium text-foreground animate-pulse">
          Loading {siteName}...
        </p>
        <p className="text-sm text-muted-foreground">Please wait while we set up your experience</p>
      </div>
    </div>
  );
}
