import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  change?: number
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
  highlight?: boolean
}

export function MetricCard({
  title, value, subtitle, change, icon: Icon, trend, className, highlight
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'

  return (
    <Card className={cn('relative overflow-hidden', highlight && 'border-primary/30 bg-primary/5', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="mt-1.5 text-2xl font-bold text-foreground tracking-tight">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              highlight ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Icon className={cn('h-5 w-5', highlight ? 'text-primary' : 'text-muted-foreground')} />
            </div>
          )}
        </div>
        {(change !== undefined || trend) && (
          <div className={cn('mt-3 flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            {change !== undefined && (
              <span>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
