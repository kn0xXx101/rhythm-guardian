import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastProgress,
} from '@/components/ui/toast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const getVariantIcon = (variant?: string) => {
  switch (variant) {
    case 'success':
      return <CheckCircle2 className="h-5 w-5" />;
    case 'destructive':
      return <AlertCircle className="h-5 w-5" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />;
    case 'info':
      return <Info className="h-5 w-5" />;
    default:
      return null;
  }
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, progress, ...props }) {
        const icon = getVariantIcon(variant);

        return (
          <Toast key={id} variant={variant as any} {...props}>
            <div className="grid gap-1 flex-1">
              <div className="flex items-start gap-3">
                {icon && (
                  <div
                    className={cn(
                      'mt-0.5 flex-shrink-0',
                      variant === 'success' && 'text-green-600 dark:text-green-400',
                      variant === 'destructive' && 'text-red-600 dark:text-red-400',
                      variant === 'warning' && 'text-yellow-600 dark:text-yellow-400',
                      variant === 'info' && 'text-primary'
                    )}
                  >
                    {icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && <ToastDescription>{description}</ToastDescription>}
                </div>
              </div>
            </div>
            {action}
            <ToastClose />
            {progress !== undefined && <ToastProgress progress={progress} />}
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
