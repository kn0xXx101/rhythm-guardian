import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VerificationPanel } from '@/components/admin/VerificationPanel';
import { Search, ShieldCheck, Clock, CheckCircle, RefreshCw, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MusicianVerification {
  user_id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  documents_submitted: boolean | null;
  documents_verified: boolean | null;
  created_at: string | null;
  avatar_url: string | null;
}

export default function VerificationsPage() {
  const { toast } = useToast();
  const [musicians, setMusicians] = useState<MusicianVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [selected, setSelected] = useState<MusicianVerification | null>(null);

  const fetchMusicians = async () => {
    setIsLoading(true);
    try {
      let query = supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email, status, documents_submitted, documents_verified, created_at, avatar_url')
        .eq('role', 'musician')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('documents_submitted', true).eq('documents_verified', false);
      } else if (filter === 'verified') {
        query = query.eq('documents_verified', true);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMusicians(data || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMusicians(); }, [filter, search]);

  const pendingCount = musicians.filter(m => m.documents_submitted && !m.documents_verified).length;

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Musician Verifications"
        text="Review submitted identity documents and grant verified badges."
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={filter === 'pending' ? 'border-yellow-400 border-2' : 'cursor-pointer'} onClick={() => setFilter('pending')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className={filter === 'verified' ? 'border-blue-400 border-2' : 'cursor-pointer'} onClick={() => setFilter('verified')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {musicians.filter(m => m.documents_verified).length}
            </div>
          </CardContent>
        </Card>
        <Card className={filter === 'all' ? 'border-primary border-2' : 'cursor-pointer'} onClick={() => setFilter('all')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">All Musicians</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{musicians.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>
              {filter === 'pending' ? 'Pending Verifications' : filter === 'verified' ? 'Verified Musicians' : 'All Musicians'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search musicians..."
                  className="pl-8 w-56"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchMusicians} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : musicians.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {filter === 'pending' ? 'No pending verifications' : 'No musicians found'}
              </p>
              <p className="text-sm mt-1">
                {filter === 'pending' ? 'All submissions have been reviewed.' : 'Try adjusting your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {musicians.map((musician) => (
                <div
                  key={musician.user_id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => setSelected(musician)}
                >
                  <div className="flex items-center gap-3">
                    {musician.avatar_url ? (
                      <img src={musician.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{musician.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{musician.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {musician.created_at ? new Date(musician.created_at).toLocaleDateString() : '—'}
                    </span>
                    {musician.documents_verified ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 text-xs">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </Badge>
                    ) : musician.documents_submitted ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 text-xs">
                        <Clock className="h-3 w-3" /> Pending
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">No Docs</Badge>
                    )}
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Review: {selected?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Musician info */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                {selected.avatar_url ? (
                  <img src={selected.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selected.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selected.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              <VerificationPanel
                userId={selected.user_id}
                userName={selected.full_name || 'Musician'}
                documentsSubmitted={selected.documents_submitted ?? false}
                documentsVerified={selected.documents_verified ?? false}
                onVerified={() => {
                  setSelected(null);
                  fetchMusicians();
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
