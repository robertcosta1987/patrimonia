import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MODEL_PORTFOLIOS } from '@/lib/data/model-portfolios'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EducationalDisclaimer } from '@/components/common/disclaimer'
import { Briefcase, Shield, TrendingUp, BarChart3 } from 'lucide-react'
import { AllocationChart } from '@/components/portfolio/allocation-chart'

const ASSET_CLASS_COLOR: Record<string, string> = {
  renda_fixa: '#3b82f6',
  tesouro: '#06b6d4',
  fii: '#10b981',
  acao: '#f59e0b',
  debenture: '#8b5cf6',
  caixa: '#94a3b8',
}

const PROFILE_ICONS: Record<string, typeof Shield> = {
  conservador: Shield,
  moderado: BarChart3,
  arrojado: TrendingUp,
}

const PROFILE_COLORS: Record<string, string> = {
  conservador: 'bg-blue-100 text-blue-700 border-blue-200',
  moderado: 'bg-amber-100 text-amber-700 border-amber-200',
  arrojado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export default async function CarteiraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('investor_profiles')
    .select('profile')
    .eq('user_id', user.id)
    .single()

  const userProfile = profile?.profile as string | undefined
  const suggestedPortfolio = MODEL_PORTFOLIOS.find(p => p.profile === userProfile)
  const allPortfolios = MODEL_PORTFOLIOS

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          Carteira-Modelo Educativa
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Alocações educativas por perfil de investidor. Baseadas em dados informados, não em recomendação profissional.
        </p>
      </div>

      {suggestedPortfolio && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2 text-sm">
          <span className="text-primary font-medium">✓ Compatível com seu perfil:</span>
          <Badge className={PROFILE_COLORS[suggestedPortfolio.profile]}>
            {suggestedPortfolio.profile.charAt(0).toUpperCase() + suggestedPortfolio.profile.slice(1)}
          </Badge>
        </div>
      )}

      <div className="grid gap-6">
        {allPortfolios.map(portfolio => {
          const Icon = PROFILE_ICONS[portfolio.profile]
          const isUserProfile = portfolio.profile === userProfile
          const chartData = portfolio.allocations.map(a => ({
            name: a.label,
            value: a.percentage,
            fill: ASSET_CLASS_COLOR[a.asset_class],
          }))

          return (
            <Card key={portfolio.id} className={isUserProfile ? 'ring-2 ring-primary/30' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      {portfolio.name}
                      {isUserProfile && <Badge className="text-xs bg-primary text-white">Seu perfil</Badge>}
                    </CardTitle>
                    <CardDescription className="mt-1">{portfolio.description}</CardDescription>
                  </div>
                  <Badge className={PROFILE_COLORS[portfolio.profile]} variant="outline">
                    {portfolio.profile.charAt(0).toUpperCase() + portfolio.profile.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div>
                    <AllocationChart data={chartData} />
                  </div>

                  {/* Allocations */}
                  <div className="space-y-3">
                    {portfolio.allocations.map(alloc => (
                      <div key={alloc.asset_class} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{alloc.label}</span>
                          <span className="text-sm font-bold" style={{ color: ASSET_CLASS_COLOR[alloc.asset_class] }}>
                            {alloc.percentage}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${alloc.percentage}%`, backgroundColor: ASSET_CLASS_COLOR[alloc.asset_class] }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{alloc.rationale}</p>
                        <p className="text-xs font-medium" style={{ color: ASSET_CLASS_COLOR[alloc.asset_class] }}>
                          {alloc.expected_characteristic}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <EducationalDisclaimer />
    </div>
  )
}
