import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/services/admin';
import { auditService } from '@/services/audit';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VirtualTableBody } from '@/components/ui/virtual-table-body';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  MoreHorizontal,
  Ban,
  CheckCircle,
  Mail,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { Guitar, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TableSkeleton } from '@/components/ui/skeleton';

interface User {
  id: string;
  name: string;
  email: string;
  userType: 'hirer' | 'musician';
  status: 'active' | 'suspended' | 'banned' | 'pending';
  verified: boolean;
  joinDate: string;
  lastActive: string;
  profileComplete: boolean;
  documentsSubmitted: boolean;
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scrollElement, setScrollElement] = React.useState<HTMLElement | null>(null);
  const [selectedTab, setSelectedTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<{ id: string; action: string } | null>(
    null
  );
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};

      if (selectedTab === 'pending') {
        filters.status = 'pending';
      } else if (selectedTab === 'musicians') {
        filters.role = 'musician';
      } else if (selectedTab === 'hirers') {
        filters.role = 'hirer';
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      console.log('Fetching users with filters:', filters);
      const data = await adminService.getUsers(filters);

      if (!data) {
        console.warn('No users data received from admin service');
        setUsers([]);
        return;
      }

      console.log(`Retrieved ${data.length} users`);
      setUsers(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch users';
      console.error('Error fetching users:', err);

      // Check if it's an auth error
      if (errorMessage.includes('auth') || errorMessage.includes('permission')) {
        setError('Authentication failed. Please check admin permissions.');
        toast({
          title: 'Authentication Error',
          description: 'Failed to authenticate admin access. Please check your permissions.',
          variant: 'destructive',
        });
      } else {
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTab, searchTerm, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Get counts for tabs
  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const musicianCount = users.filter((u) => u.userType === 'musician').length;
  const hirerCount = users.filter((u) => u.userType === 'hirer').length;

  const handleStatusChange = async (
    userId: string,
    newStatus: 'active' | 'suspended' | 'banned' | 'pending'
  ) => {
    setActionInProgress({ id: userId, action: newStatus });
    try {
      setError(null);
      const user = users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const success = await adminService.updateUserStatus(userId, newStatus);
      if (success) {
        await fetchUsers();

        await auditService.logEvent({
          action: 'admin_update_user_status',
          entityType: 'user',
          entityId: userId,
          description: `Changed user status to ${newStatus}`,
          metadata: {
            userName: user.name,
            userType: user.userType,
            previousStatus: user.status,
            newStatus,
          },
        });

        const action =
          newStatus === 'banned'
            ? 'banned'
            : newStatus === 'suspended'
              ? 'suspended'
              : newStatus === 'pending'
                ? 'set to pending'
                : 'activated';

        toast({
          title: `User ${action}`,
          description: `${user.name} has been ${action}.`,
          variant: ['banned', 'suspended'].includes(newStatus) ? 'destructive' : 'default',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
      toast({
        title: 'Error',
        description: err.message || 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleVerify = async (userId: string) => {
    setActionInProgress({ id: userId, action: 'verify' });
    setError(null);
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const success = await adminService.verifyUser(userId);
      if (success) {
        await fetchUsers();

        await auditService.logEvent({
          action: 'admin_verify_user',
          entityType: 'user',
          entityId: userId,
          description: `Verified user and activated account`,
          metadata: {
            userName: user.name,
            userType: user.userType,
            previousStatus: user.status,
          },
        });
        toast({
          title: 'User verified',
          description: `${user.name} has been verified and activated successfully.`,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
      toast({
        title: 'Verification failed',
        description: err.message || 'Could not verify user.',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionInProgress({ id: userId, action: 'reject' });
    try {
      setError(null);
      const user = users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const success = await adminService.updateUserStatus(userId, 'banned');
      if (success) {
        await fetchUsers(); // Refresh the list after rejection
        toast({
          title: 'User rejected',
          description: `${user.name}'s application has been rejected.`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setError(error.message || 'Failed to reject user application');
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject user application',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const sendVerificationEmail = async (userId: string) => {
    setActionInProgress({ id: userId, action: 'email' });
    try {
      setError(null);
      const user = users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const success = await adminService.verifyUser(userId);
      if (success) {
        await fetchUsers(); // Refresh the list to get updated status

        // Try to get updated user email after refresh
        // Note: fetchUsers updates state asynchronously, so we fetch directly to get fresh data
        const filters: any = {};
        if (selectedTab === 'pending') filters.status = 'pending';
        else if (selectedTab === 'musicians') filters.role = 'musician';
        else if (selectedTab === 'hirers') filters.role = 'hirer';
        if (searchTerm) filters.search = searchTerm;

        const updatedUsers = await adminService.getUsers(filters);
        const updatedUser = updatedUsers.find((u) => u.id === userId);
        const email = updatedUser?.email || user.email;

        toast({
          title: 'Email sent',
          description:
            email && email.trim()
              ? `Verification email sent to ${email}.`
              : 'Verification email sent successfully.',
        });
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send verification email');
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification email',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUserIds = new Set(users.map((u) => u.id));
      setSelectedUsers(allUserIds);
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const allSelected = users.length > 0 && selectedUsers.size === users.length;
  const someSelected = selectedUsers.size > 0 && selectedUsers.size < users.length;

  return (
    <div className="space-y-6 animate-slide-in">
      <DashboardHeader
        heading="User Management"
        text="Manage all users, musicians, and hirers on the platform."
      />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          User Directory
          {selectedUsers.size > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedUsers.size} selected
            </Badge>
          )}
        </h2>
      </div>

      {pendingCount > 0 && (
        <Alert>
          <UserCheck className="h-4 w-4" />
          <AlertDescription>
            You have {pendingCount} pending user{pendingCount > 1 ? 's' : ''} awaiting verification.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
          <TabsTrigger value="pending" className={pendingCount > 0 ? 'text-orange-600' : ''}>
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="musicians">Musicians ({musicianCount})</TabsTrigger>
          <TabsTrigger value="hirers">Hirers ({hirerCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedTab === 'pending' && 'Pending Verifications'}
                  {selectedTab === 'musicians' && 'Musicians'}
                  {selectedTab === 'hirers' && 'Hirers'}
                  {selectedTab === 'all' && 'All Users'}
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8 w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
              {loading ? (
                <Table maxHeight="calc(100vh - 20rem)" onScrollContainerReady={setScrollElement}>
                  <TableHeader sticky>
                    <TableRow key="header">
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all users"
                          className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                          disabled
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableSkeleton rows={8} cols={9} />
                  </TableBody>
                </Table>
              ) : (
                <Table maxHeight="calc(100vh - 20rem)" onScrollContainerReady={setScrollElement}>
                  <TableHeader sticky>
                    <TableRow key="header">
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all users"
                          className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <VirtualTableBody
                    items={users}
                    scrollElement={scrollElement}
                    estimateSize={70}
                    threshold={30}
                    emptyMessage="No users found matching your criteria."
                    getRowKey={(user, index) => user.id || `user-${index}`}
                    renderRow={(user, index) => (
                      <TableRow key={user.id || `user-${index}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={(checked) =>
                              handleSelectUser(user.id, checked as boolean)
                            }
                            aria-label={`Select ${user.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium flex items-center gap-2">
                          {user.userType === 'musician' ? (
                            <Music className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Guitar className="h-4 w-4 text-blue-600" />
                          )}
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.userType === 'musician' ? 'secondary' : 'outline'}
                            className="flex items-center gap-2"
                          >
                            {user.userType === 'musician' ? (
                              <Music className="h-4 w-4" />
                            ) : (
                              <Guitar className="h-4 w-4" />
                            )}
                            {user.userType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.status === 'active'
                                ? 'outline'
                                : user.status === 'suspended'
                                  ? 'secondary'
                                  : user.status === 'pending'
                                    ? 'default'
                                    : 'destructive'
                            }
                            className={
                              user.status === 'pending'
                                ? 'bg-orange-100 text-orange-800 border-orange-200'
                                : ''
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.verified ? (
                            <CheckCircle
                              className="h-5 w-5 text-green-600"
                              aria-label="Verified user"
                            />
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 border-yellow-200"
                            >
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.userType === 'musician' ? (
                            user.documentsSubmitted ? (
                              <CheckCircle
                                className="h-5 w-5 text-green-600"
                                aria-label="Verified user"
                              />
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-red-100 text-red-800 border-red-200"
                              >
                                Missing
                              </Badge>
                            )
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.joinDate && !isNaN(new Date(user.joinDate).getTime())
                            ? new Date(user.joinDate).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.status === 'pending' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleVerify(user.id)}
                                    className="text-green-600"
                                    disabled={!!actionInProgress}
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    {actionInProgress?.id === user.id
                                      ? actionInProgress.action === 'verify'
                                        ? 'Verifying...'
                                        : actionInProgress.action === 'email'
                                          ? 'Sending email...'
                                          : 'Processing...'
                                      : 'Approve User'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleReject(user.id)}
                                    className="text-red-600"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Reject Application
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => sendVerificationEmail(user.id)}
                                className="text-blue-600"
                                disabled={!!actionInProgress}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                {actionInProgress?.id === user.id &&
                                actionInProgress?.action === 'email'
                                  ? 'Sending...'
                                  : 'Send Email'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(
                                    user.id,
                                    user.status === 'banned' ? 'active' : 'banned'
                                  )
                                }
                                className={
                                  user.status === 'banned' ? 'text-green-600' : 'text-destructive'
                                }
                                disabled={!!actionInProgress}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                {actionInProgress?.id === user.id
                                  ? actionInProgress.action === 'banned'
                                    ? 'Banning...'
                                    : actionInProgress.action === 'active'
                                      ? 'Unbanning...'
                                      : 'Processing...'
                                  : user.status === 'banned'
                                    ? 'Unban User'
                                    : 'Ban User'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )}
                  />
                </Table>
              )}
              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UsersManagement;
