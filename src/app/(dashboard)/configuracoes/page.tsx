import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Database, Activity, RefreshCw, Shield } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [sourcesRes, syncRunsRes] = await Promise.all([
    supabase.from('data_sources').select('*').order('name'),
    supabase.from('data_sync_runs').select('*').order('started_at', { ascending: false }).limit(10),
  ])

  const sources = sourcesRes.data ?? []
  const syncRuns = syncRunsRes.data ?? []

  const HEALTH_COLORS: Record<string, string> = {
    healthy: 'bg-emerald-100 text-emerald-700',
    degraded: 'bg-amber-100 text-amber-700',
    down: 'bg-red-100 text-red-700',
    unknown: 'bg-slate-100 text-slate-600',
  }

  const STATUS_COLORS: Record<string, string> = {
    success: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
    partial: 'bg-amber-100 text-amber-700',
    idle: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Status da plataforma, fontes de dados e sincronização.</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">E-mail</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">ID da conta</span>
            <span className="text-xs font-mono text-muted-foreground">{user.id.slice(0, 12)}…</span>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Fontes de Dados
          </CardTitle>
          <CardDescription className="text-xs">Status das integrações com provedores de dados de mercado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sources.map(source => (
              <div key={source.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{source.name}</p>
                  {source.base_url && <p className="text-xs text-muted-foreground truncate max-w-xs">{source.base_url}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={HEALTH_COLORS[source.health_status]}>
                    {source.health_status}
                  </Badge>
                  {!source.is_active && <Badge variant="secondary">Inativo</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Histórico de Sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncRuns.length > 0 ? (
            <div className="space-y-1.5">
              {syncRuns.map(run => (
                <div key={run.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-xs">
                  <div>
                    <span className="font-medium">{run.source_name}</span>
                    <span className="text-muted-foreground ml-2">{run.records_fetched} registros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.duration_ms && <span className="text-muted-foreground">{run.duration_ms}ms</span>}
                    <Badge className={STATUS_COLORS[run.status]}>{run.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma sincronização registrada</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic flex items-center gap-1">
        <Activity className="h-3 w-3" />
        Os dados de mercado são coletados de fontes públicas e parceiros. Podem apresentar defasagem em relação aos valores em tempo real.
      </p>
    </div>
  )
}
