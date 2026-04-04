import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
  action?: {
    label: string;
    href: string;
    icon?: LucideIcon;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
  };
  className?: string;
}

export function DashboardHeader({
  heading,
  text,
  children,
  action,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-slide-in', className)}>
      <div className="grid gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{heading}</h1>
        {text && <p className="text-lg text-muted-foreground">{text}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {action && (
          <Link to={action.href}>
            <Button variant={action.variant || 'default'} size="lg" className="gap-2">
              {action.icon && <action.icon className="h-5 w-5" />}
              {action.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
