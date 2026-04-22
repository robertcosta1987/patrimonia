'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DisclaimerProps {
  variant?: 'default' | 'compact' | 'banner'
  text?: string
  className?: string
}

const DEFAULT_TEXT = 'As informações apresentadas possuem caráter exclusivamente educacional e analítico. Não constituem recomendação individual de investimento. Rentabilidade passada não garante resultados futuros. Consulte um assessor de investimentos habilitado antes de tomar decisões.'

export function Disclaimer({ variant = 'default', text = DEFAULT_TEXT, className }: DisclaimerProps) {
  if (variant === 'compact') {
    return (
      <p className={cn('text-xs text-muted-foreground italic', className)}>
        ⚠️ {text}
      </p>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={cn('bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-3 items-start', className)}>
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">{text}</p>
      </div>
    )
  }

  return (
    <div className={cn('border border-border rounded-lg px-4 py-3 flex gap-3 items-start bg-muted/30', className)}>
      <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

export function EducationalDisclaimer() {
  return (
    <Disclaimer
      variant="banner"
      text="Esta é uma carteira-modelo educativa, baseada nos dados informados. Não constitui recomendação individual de investimento. Estimativas são projeções baseadas em premissas e não garantem resultados futuros."
    />
  )
}

export function SimulationDisclaimer() {
  return (
    <Disclaimer
      variant="compact"
      text="Simulação com fins educativos. Os valores são estimativas baseadas em premissas e não garantem rentabilidade futura. Os dados podem sofrer defasagem conforme a fonte e horário da última atualização."
    />
  )
}
