import { createClient } from '@/lib/supabase/server'
import { Disclaimer } from '@/components/common/disclaimer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreBadge } from '@/components/common/score-badge'
import { FileText } from 'lucide-react'
import { format } from 'date-fns'

const RISK_CONFIG = {
  baixo: 'bg-emerald-100 text-emerald-700',
  medio: 'bg-amber-100 text-amber-700',
  alto: 'bg-red-100 text-red-700',
}

function formatRate(offer: { indexer: string; rate: number }) {
  if (offer.indexer === 'CDI') return `CDI + ${offer.rate.toFixed(2)}%`
  if (offer.indexer === 'IPCA') return `IPCA + ${offer.rate.toFixed(2)}%`
  return `${offer.rate.toFixed(2)}% a.a.`
}

function fmtVolume(val: number | null | undefined) {
  if (val == null) return '—'
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)}M`
  if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(1)}K`
  return `R$ ${val.toFixed(0)}`
}

export default async function DebenturesRankingPage() {
  const supabase = await createClient()
  const { data: offers } = await supabase
    .from('debenture_offers')
    .select('*')
    .eq('is_available', true)
    .order('score', { ascending: false })

  const rows = offers ?? []

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Ranking de Debêntures
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crédito privado com análise de risco, rating e retorno estimado.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ticker</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Emissor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Taxa</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vencimento</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Rating</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Liquidez/dia</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Risco Est.</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((offer, idx) => (
                <tr key={offer.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-bold">{offer.ticker}</td>
                  <td className="px-4 py-3 text-sm">
                    <p className="text-foreground max-w-xs truncate">{offer.issuer}</p>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-0.5">{offer.indexer}</Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary">{formatRate(offer)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(offer.maturity_date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-center">
                    {offer.rating ? <Badge variant="outline" className="font-mono">{offer.rating}</Badge> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground font-mono text-xs">{fmtVolume(offer.avg_volume)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={RISK_CONFIG[offer.estimated_risk as keyof typeof RISK_CONFIG]}>
                      {offer.estimated_risk.charAt(0).toUpperCase() + offer.estimated_risk.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center"><ScoreBadge score={offer.score ?? 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Disclaimer variant="banner" text="Debêntures não possuem cobertura do FGC. O risco estimado é educativo e não substitui análise de crédito profissional. Liquidez pode ser limitada no mercado secundário. Não constitui recomendação de investimento." />
    </div>
  )
}
