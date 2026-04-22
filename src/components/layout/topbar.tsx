'use client'

import { Bell, Menu, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface TopbarProps {
  onMenuClick?: () => void
  title?: string
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        {title && (
          <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? (
              <Sun className="h-4.5 w-4.5" />
            ) : (
              <Moon className="h-4.5 w-4.5" />
            )}
          </Button>
        )}
        <Link href="/alertas">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
