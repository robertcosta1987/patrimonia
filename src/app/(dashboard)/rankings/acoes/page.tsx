import { createClient } from '@/lib/supabase/server'
import { Disclaimer } from '@/components/common/disclaimer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreBadge } from '@/components/common/score-badge'
import { SortableHeader } from '@/components/common/sortable-header'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Suspense } from 'react'

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

function sortRows(rows: any[], key: string, dir: string) {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? null
    const bv = b[key] ?? null
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })
}

async function AcoesTable({ sortKey, dir }: { sortKey: string; dir: string }) {
  const supabase = await createClient()

  const { data: assets } = await supabase
    .from('assets')
    .select(`
      id, ticker, name, sector,
      asset_metrics(pl, pvp, dividend_yield, roe, debt_equity, revenue_growth, volatility, avg_volume, market_cap, score),
      asset_prices(price, change_pct, ingested_at)
    `)
    .eq('asset_class', 'acao')
    .eq('is_active', true)

  const rawRows = (assets ?? []).map(a => {
    const m = (a.asset_metrics as any)?.[0] ?? (a.asset_metrics as any) ?? {}
    const prices: any[] = Array.isArray(a.asset_prices) ? a.asset_prices : []
    const latest = prices.sort((x, y) => (y.ingested_at ?? '').localeCompare(x.ingested_at ?? ''))[0]
    return {
      id: a.id, ticker: a.ticker, name: a.name, sector: a.sector,
      pl: m.pl ?? null, pvp: m.pvp ?? null, dividend_yield: m.dividend_yield ?? null,
      roe: m.roe ?? null, debt_equity: m.debt_equity ?? null, revenue_growth: m.revenue_growth ?? null,
      volatility: m.volatility ?? null, avg_volume: m.avg_volume ?? null,
      market_cap: m.market_cap ?? null, score: m.score ?? 0,
      price: latest?.price ?? null, change_pct: latest?.change_pct ?? null,
    }
  })

  const rows = sortRows(rawRows, sortKey, dir)

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-8">#</th>
              <SortableHeader colKey="ticker" label="Ativo" currentSort={sortKey} currentDir={dir} align="left" />
              <SortableHeader colKey="price" label="Preço" currentSort={sortKey} currentDir={dir} />
              <SortableHeader colKey="change_pct" label="Variação" currentSort={sortKey} currentDir={dir} />
              <SortableHeader colKey="pl" label="P/L" currentSort={sortKey} currentDir={dir} />
              <SortableHeader colKey="pvp" label="P/VP" currentSort={sortKey} currentDir={dir} />
              <SortableHeader colKey="dividend_yield" label="DY %" currentSort={sortKey} currentDir={dir} />
              <SortableHeader colKey="roe" label="ROE %" currentSort={sortKey} currentDir={dir} />
              <SortableHeader colKey="volatility" label="Volatilidade" currentSort={sortKey} currentDir={dir} />
              <SortableHeader colKey="market_cap" label="Market Cap" currentSort={sortKey} currentDir={dir} />
              <SortableHeader colKey="score" label="Score" currentSort={sortKey} currentDir={dir} align="center" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum dado disponível. Execute a sincronização para carregar os dados.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
                  {row.dividend_yield ? <span className="text-emerald-600 font-semibold">{fmt(row.dividend_yield)}%</span> : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(row.roe)}%</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(row.volatility)}%</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">{fmtCurrency(row.market_cap)}</td>
                <td className="px-4 py-3 text-center"><ScoreBadge score={row.score} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default async function AcoesRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>
}) {
  const { sort: sortKey = 'score', dir = 'desc' } = await searchParams

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Ranking de Ações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Clique em qualquer coluna para ordenar. Score educativo baseado em valuation, dividendos, qualidade e risco.
        </p>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground">Carregando…</div>}>
        <AcoesTable sortKey={sortKey} dir={dir} />
      </Suspense>

      <Disclaimer variant="compact" />
    </div>
  )
}
