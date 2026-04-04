import * as React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardIcon } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface TrendData {
  value: number;
  percentage: number;
  direction: 'up' | 'down' | 'neutral';
  period?: string;
}

export interface EnhancedDashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: TrendData;
  description?: string;
  variant?: 'default' | 'gradient' | 'glass';
  className?: string;
  iconColor?: string;
  onClick?: () => void;
}

export function EnhancedDashboardCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  variant = 'default',
  className,
  iconColor,
  onClick,
}: EnhancedDashboardCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend?.direction === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend?.direction === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card
        variant={variant}
        onClick={onClick}
        className={cn(
          'relative overflow-hidden group transition-all duration-300',
          onClick && 'cursor-pointer',
          className
        )}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardIcon
            icon={Icon}
            className={cn(
              'transition-all duration-300 group-hover:scale-110',
              iconColor || 'text-primary'
            )}
            animated
          />
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold transition-colors group-hover:text-primary">
              {value}
            </div>

            {trend && (
              <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>
                  {Math.abs(trend.percentage)}% {trend.period || 'vs last period'}
                </span>
              </div>
            )}

            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


