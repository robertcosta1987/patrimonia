import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/common/metric-card'
import { Disclaimer } from '@/components/common/disclaimer'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  Calculator, MessageSquare, Bell, User, ArrowRight,
  Briefcase, Activity, RefreshCw
} from 'lucide-react'

async function getDashboardData(userId: string) {
  const supabase = await createClient()

  const [profileRes, alertsRes, macroRes, acoesRes, fiisRes] = await Promise.all([
    supabase.from('investor_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('alert_events').select('*').eq('user_id', userId).eq('is_read', false).order('triggered_at', { ascending: false }).limit(5),
    supabase.from('macro_indicators').select('*').order('name'),
    supabase.from('asset_metrics').select('*, assets(ticker,name,sector)').eq('assets.asset_class', 'acao').order('score', { ascending: false }).limit(5),
    supabase.from('asset_metrics').select('*, assets(ticker,name,segment)').eq('assets.asset_class', 'fii').order('score', { ascending: false }).limit(4),
  ])

  return {
    profile: profileRes.data,
    alerts: alertsRes.data ?? [],
    macro: macroRes.data ?? [],
    acoes: acoesRes.data ?? [],
    fiis: fiisRes.data ?? [],
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await getDashboardData(user.id)

  const selic = data.macro.find(m => m.name === 'selic_meta')
  const cdi = data.macro.find(m => m.name === 'cdi')
  const ipca = data.macro.find(m => m.name === 'ipca_12m')
  const dolar = data.macro.find(m => m.name === 'dolar_ptax')

  const profileLabels = { conservador: 'Conservador', moderado: 'Moderado', arrojado: 'Arrojado' }
  const profileColors: Record<string, string> = { conservador: 'bg-blue-100 text-blue-700', moderado: 'bg-amber-100 text-amber-700', arrojado: 'bg-emerald-100 text-emerald-700' }

  const firstName = user.user_metadata?.display_name?.split(' ')[0] ?? 'Investidor'

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {firstName} 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Seu painel de inteligência de investimentos</p>
        </div>
        {data.profile && (
          <Badge className={profileColors[data.profile.profile] ?? ''}>
            {profileLabels[data.profile.profile as keyof typeof profileLabels]}
          </Badge>
        )}
      </div>

      {/* Macro Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Selic Meta"
          value={selic ? `${selic.value.toFixed(2)}%` : '—'}
          subtitle="ao ano"
          icon={Activity}
          highlight
        />
        <MetricCard
          title="CDI"
          value={cdi ? `${cdi.value.toFixed(2)}%` : '—'}
          subtitle="ao ano"
          icon={TrendingUp}
        />
        <MetricCard
          title="IPCA 12M"
          value={ipca ? `${ipca.value.toFixed(2)}%` : '—'}
          subtitle="inflação acumulada"
          icon={TrendingDown}
        />
        <MetricCard
          title="Dólar"
          value={dolar ? `R$ ${dolar.value.toFixed(2)}` : '—'}
          subtitle="PTAX"
          icon={DollarSign}
        />
      </div>

      {/* Profile & Quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Profile Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Perfil do Investidor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.profile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Classificação</span>
                  <Badge className={profileColors[data.profile.profile]}>
                    {profileLabels[data.profile.profile as keyof typeof profileLabels]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Score de risco</span>
                  <span className="text-sm font-semibold">{data.profile.risk_score}/100</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${data.profile.risk_score}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                  <div>Renda Fixa <span className="font-semibold text-foreground">{data.profile.allocation_renda_fixa}%</span></div>
                  <div>FIIs <span className="font-semibold text-foreground">{data.profile.allocation_fii}%</span></div>
                  <div>Ações <span className="font-semibold text-foreground">{data.profile.allocation_acoes}%</span></div>
                  <div>Caixa <span className="font-semibold text-foreground">{data.profile.allocation_caixa}%</span></div>
                </div>
                <Link href="/carteira">
                  <Button variant="outline" size="sm" className="w-full mt-1">
                    Ver Carteira-Modelo <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">Defina seu perfil para obter análises personalizadas</p>
                <Link href="/perfil">
                  <Button size="sm">Definir Perfil</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: '/rankings', icon: BarChart3, label: 'Ranking de Investimentos', desc: 'Ações, FIIs, Renda Fixa' },
              { href: '/simulador', icon: Calculator, label: 'Simulador de Aportes', desc: 'Projete seu patrimônio' },
              { href: '/chat', icon: MessageSquare, label: 'Chat PatrimonIA', desc: 'Pergunte à IA' },
              { href: '/estimativas', icon: TrendingUp, label: 'Estimativas', desc: 'Projeções educativas' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10">
                  <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Alertas Recentes
              </span>
              <Link href="/alertas" className="text-xs text-primary hover:underline font-normal">Ver todos</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.alerts.length > 0 ? (
              <div className="space-y-2">
                {data.alerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Bell className="h-8 w-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta ativo</p>
                <Link href="/alertas" className="text-xs text-primary hover:underline">Configurar alertas</Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Featured Rankings */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Ações */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Top Ações por Score
              </span>
              <Link href="/rankings/acoes" className="text-xs text-primary hover:underline font-normal">Ver ranking</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.acoes.filter(a => a.assets).slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                  <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">{(item as any).assets?.ticker}</span>
                    <p className="text-xs text-muted-foreground truncate">{(item as any).assets?.name}</p>
                  </div>
                  {item.dividend_yield && (
                    <span className="text-xs text-muted-foreground">DY {item.dividend_yield.toFixed(1)}%</span>
                  )}
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${(item.score ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : (item.score ?? 0) >= 65 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top FIIs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Top FIIs por Score
              </span>
              <Link href="/rankings/fiis" className="text-xs text-primary hover:underline font-normal">Ver ranking</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.fiis.filter(f => f.assets).slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                  <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">{(item as any).assets?.ticker}</span>
                    <p className="text-xs text-muted-foreground truncate">{(item as any).assets?.segment}</p>
                  </div>
                  {item.dividend_yield && (
                    <span className="text-xs text-muted-foreground">DY {item.dividend_yield.toFixed(1)}%</span>
                  )}
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${(item.score ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : (item.score ?? 0) >= 65 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.score}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Disclaimer variant="compact" />
    </div>
  )
}
