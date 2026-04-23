import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Info, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { resolveNavigationMessage, type AssistantUserRole } from '@/features/navigation-assistant/resolve-navigation-message';

const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type NavigationAssistantProps = {
  role: AssistantUserRole;
  pathname: string;
  tourCompleted: boolean;
  signals?: {
    profileCompletion: number | null;
    documentsSubmitted: boolean | null;
    documentsVerified: boolean | null;
    pendingBookingsCount: number;
    unpaidBookingsCount: number;
    needsServiceConfirmationCount: number;
  };
  /** When false, assistant stays hidden (prevents flicker during loading). */
  ready?: boolean;
};

function iconForSeverity(severity: 'info' | 'tip' | 'action_required') {
  if (severity === 'action_required') return AlertCircle;
  if (severity === 'tip') return Lightbulb;
  return Info;
}

function toneClassForSeverity(severity: 'info' | 'tip' | 'action_required') {
  if (severity === 'action_required') return 'border-orange-300/70 bg-orange-500/5';
  if (severity === 'tip') return 'border-primary/30 bg-primary/5';
  return 'border-border bg-muted/40';
}

export function NavigationAssistant({ role, pathname, tourCompleted, signals, ready = true }: NavigationAssistantProps) {
  const navigate = useNavigate();
  const [dismissedAt, setDismissedAt] = useState(0);
  const message = useMemo(
    () => resolveNavigationMessage({ role, pathname, tourCompleted, signals }),
    [role, pathname, tourCompleted, signals]
  );

  if (!ready) return null;
  if (!message) return null;

  const dismissKey = `navAssistantDismissedUntil:${role}:${message.id}`;
  const dismissedUntil = Math.max(Number(localStorage.getItem(dismissKey) || 0), dismissedAt);
  if (dismissedUntil > Date.now()) return null;

  const Icon = iconForSeverity(message.severity);
  return (
    <Alert className={cn('mb-4', toneClassForSeverity(message.severity))}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{message.title}</AlertTitle>
      <AlertDescription className="mt-1 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>{message.body}</span>
        <span className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              navigate(message.primaryAction.href);
            }}
          >
            {message.primaryAction.label}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const until = Date.now() + DISMISS_COOLDOWN_MS;
              localStorage.setItem(dismissKey, String(until));
              setDismissedAt(until);
            }}
          >
            Dismiss
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
