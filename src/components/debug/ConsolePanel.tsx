import { useState, useEffect } from 'react';
import { logger } from '@/utils/console-logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Trash2, RefreshCw } from 'lucide-react';

export function ConsolePanel() {
  const [logs, setLogs] = useState(logger.getLogs());
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const refreshLogs = () => {
    setLogs(logger.getLogs());
  };

  useEffect(() => {
    const interval = setInterval(refreshLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Console Logs</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshLogs}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => logger.downloadLogs()}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                logger.clear();
                refreshLogs();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({logs.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'error' ? 'destructive' : 'outline'}
            onClick={() => setFilter('error')}
          >
            Errors ({logs.filter(l => l.level === 'error').length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'warn' ? 'warning' : 'outline'}
            onClick={() => setFilter('warn')}
          >
            Warnings ({logs.filter(l => l.level === 'warn').length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'info' ? 'secondary' : 'outline'}
            onClick={() => setFilter('info')}
          >
            Info ({logs.filter(l => l.level === 'info').length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No logs to display</p>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded border ${
                  log.level === 'error'
                    ? 'bg-destructive/10 border-destructive/20'
                    : log.level === 'warn'
                    ? 'bg-yellow-500/10 border-yellow-500/20'
                    : 'bg-muted border-border'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-semibold">
                    {log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{log.message}</div>
                    {log.data && (
                      <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                    {log.stack && (
                      <pre className="mt-1 text-xs text-destructive overflow-x-auto">
                        {log.stack}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
