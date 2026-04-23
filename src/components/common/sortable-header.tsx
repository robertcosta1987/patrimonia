'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  colKey: string
  label: string
  currentSort: string
  currentDir: string
  align?: 'left' | 'right' | 'center'
  className?: string
}

export function SortableHeader({ colKey, label, currentSort, currentDir, align = 'right', className }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isActive = currentSort === colKey
  const nextDir = isActive && currentDir === 'desc' ? 'asc' : 'desc'

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', colKey)
    params.set('dir', nextDir)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <th
      onClick={handleClick}
      className={cn(
        'px-4 py-3 font-semibold cursor-pointer select-none group whitespace-nowrap',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' ? 'flex-row-reverse' : '')}>
        {label}
        {isActive ? (
          currentDir === 'asc'
            ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
            : <ChevronDown className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </span>
    </th>
  )
}
