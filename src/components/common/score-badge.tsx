import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

function getScoreConfig(score: number) {
  if (score >= 80) return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Excelente' }
  if (score >= 65) return { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Bom' }
  if (score >= 50) return { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Regular' }
  return { color: 'bg-red-100 text-red-700 border-red-200', label: 'Fraco' }
}

export function ScoreBadge({ score, size = 'md', showLabel = false, className }: ScoreBadgeProps) {
  const config = getScoreConfig(score)
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'lg' ? 'text-base px-3 py-1' : 'text-sm px-2 py-0.5'

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded border font-semibold tabular-nums',
      config.color, sizeClass, className
    )}>
      {score}
      {showLabel && <span className="font-normal opacity-75">· {config.label}</span>}
    </span>
  )
}

interface ScoreBarProps {
  score: number
  className?: string
}

export function ScoreBar({ score, className }: ScoreBarProps) {
  const config = getScoreConfig(score)
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 65 ? 'bg-blue-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold tabular-nums', config.color.includes('emerald') ? 'text-emerald-600' : config.color.includes('blue') ? 'text-blue-600' : config.color.includes('amber') ? 'text-amber-600' : 'text-red-600')}>
        {score}
      </span>
    </div>
  )
}
