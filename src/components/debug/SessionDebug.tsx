import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';

export function SessionDebug() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSessionInfo = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      setSessionInfo({
        session,
        user,
        error: error || userError,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setSessionInfo({
        session: null,
        user: null,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const refreshSession = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      console.log('Manual refresh result:', { data, error });
      await fetchSessionInfo();
    } catch (error) {
      console.error('Manual refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessionInfo();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change in debug:', { event, session });
      fetchSessionInfo();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          Session Debug
        </Button>
      </div>
    );
  }

  const session = sessionInfo?.session;
  const user = sessionInfo?.user;
  const error = sessionInfo?.error;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-background/95 backdrop-blur-sm border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Session Debug</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshSession}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <div className="font-medium mb-1">Session Status</div>
            <Badge variant={session ? 'default' : 'destructive'}>
              {session ? 'Active' : 'No Session'}
            </Badge>
          </div>

          {session && (
            <>
              <div>
                <div className="font-medium mb-1">Expires At</div>
                <div className="text-muted-foreground">
                  {session.expires_at 
                    ? new Date(session.expires_at * 1000).toLocaleString()
                    : 'Unknown'
                  }
                </div>
                {session.expires_at && (
                  <div className="text-muted-foreground">
                    {Math.round((session.expires_at * 1000 - Date.now()) / 1000 / 60)} minutes remaining
                  </div>
                )}
              </div>

              <div>
                <div className="font-medium mb-1">Access Token</div>
                <div className="text-muted-foreground break-all">
                  {session.access_token?.substring(0, 20)}...
                </div>
              </div>

              <div>
                <div className="font-medium mb-1">Refresh Token</div>
                <Badge variant={session.refresh_token ? 'default' : 'destructive'}>
                  {session.refresh_token ? 'Present' : 'Missing'}
                </Badge>
              </div>
            </>
          )}

          {user && (
            <div>
              <div className="font-medium mb-1">User</div>
              <div className="text-muted-foreground">
                {user.email}
              </div>
              <div className="text-muted-foreground">
                Role: {user.app_metadata?.role || user.user_metadata?.role || 'None'}
              </div>
            </div>
          )}

          {error && (
            <div>
              <div className="font-medium mb-1 text-red-600">Error</div>
              <div className="text-red-600 text-xs">
                {error.message || JSON.stringify(error)}
              </div>
            </div>
          )}

          <div>
            <div className="font-medium mb-1">Last Updated</div>
            <div className="text-muted-foreground">
              {sessionInfo?.timestamp ? new Date(sessionInfo.timestamp).toLocaleTimeString() : 'Never'}
            </div>
          </div>

          <div>
            <div className="font-medium mb-1">Storage</div>
            <div className="text-muted-foreground">
              LocalStorage: {typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token') ? 'Present' : 'Missing'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}