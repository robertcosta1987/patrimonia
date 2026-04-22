import { createClient } from '@/lib/supabase/server'
import { Disclaimer } from '@/components/common/disclaimer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreBadge } from '@/components/common/score-badge'
import { Building, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'

const TYPE_COLOR: Record<string, string> = {
  CDB: 'bg-blue-100 text-blue-700',
  LCI: 'bg-emerald-100 text-emerald-700',
  LCA: 'bg-amber-100 text-amber-700',
  CRI: 'bg-purple-100 text-purple-700',
  CRA: 'bg-rose-100 text-rose-700',
  LC: 'bg-slate-100 text-slate-700',
}

const LIQUIDITY_LABEL: Record<string, string> = { diaria: 'Liquidez Diária', no_vencimento: 'No Vencimento', prazo: 'Com Prazo' }

function formatRate(offer: { indexer: string; rate: number; rate_pct_cdi?: number | null }) {
  if (offer.indexer === 'CDI') return `${offer.rate_pct_cdi ?? offer.rate}% do CDI`
  if (offer.indexer === 'IPCA') return `IPCA + ${offer.rate.toFixed(2)}%`
  return `${offer.rate.toFixed(2)}% a.a.`
}

export default async function RendaFixaRankingPage() {
  const supabase = await createClient()
  const { data: offers } = await supabase
    .from('renda_fixa_offers')
    .select('*')
    .eq('is_available', true)
    .order('score', { ascending: false })

  const rows = offers ?? []

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building className="h-6 w-6 text-primary" />
          Renda Fixa Bancária
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          CDBs, LCIs e LCAs com análise comparativa de taxas, liquidez e cobertura do FGC.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Instituição</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Taxa</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vencimento</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Liquidez</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Mínimo</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">FGC</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((offer, idx) => (
                <tr key={offer.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <Badge className={TYPE_COLOR[offer.asset_type] ?? ''}>{offer.asset_type}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{offer.institution}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{formatRate(offer)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(offer.maturity_date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{LIQUIDITY_LABEL[offer.liquidity]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">R$ {offer.min_investment.toFixed(0)}</td>
                  <td className="px-4 py-3 text-center">
                    {offer.has_fgc ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <ShieldCheck className="h-3.5 w-3.5" /> Sim
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center"><ScoreBadge score={offer.score ?? 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Disclaimer variant="banner" text="Taxas e disponibilidades sujeitas a alteração. LCI e LCA possuem isenção de IR para pessoas físicas. Verifique as condições diretamente com a instituição financeira. Cobertura do FGC limitada a R$ 250.000 por CPF por instituição." />
    </div>
  )
}
