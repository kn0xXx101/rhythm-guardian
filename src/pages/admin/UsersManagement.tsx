import { useState, useEffect, useMemo } from 'react';
import { adminService } from '@/services/admin';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton } from '@/components/ui/skeleton';

interface User {
  id: string;
  name: string;
  email: string;
  location?: string;
  userType: 'hirer' | 'musician';
  status: 'active' | 'suspended' | 'banned' | 'pending';
  verified: boolean;
  joinDate: string;
  lastActive: string;
  profileComplete: boolean;
  documentsSubmitted: boolean;
  documentsVerified: boolean;
  completionPercentage: number;
  isActive: boolean;
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // Default to pending users
  const [roleFilter, setRoleFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'view' | 'approve' | 'reject' | 'suspend' | 'unsuspend'>('view');
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false);
  const [dangerAction, setDangerAction] = useState<'delete_user' | 'purge_users' | null>(null);
  const [isDangerWorking, setIsDangerWorking] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const filters = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        availability: availabilityFilter !== 'all' ? availabilityFilter : undefined,
        search: searchTerm || undefined,
      };
      
      const userData = await adminService.getUsers(filters);
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Using direct database query.',
        variant: 'destructive',
      });
      // Set empty array as fallback
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, roleFilter, availabilityFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [users, searchTerm]);

  const handleUserAction = async (user: User, action: 'approve' | 'reject' | 'suspend' | 'unsuspend') => {
    try {
      console.log(`Attempting to ${action} user:`, user.id, user.name);
      
      let newStatus: 'active' | 'suspended' | 'banned' | 'pending' = user.status;
      let actionMessage = '';
      
      if (action === 'approve') {
        newStatus = 'active';
        actionMessage = `${user.name} has been approved and can now access the platform.`;
        // Also verify the user when approving
        await adminService.verifyUser(user.id);
      } else if (action === 'reject') {
        newStatus = 'banned';
        actionMessage = `${user.name} has been rejected and cannot access the platform.`;
      } else if (action === 'suspend') {
        newStatus = 'suspended';
        actionMessage = `${user.name} has been suspended.`;
      } else if (action === 'unsuspend') {
        newStatus = 'active';
        actionMessage = `${user.name} has been unsuspended and can now access the platform.`;
      }

      console.log(`Updating user ${user.id} status from ${user.status} to ${newStatus}`);
      await adminService.updateUserStatus(user.id, newStatus);
      console.log(`Successfully updated user ${user.id} status to ${newStatus}`);
      
      toast({
        title: action === 'approve' ? 'User Approved' : 
               action === 'reject' ? 'User Rejected' : 
               action === 'suspend' ? 'User Suspended' :
               'User Unsuspended',
        description: actionMessage,
      });

      // Refresh users list
      console.log('Refreshing users list...');
      await fetchUsers();
      console.log('Users list refreshed');
      setIsDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error in handleUserAction:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openUserDialog = (user: User, action: 'view' | 'approve' | 'reject' | 'suspend' | 'unsuspend') => {
    setSelectedUser(user);
    setActionType(action);
    setIsDialogOpen(true);
  };

  const openDangerDialog = (action: 'delete_user' | 'purge_users', user?: User) => {
    if (user) setSelectedUser(user);
    setDangerAction(action);
    setDangerDialogOpen(true);
  };

  const runDangerAction = async () => {
    if (!dangerAction) return;
    setIsDangerWorking(true);
    try {
      if (dangerAction === 'delete_user') {
        if (!selectedUser) throw new Error('No user selected');
        const removedUserId = selectedUser.id;
        const removedUserName = selectedUser.name;
        await adminService.deleteUser(removedUserId);
        // Optimistically remove from the current list so UI reflects the successful action immediately.
        setUsers((prev) => prev.filter((u) => u.id !== removedUserId));
        toast({ title: 'User deleted', description: `${removedUserName} has been deleted.` });
        setDangerDialogOpen(false);
        setSelectedUser(null);
        await fetchUsers();
        return;
      }

      if (dangerAction === 'purge_users') {
        const result = await adminService.deleteAllUsers();
        // Immediate UI consistency while refresh completes.
        setUsers([]);
        toast({
          title: 'Users cleared',
          description: `Deleted ${result.deleted ?? 0} user(s).`,
        });
        setDangerDialogOpen(false);
        setSelectedUser(null);
        await fetchUsers();
        return;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive',
      });
    } finally {
      setIsDangerWorking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      pending: 'secondary',
      suspended: 'destructive',
      banned: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getAvailabilityBadge = (isActive: boolean) => (
    <Badge variant="outline" className={isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === 'musician' ? 'outline' : 'secondary'}>
        {role}
      </Badge>
    );
  };

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const pending = users.filter(u => u.status === 'pending').length;
    const musicians = users.filter(u => u.userType === 'musician').length;
    const hirers = users.filter(u => u.userType === 'hirer').length;
    const verified = users.filter(u => u.verified).length;

    return { total, active, pending, musicians, hirers, verified };
  }, [users]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Users Management"
        text="Review and approve new user registrations, manage existing users."
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className={stats.pending > 0 ? 'border-yellow-500 border-2' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <UserX className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pending > 0 ? 'Requires action' : 'All caught up'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Musicians</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.musicians}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hirers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.hirers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Users</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button
                onClick={fetchUsers}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="musician">Musicians</SelectItem>
                  <SelectItem value="hirer">Hirers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={availabilityFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setAvailabilityFilter(value)}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue placeholder="Filter by availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Availability</SelectItem>
                  <SelectItem value="active">Availability Active</SelectItem>
                  <SelectItem value="inactive">Availability Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} cols={8} />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.location || 'N/A'}</TableCell>
                      <TableCell>{getRoleBadge(user.userType)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{getAvailabilityBadge(user.isActive)}</TableCell>
                      <TableCell>
                        {user.verified ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unverified</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${user.completionPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {user.completionPercentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{user.joinDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openUserDialog(user, 'view')}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user.status === 'pending' ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openUserDialog(user, 'approve')}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Approve User"
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openUserDialog(user, 'reject')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Reject User"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </>
                          ) : user.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUserDialog(user, 'suspend')}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Suspend User"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          ) : user.status === 'suspended' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUserDialog(user, 'unsuspend')}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Unsuspend User"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'view' && 'User Details'}
              {actionType === 'approve' && 'Approve User'}
              {actionType === 'reject' && 'Reject User'}
              {actionType === 'suspend' && 'Suspend User'}
              {actionType === 'unsuspend' && 'Unsuspend User'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'view' && 'View detailed information about this user.'}
              {actionType === 'approve' && 'Approve this user to grant them access to the platform. They will be able to log in and use all features.'}
              {actionType === 'reject' && 'Reject this user registration. They will not be able to access the platform.'}
              {actionType === 'suspend' && 'Suspend this user account. They will be temporarily unable to access the platform.'}
              {actionType === 'unsuspend' && 'Unsuspend this user account. They will regain access to the platform.'}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p>{selectedUser.location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="capitalize">{selectedUser.userType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {getStatusBadge(selectedUser.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Availability</p>
                  {getAvailabilityBadge(selectedUser.isActive)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                  <p>{selectedUser.joinDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Active</p>
                  <p>{selectedUser.lastActive}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Profile Complete</p>
                  <p>{selectedUser.profileComplete ? 'Yes' : 'No'} ({selectedUser.completionPercentage}%)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Documents</p>
                  <p>
                    {selectedUser.documentsVerified ? 'Verified' : 
                     selectedUser.documentsSubmitted ? 'Submitted' : 'Not Submitted'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            {selectedUser && (
              <Button
                variant="destructive"
                onClick={() => {
                  setIsDialogOpen(false);
                  openDangerDialog('delete_user', selectedUser);
                }}
              >
                Delete User
              </Button>
            )}
            {actionType !== 'view' && selectedUser && (
              <Button
                onClick={() => handleUserAction(selectedUser, actionType as 'approve' | 'reject' | 'suspend' | 'unsuspend')}
                variant={actionType === 'reject' || actionType === 'suspend' ? 'destructive' : 'default'}
              >
                {actionType === 'approve' && 'Approve User'}
                {actionType === 'reject' && 'Reject User'}
                {actionType === 'suspend' && 'Suspend User'}
                {actionType === 'unsuspend' && 'Unsuspend User'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            These actions are permanent. Use with extreme caution.
          </div>
          <Button variant="destructive" onClick={() => openDangerDialog('purge_users')}>
            Clear all user accounts
          </Button>
        </CardContent>
      </Card>

      {/* Danger Confirm Dialog */}
      <Dialog open={dangerDialogOpen} onOpenChange={setDangerDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {dangerAction === 'delete_user' ? 'Delete user account' : 'Clear all user accounts'}
            </DialogTitle>
            <DialogDescription>
              {dangerAction === 'delete_user'
                ? 'This will permanently delete this user and related data (best effort). This cannot be undone.'
                : 'This will permanently delete ALL non-admin user accounts (in batches) and related data. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            {dangerAction === 'delete_user' && selectedUser ? (
              <div>
                You are about to delete: <span className="font-medium">{selectedUser.name}</span> (
                <span className="font-mono">{selectedUser.id}</span>)
              </div>
            ) : (
              <div>You are about to clear all non-admin user accounts.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDangerDialogOpen(false)} disabled={isDangerWorking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={runDangerAction} disabled={isDangerWorking}>
              {isDangerWorking ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UsersManagement;