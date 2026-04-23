'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, User, BarChart3, TrendingUp, Calculator,
  BookOpen, MessageSquare, Bell, LineChart, Settings, ChevronRight,
  Briefcase, LogOut, ShieldCheck, Activity, Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const NAV_ITEMS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
      { href: '/perfil', icon: User, label: 'Perfil do Investidor' },
    ]
  },
  {
    label: 'Análise',
    items: [
      { href: '/rankings', icon: BarChart3, label: 'Rankings' },
      { href: '/carteira', icon: Briefcase, label: 'Carteira-Modelo' },
      { href: '/carteira-hipotetica', icon: Sparkles, label: 'Carteira Hipotética' },
      { href: '/estimativas', icon: LineChart, label: 'Estimativas' },
    ]
  },
  {
    label: 'Ferramentas',
    items: [
      { href: '/simulador', icon: Calculator, label: 'Simulador' },
      { href: '/chat', icon: MessageSquare, label: 'Chat IA' },
      { href: '/alertas', icon: Bell, label: 'Alertas' },
      { href: '/glossario', icon: BookOpen, label: 'Glossário' },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracoes', icon: Settings, label: 'Configurações' },
    ]
  }
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    router.push('/login')
  }

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm tracking-tight">PatrimonIA</span>
          <p className="text-[10px] text-[hsl(var(--sidebar-foreground))] opacity-60 leading-none mt-0.5">Inteligência de Investimentos</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_ITEMS.map((group) => (
          <div key={group.label}>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--sidebar-foreground))] opacity-40 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                      isActive
                        ? 'bg-[hsl(var(--sidebar-accent))] text-white font-medium'
                        : 'hover:bg-[hsl(var(--sidebar-accent))] hover:text-white opacity-75 hover:opacity-100'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-3 space-y-1">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] opacity-50">Dados com fins educativos</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[hsl(var(--sidebar-accent))] hover:text-white opacity-60 hover:opacity-100 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  )
}
