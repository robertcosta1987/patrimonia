import { createClient } from '@/lib/supabase/server'
import { Disclaimer } from '@/components/common/disclaimer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const INDEXER_LABEL: Record<string, string> = { selic: 'Selic', ipca: 'IPCA+', prefixado: 'Prefixado' }
const LIQUIDITY_LABEL: Record<string, string> = { diaria: 'Diária', no_vencimento: 'No vencimento' }

const INDEXER_COLOR: Record<string, string> = {
  selic: 'bg-blue-100 text-blue-700',
  ipca: 'bg-amber-100 text-amber-700',
  prefixado: 'bg-purple-100 text-purple-700',
}

function formatRate(offer: { indexer: string; rate: number }) {
  if (offer.indexer === 'selic') return `Selic + ${offer.rate.toFixed(4)}%`
  if (offer.indexer === 'ipca') return `IPCA + ${offer.rate.toFixed(2)}%`
  return `${offer.rate.toFixed(2)}% a.a.`
}

export default async function TesouroRankingPage() {
  const supabase = await createClient()
  const { data: offers } = await supabase
    .from('tesouro_offers')
    .select('*')
    .eq('is_available', true)
    .order('indexer')
    .order('maturity_date')

  const rows = offers ?? []

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Tesouro Direto
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Títulos públicos federais disponíveis. Considerados os ativos de menor risco do mercado brasileiro.
        </p>
      </div>

      <div className="grid gap-3">
        {rows.map(offer => (
          <Card key={offer.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm">{offer.title_type}</h3>
                  <Badge className={INDEXER_COLOR[offer.indexer]}>{INDEXER_LABEL[offer.indexer]}</Badge>
                  <Badge variant="secondary">{LIQUIDITY_LABEL[offer.liquidity]}</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Rentabilidade</span>
                    <p className="font-semibold text-primary">{formatRate(offer)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Vencimento</span>
                    <p className="font-medium">{format(new Date(offer.maturity_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Preço unitário</span>
                    <p className="font-medium font-mono">R$ {offer.price?.toFixed(2) ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Investimento mínimo</span>
                    <p className="font-medium font-mono">R$ {offer.min_investment.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Disclaimer variant="banner" text="Taxas indicativas sujeitas a variação conforme o mercado. Consulte o site do Tesouro Direto para taxas atualizadas no momento da compra. Rentabilidade passada não garante resultados futuros." />
    </div>
  )
}
