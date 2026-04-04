import React, { useEffect, useState } from 'react';
import { auditService, type AuditLog } from '@/services/audit';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getRoleBadgeVariant = (role: string | null) => {
  if (role === 'admin') return 'destructive';
  if (role === 'musician') return 'secondary';
  if (role === 'hirer') return 'outline';
  return 'default';
};

const getActionBadgeVariant = (action: string) => {
  if (action.toLowerCase().includes('delete') || action.toLowerCase().includes('ban')) {
    return 'destructive';
  }
  if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) {
    return 'secondary';
  }
  if (action.toLowerCase().includes('create') || action.toLowerCase().includes('verify')) {
    return 'default';
  }
  return 'outline';
};

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await auditService.getLogs();
      setLogs(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.entityType.toLowerCase().includes(term) ||
      (log.description || '').toLowerCase().includes(term) ||
      (log.actorRole || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Audit Logs"
        text="Review admin actions and sensitive operations across the platform."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold">Recent activity</CardTitle>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by action, entity, role, description..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-64"
            />
            <Button variant="outline" onClick={loadLogs} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No audit events found.</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Time</TableHead>
                    <TableHead className="w-[140px]">Actor role</TableHead>
                    <TableHead className="w-[200px]">Action</TableHead>
                    <TableHead className="w-[180px]">Entity</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(log.actorRole)}>
                          {log.actorRole || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)} className="max-w-[180px] truncate">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{log.entityType}</span>
                          {log.entityId && (
                            <span className="text-xs text-muted-foreground">
                              {log.entityId.substring(0, 8)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {log.description && (
                            <span className="text-sm text-foreground line-clamp-2">
                              {log.description}
                            </span>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {JSON.stringify(log.metadata).substring(0, 120)}
                              {JSON.stringify(log.metadata).length > 120 ? '…' : ''}
                            </span>
                          )}
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
    </div>
  );
};

export default AuditLogs;
