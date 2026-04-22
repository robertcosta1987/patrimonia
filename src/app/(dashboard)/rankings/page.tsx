import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Briefcase, Shield, Building, FileText, Zap, ArrowRight } from 'lucide-react'

const RANKING_CATEGORIES = [
  {
    href: '/rankings/acoes',
    icon: TrendingUp,
    label: 'Ações',
    desc: 'Empresas listadas na B3 com análise fundamentalista',
    badge: '15 ativos',
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500',
  },
  {
    href: '/rankings/fiis',
    icon: Briefcase,
    label: 'Fundos Imobiliários (FIIs)',
    desc: 'Análise de FIIs por segmento, DY, P/VP e vacância',
    badge: '12 ativos',
    color: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-500',
  },
  {
    href: '/rankings/fi-infra',
    icon: Zap,
    label: 'FI-Infra',
    desc: 'Fundos de Infraestrutura com isenção de IR para pessoa física',
    badge: '8 ativos',
    color: 'bg-cyan-50 border-cyan-200',
    iconColor: 'text-cyan-500',
  },
  {
    href: '/rankings/tesouro',
    icon: Shield,
    label: 'Tesouro Direto',
    desc: 'Títulos públicos federais disponíveis para investimento',
    badge: '6 títulos',
    color: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
  },
  {
    href: '/rankings/renda-fixa',
    icon: Building,
    label: 'Renda Fixa Bancária',
    desc: 'CDBs, LCIs e LCAs com comparativo de taxas',
    badge: '10 ofertas',
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-500',
  },
  {
    href: '/rankings/debentures',
    icon: FileText,
    label: 'Debêntures',
    desc: 'Crédito privado com análise de risco e retorno',
    badge: '8 emissores',
    color: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-500',
  },
]

export default function RankingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Rankings de Investimentos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Análise comparativa educacional baseada em dados públicos e métricas fundamentalistas.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RANKING_CATEGORIES.map(cat => (
          <Link key={cat.href} href={cat.href}>
            <Card className={`h-full border-2 ${cat.color} hover:shadow-md transition-all cursor-pointer group`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm`}>
                    <cat.icon className={`h-5 w-5 ${cat.iconColor}`} />
                  </div>
                  <Badge variant="secondary" className="text-xs">{cat.badge}</Badge>
                </div>
                <h3 className="font-semibold text-sm">{cat.label}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cat.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                  Ver ranking <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground italic">
        ⚠️ Os scores apresentados são análises educativas baseadas em dados públicos. Não constituem recomendação de investimento.
        Os dados podem sofrer defasagem conforme a fonte e o horário da última atualização.
      </p>
    </div>
  )
}
