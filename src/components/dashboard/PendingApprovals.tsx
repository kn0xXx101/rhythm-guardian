import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Mail, Phone, MapPin, Music, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingMusician {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  instruments: string[] | null;
  genres: string[] | null;
  hourly_rate: number | null;
  available_days: string[] | null;
  created_at: string | null;
  status: string | null;
}

export const PendingApprovals = () => {
  const [pendingMusicians, setPendingMusicians] = useState<PendingMusician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedMusicianId, setSelectedMusicianId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPendingMusicians = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          user_id,
          full_name,
          phone,
          location,
          bio,
          avatar_url,
          instruments,
          genres,
          hourly_rate,
          available_days,
          created_at,
          status
        `
        )
        .eq('role', 'musician')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch emails from auth.users
      const musiciansWithEmails: PendingMusician[] = await Promise.all(
        (data || []).map(async (musician) => {
          const { data: authData } = await supabase.auth.admin.getUserById(musician.user_id);
          return {
            user_id: musician.user_id,
            full_name: musician.full_name,
            email: authData.user?.email || 'N/A',
            phone: musician.phone,
            location: musician.location,
            bio: musician.bio,
            avatar_url: musician.avatar_url,
            instruments: musician.instruments,
            genres: musician.genres,
            hourly_rate: musician.hourly_rate,
            available_days: musician.available_days,
            created_at: musician.created_at,
            status: musician.status,
          };
        })
      );

      setPendingMusicians(musiciansWithEmails);
    } catch (error) {
      console.error('Error fetching pending musicians:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load pending approvals. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPendingMusicians();
  }, [fetchPendingMusicians]);

  const handleApprove = async (userId: string, fullName: string) => {
    try {
      setActioningUserId(userId);

      // Update profile status to active
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Create notification for musician
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: 'Profile Approved',
        content: 'Your musician profile has been approved! You can now start receiving bookings.',
        read: false,
      });

      if (notifError) console.error('Error creating notification:', notifError);

      toast({
        title: 'Profile Approved',
        description: `${fullName}'s profile has been activated.`,
      });

      // Refetch to update the list
      await fetchPendingMusicians();
    } catch (error) {
      console.error('Error approving musician:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve profile. Please try again.',
      });
    } finally {
      setActioningUserId(null);
    }
  };

  const handleReject = async (userId: string, fullName: string) => {
    try {
      setActioningUserId(userId);

      // Update profile status to suspended
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Create notification for musician
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: 'Profile Rejected',
        content:
          'Your musician profile application has been rejected. Please contact support for more information.',
        read: false,
      });

      if (notifError) console.error('Error creating notification:', notifError);

      toast({
        title: 'Profile Rejected',
        description: `${fullName}'s profile has been rejected.`,
        variant: 'destructive',
      });

      setShowRejectDialog(false);
      setSelectedMusicianId(null);

      // Refetch to update the list
      await fetchPendingMusicians();
    } catch (error) {
      console.error('Error rejecting musician:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject profile. Please try again.',
      });
    } finally {
      setActioningUserId(null);
    }
  };

  const openRejectDialog = (userId: string) => {
    setSelectedMusicianId(userId);
    setShowRejectDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Loading pending musician profiles...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
                    <div className="flex-grow space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-6 w-48" />
                          <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingMusicians.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>No pending musician profiles to review</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>All Clear!</AlertTitle>
            <AlertDescription>
              There are no pending musician profiles waiting for approval at this time.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals ({pendingMusicians.length})</CardTitle>
          <CardDescription>Review and approve musician profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingMusicians.map((musician) => (
              <Card key={musician.user_id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-shrink-0">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={musician.avatar_url || undefined} />
                        <AvatarFallback>
                          {musician.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-grow space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{musician.full_name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {musician.instruments?.map((instrument, idx) => (
                              <Badge key={idx} variant="secondary">
                                <Music className="h-3 w-3 mr-1" />
                                {instrument}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Badge variant="warning">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{musician.email}</span>
                        </div>
                        {musician.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{musician.phone}</span>
                          </div>
                        )}
                        {musician.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{musician.location}</span>
                          </div>
                        )}
                        {(musician.hourly_rate ?? 0) > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              GHC {(musician.hourly_rate ?? 0)}/hr
                            </span>
                          </div>
                        )}
                      </div>

                      {musician.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{musician.bio}</p>
                      )}

                      {musician.genres && musician.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {musician.genres.map((genre, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(musician.user_id, musician.full_name)}
                          disabled={actioningUserId === musician.user_id}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(musician.user_id)}
                          disabled={actioningUserId === musician.user_id}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Musician Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the musician's profile as rejected and they will be notified. Are you
              sure you want to reject this application?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMusicianId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedMusicianId) {
                  const musician = pendingMusicians.find((m) => m.user_id === selectedMusicianId);
                  if (musician) {
                    handleReject(selectedMusicianId, musician.full_name);
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
