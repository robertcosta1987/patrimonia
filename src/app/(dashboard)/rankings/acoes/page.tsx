import { createClient } from '@/lib/supabase/server'
import { Disclaimer } from '@/components/common/disclaimer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreBadge } from '@/components/common/score-badge'
import { TrendingUp, TrendingDown } from 'lucide-react'

function fmt(val: number | null | undefined, decimals = 2, suffix = '') {
  if (val == null) return '—'
  return `${val.toFixed(decimals)}${suffix}`
}

function fmtCurrency(val: number | null | undefined) {
  if (val == null) return '—'
  if (val >= 1e12) return `R$ ${(val / 1e12).toFixed(1)}T`
  if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)}M`
  return `R$ ${val.toFixed(2)}`
}

export default async function AcoesRankingPage() {
  const supabase = await createClient()

  const { data: metrics } = await supabase
    .from('asset_metrics')
    .select(`
      *,
      assets!inner(id, ticker, name, sector, segment),
      asset_prices(price, change_pct, source_timestamp)
    `)
    .eq('assets.asset_class', 'acao')
    .order('score', { ascending: false })

  const rows = (metrics ?? []).map(m => ({
    ...m,
    ticker: (m as any).assets?.ticker ?? '',
    name: (m as any).assets?.name ?? '',
    sector: (m as any).assets?.sector ?? '',
    price: (m as any).asset_prices?.[0]?.price ?? null,
    change_pct: (m as any).asset_prices?.[0]?.change_pct ?? null,
  }))

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Ranking de Ações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Score educativo baseado em valuation, dividendos, qualidade, crescimento e risco.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ativo</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Preço</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Variação</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">P/L</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">P/VP</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">DY</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">ROE</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Volatilidade</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Market Cap</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.asset_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-medium">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-bold">{row.ticker}</p>
                      <p className="text-xs text-muted-foreground">{row.name}</p>
                      {row.sector && <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5">{row.sector}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{row.price ? `R$ ${row.price.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {row.change_pct != null ? (
                      <span className={`flex items-center justify-end gap-0.5 font-mono ${row.change_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.change_pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {row.change_pct >= 0 ? '+' : ''}{row.change_pct.toFixed(2)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(row.pl)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(row.pvp)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {row.dividend_yield ? <span className="text-emerald-600 font-medium">{fmt(row.dividend_yield)}%</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(row.roe)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(row.volatility)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">{fmtCurrency(row.market_cap)}</td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={row.score ?? 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Disclaimer variant="compact" />
    </div>
  )
}
