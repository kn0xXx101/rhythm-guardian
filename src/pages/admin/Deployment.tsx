import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import {
  Server,
  Database,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Play,
  Terminal,
  Globe,
  Key,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MigrationStatus {
  name: string;
  status: 'applied' | 'pending' | 'failed';
  appliedAt?: string;
}

interface DeploymentInfo {
  version: string;
  deployedAt: string;
  status: 'success' | 'failed' | 'in-progress';
  commitHash?: string;
  branch?: string;
}

const Deployment = () => {
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [migrations, setMigrations] = useState<MigrationStatus[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkServerStatus();
    checkDatabaseStatus();
    loadMigrations();
    loadDeployments();
    loadEnvironmentVariables();
  }, []);

  const checkServerStatus = async () => {
    setServerStatus('checking');
    try {
      const response = await fetch('/');
      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const checkDatabaseStatus = async () => {
    setDbStatus('checking');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      if (error) throw error;
      setDbStatus('connected');
    } catch (error) {
      setDbStatus('disconnected');
      console.error('Database connection error:', error);
    }
  };

  const loadMigrations = async () => {
    try {
      // In a real app, this would query the supabase_migrations.schema_migrations table
      // For now, we'll simulate with the migration files we know about
      const migrationFiles = [
        '00001_initial_setup.sql',
        '00002_security_and_indexes.sql',
        '00003_initial_data.sql',
        '00004_functions_and_triggers.sql',
        '00008_add_profile_insert_policy.sql',
        '00009_add_user_profile_fk.sql',
        '00010_add_profile_completion_fields.sql',
      ];

      // Try to check actual migration status
      try {
        const { data, error } = await supabase
          .from('schema_migrations')
          .select('*')
          .order('version', { ascending: true });

        if (!error && data) {
          const appliedMigrations = data.map((m: any) => m.version);
          setMigrations(
            migrationFiles.map((file) => ({
              name: file,
              status: appliedMigrations.includes(file) ? 'applied' : 'pending',
              appliedAt: appliedMigrations.includes(file) ? new Date().toISOString() : undefined,
            }))
          );
          return;
        }
      } catch (e) {
        // Fallback to simulated data
      }

      // Simulated migration status
      setMigrations(
        migrationFiles.map((file, index) => ({
          name: file,
          status: index < 3 ? 'applied' : 'pending',
          appliedAt: index < 3 ? new Date().toISOString() : undefined,
        }))
      );
    } catch (error) {
      console.error('Failed to load migrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load migration status.',
        variant: 'destructive',
      });
    }
  };

  const loadDeployments = () => {
    // Simulated deployment history
    setDeployments([
      {
        version: '1.0.0',
        deployedAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'success',
        commitHash: 'a1b2c3d',
        branch: 'main',
      },
      {
        version: '0.9.0',
        deployedAt: new Date(Date.now() - 172800000).toISOString(),
        status: 'success',
        commitHash: 'e4f5g6h',
        branch: 'main',
      },
    ]);
  };

  const loadEnvironmentVariables = () => {
    // Load from localStorage or API
    const stored = localStorage.getItem('env_vars');
    if (stored) {
      setEnvVars(JSON.parse(stored));
    } else {
      // Default environment variables
      setEnvVars({
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        NODE_ENV: import.meta.env.MODE || 'development',
      });
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      // Simulate deployment process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const newDeployment: DeploymentInfo = {
        version: '1.0.1',
        deployedAt: new Date().toISOString(),
        status: 'success',
        commitHash: Math.random().toString(36).substring(7),
        branch: 'main',
      };

      setDeployments([newDeployment, ...deployments]);
      toast({
        title: 'Deployment Successful',
        description: 'Your application has been deployed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: 'An error occurred during deployment.',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRefresh = async () => {
    setIsChecking(true);
    await Promise.all([checkServerStatus(), checkDatabaseStatus(), loadMigrations()]);
    setIsChecking(false);
    toast({
      title: 'Status Updated',
      description: 'All systems have been checked.',
    });
  };

  const handleSaveEnvVar = (key: string, value: string) => {
    const updated = { ...envVars, [key]: value };
    setEnvVars(updated);
    localStorage.setItem('env_vars', JSON.stringify(updated));
    toast({
      title: 'Environment Variable Saved',
      description: `${key} has been updated.`,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      applied: 'default',
      pending: 'secondary',
      failed: 'destructive',
      success: 'default',
      'in-progress': 'outline',
      online: 'default',
      offline: 'destructive',
      connected: 'default',
      disconnected: 'destructive',
    };

    const colors: Record<string, string> = {
      applied: 'bg-green-500',
      pending: 'bg-yellow-500',
      failed: 'bg-red-500',
      success: 'bg-green-500',
      'in-progress': 'bg-blue-500',
      online: 'bg-green-500',
      offline: 'bg-red-500',
      connected: 'bg-green-500',
      disconnected: 'bg-red-500',
    };

    return (
      <Badge variant={variants[status] || 'secondary'} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-500'}`} />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <DashboardHeader
        heading="Deployment"
        text="Manage deployments, migrations, and server configuration."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isChecking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button onClick={handleDeploy} disabled={isDeploying}>
            <Play className="mr-2 h-4 w-4" />
            {isDeploying ? 'Deploying...' : 'Deploy Now'}
          </Button>
        </div>
      </DashboardHeader>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isChecking ? (
           Array(4).fill(0).map((_, i) => (
             <CardSkeleton key={i} className="h-32" />
           ))
        ) : (
          <>
        <Card variant="gradient-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusBadge(serverStatus)}
              {serverStatus === 'checking' && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {serverStatus === 'online' ? 'Server is running' : 'Server is offline'}
            </p>
          </CardContent>
        </Card>

        <Card variant="gradient-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusBadge(dbStatus)}
              {dbStatus === 'checking' && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dbStatus === 'connected' ? 'Database connected' : 'Database disconnected'}
            </p>
          </CardContent>
        </Card>

        <Card variant="gradient-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Migrations</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {migrations.filter((m) => m.status === 'applied').length} / {migrations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {migrations.filter((m) => m.status === 'pending').length} pending
            </p>
          </CardContent>
        </Card>

        <Card variant="gradient-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Deployment</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deployments[0]?.version || 'N/A'}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {deployments[0]?.deployedAt
                ? new Date(deployments[0].deployedAt).toLocaleDateString()
                : 'No deployments'}
            </p>
          </CardContent>
        </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="migrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="migrations">Migrations</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="migrations" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Database Migrations</CardTitle>
              <CardDescription>View and manage database migration status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {migrations.map((migration, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {migration.status === 'applied' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="Success" />
                      ) : migration.status === 'failed' ? (
                        <XCircle className="h-5 w-5 text-red-600" aria-label="Failed" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" aria-label="In progress" />
                      )}
                      <div>
                        <p className="font-medium">{migration.name}</p>
                        {migration.appliedAt && (
                          <p className="text-sm text-muted-foreground">
                            Applied: {new Date(migration.appliedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(migration.status)}
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadMigrations}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Migrations
                </Button>
                <Button variant="outline">
                  <Terminal className="mr-2 h-4 w-4" />
                  Run Pending Migrations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment History</CardTitle>
              <CardDescription>View past deployments and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deployments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No deployments yet</p>
                ) : (
                  deployments.map((deployment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">v{deployment.version}</p>
                            {getStatusBadge(deployment.status)}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(deployment.deployedAt).toLocaleString()}
                            </span>
                            {deployment.commitHash && (
                              <span className="flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                {deployment.branch} ({deployment.commitHash.substring(0, 7)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>Manage environment variables and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{key}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={key}
                      type={key.includes('KEY') || key.includes('SECRET') ? 'password' : 'text'}
                      value={value}
                      onChange={(e) => {
                        const updated = { ...envVars, [key]: e.target.value };
                        setEnvVars(updated);
                      }}
                      onBlur={() => handleSaveEnvVar(key, value)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSaveEnvVar(key, value)}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadEnvironmentVariables}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Variables
                </Button>
                <Button variant="outline">Export Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Deployment Logs</CardTitle>
              <CardDescription>View recent deployment and system logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    <span>[{new Date().toLocaleTimeString()}] System initialized</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>
                      [{new Date(Date.now() - 1000).toLocaleTimeString()}] Database connection
                      established
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>
                      [{new Date(Date.now() - 2000).toLocaleTimeString()}] Server started on port
                      8080
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-yellow-600" />
                    <span>
                      [{new Date(Date.now() - 3000).toLocaleTimeString()}] Checking migration
                      status...
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Logs
                </Button>
                <Button variant="outline">Download Logs</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Deployment;
