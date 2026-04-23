'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScoreBadge } from '@/components/common/score-badge'
import { Disclaimer } from '@/components/common/disclaimer'
import { createClient } from '@/lib/supabase/client'
import { SlidersHorizontal, Sparkles, Loader2, TrendingUp, TrendingDown, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Asset {
  id: string
  ticker: string
  name: string
  asset_class: string
  sector: string | null
  segment: string | null
  pl: number | null
  pvp: number | null
  dividend_yield: number | null
  roe: number | null
  volatility: number | null
  avg_volume: number | null
  market_cap: number | null
  score: number
  price: number | null
  change_pct: number | null
}

interface Filters {
  asset_class: string
  minScore: number
  minDY: number
  maxPL: number
  maxPVP: number
  minROE: number
  maxVolatility: number
}

interface AIAnalysis {
  summary: string
  topPicks: { ticker: string; reason: string; strengths: string[]; risks: string[]; expectedReturn: string }[]
  insights: string[]
  sectorAnalysis: string
  portfolioSuggestion: string
}

const CLASS_LABELS: Record<string, string> = {
  all: 'Todos', acao: 'Ações', fii: 'FIIs', fi_infra: 'FI-Infra',
}

const DEFAULT_FILTERS: Filters = {
  asset_class: 'all',
  minScore: 0,
  minDY: 0,
  maxPL: 999,
  maxPVP: 999,
  minROE: -999,
  maxVolatility: 999,
}

function fmt(val: number | null | undefined, decimals = 2) {
  if (val == null) return '—'
  return val.toFixed(decimals)
}

function fmtCap(val: number | null | undefined) {
  if (val == null) return '—'
  if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)}M`
  return `R$ ${val.toFixed(0)}`
}

export default function ScreenerPage() {
  const [allAssets, setAllAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysis | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: assets } = await supabase
        .from('assets')
        .select(`
          id, ticker, name, asset_class, sector, segment,
          asset_metrics(pl, pvp, dividend_yield, roe, volatility, avg_volume, market_cap, score),
          asset_prices(price, change_pct, ingested_at)
        `)
        .eq('is_active', true)

      const rows: Asset[] = (assets ?? []).map(a => {
        const m = (a.asset_metrics as any)?.[0] ?? (a.asset_metrics as any) ?? {}
        const prices: any[] = Array.isArray(a.asset_prices) ? a.asset_prices : []
        const latest = prices.sort((x: any, y: any) => (y.ingested_at ?? '').localeCompare(x.ingested_at ?? ''))[0]
        return {
          id: a.id, ticker: a.ticker, name: a.name,
          asset_class: a.asset_class, sector: a.sector, segment: a.segment,
          pl: m.pl ?? null, pvp: m.pvp ?? null, dividend_yield: m.dividend_yield ?? null,
          roe: m.roe ?? null, volatility: m.volatility ?? null,
          avg_volume: m.avg_volume ?? null, market_cap: m.market_cap ?? null,
          score: m.score ?? 0, price: latest?.price ?? null, change_pct: latest?.change_pct ?? null,
        }
      })
      setAllAssets(rows)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return allAssets.filter(a => {
      if (filters.asset_class !== 'all' && a.asset_class !== filters.asset_class) return false
      if (a.score < filters.minScore) return false
      if (filters.minDY > 0 && (a.dividend_yield == null || a.dividend_yield < filters.minDY)) return false
      if (filters.maxPL < 999 && (a.pl == null || a.pl > filters.maxPL)) return false
      if (filters.maxPVP < 999 && (a.pvp == null || a.pvp > filters.maxPVP)) return false
      if (filters.minROE > -999 && (a.roe == null || a.roe < filters.minROE)) return false
      if (filters.maxVolatility < 999 && (a.volatility == null || a.volatility > filters.maxVolatility)) return false
      return true
    })
  }, [allAssets, filters])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? null
      const bv = (b as any)[sortKey] ?? null
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortTh({ colKey, label, align = 'right' }: { colKey: string; label: string; align?: string }) {
    const isActive = sortKey === colKey
    return (
      <th
        onClick={() => toggleSort(colKey)}
        className={`px-3 py-3 text-${align} font-semibold cursor-pointer select-none whitespace-nowrap group ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >
        {label}
        {isActive ? (sortDir === 'asc' ? ' ↑' : ' ↓') : <span className="opacity-0 group-hover:opacity-40"> ↕</span>}
      </th>
    )
  }

  function set(key: keyof Filters, val: string | number) {
    setFilters(f => ({ ...f, [key]: val }))
    setAiResult(null)
  }

  async function analyzeWithAI() {
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    try {
      const res = await fetch('/api/screener/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: sorted.slice(0, 30), filters }),
      })
      const data = await res.json()
      if (data.error) setAiError(data.error)
      else setAiResult(data)
    } catch {
      setAiError('Falha na conexão. Tente novamente.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            Screener B3
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Filtre ações, FIIs e FI-Infra por fundamentos. Use a IA para analisar os resultados.
          </p>
        </div>
        <Badge variant="outline" className="text-primary border-primary/30">
          {loading ? '…' : `${filtered.length} de ${allAssets.length} ativos`}
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* Class */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs">Classe</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(CLASS_LABELS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => set('asset_class', k)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filters.asset_class === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Score mínimo</Label>
              <Input type="number" min={0} max={100} value={filters.minScore} onChange={e => set('minScore', +e.target.value || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">DY mínimo (%)</Label>
              <Input type="number" min={0} step={0.5} value={filters.minDY} onChange={e => set('minDY', +e.target.value || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">P/L máximo</Label>
              <Input type="number" min={0} value={filters.maxPL === 999 ? '' : filters.maxPL} placeholder="Ilimitado" onChange={e => set('maxPL', +e.target.value || 999)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">P/VP máximo</Label>
              <Input type="number" min={0} step={0.1} value={filters.maxPVP === 999 ? '' : filters.maxPVP} placeholder="Ilimitado" onChange={e => set('maxPVP', +e.target.value || 999)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ROE mínimo (%)</Label>
              <Input type="number" step={1} value={filters.minROE === -999 ? '' : filters.minROE} placeholder="Qualquer" onChange={e => set('minROE', +e.target.value || -999)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Volatilidade máx (%)</Label>
              <Input type="number" min={0} value={filters.maxVolatility === 999 ? '' : filters.maxVolatility} placeholder="Ilimitado" onChange={e => set('maxVolatility', +e.target.value || 999)} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <button
              onClick={() => { setFilters(DEFAULT_FILTERS); setAiResult(null) }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Limpar filtros
            </button>
            <Button
              onClick={analyzeWithAI}
              disabled={aiLoading || filtered.length === 0}
              className="gap-2"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiLoading ? 'Analisando…' : `Analisar ${filtered.length} ativos com IA`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {aiError && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{aiError}</p>
        </div>
      )}

      {aiResult && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise da IA — {filtered.length} ativos filtrados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{aiResult.summary}</p>

              {aiResult.topPicks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Top Picks</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {aiResult.topPicks.map((pick, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-mono">{pick.ticker}</span>
                          {pick.expectedReturn && (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">{pick.expectedReturn}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{pick.reason}</p>
                        {pick.strengths?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {pick.strengths.map((s, j) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">+ {s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.insights?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Insights</p>
                  <ul className="space-y-1">
                    {aiResult.insights.map((ins, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        {ins}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.portfolioSuggestion && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                  <p className="text-xs font-semibold text-primary mb-1">Sugestão de composição</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiResult.portfolioSuggestion}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando ativos…
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{sorted.length} ativo{sorted.length !== 1 ? 's' : ''} encontrado{sorted.length !== 1 ? 's' : ''}</CardTitle>
            <CardDescription className="text-xs">Clique em qualquer coluna para ordenar</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-8">#</th>
                  <SortTh colKey="ticker" label="Ativo" align="left" />
                  <SortTh colKey="asset_class" label="Classe" align="left" />
                  <SortTh colKey="price" label="Preço" />
                  <SortTh colKey="change_pct" label="Var." />
                  <SortTh colKey="pl" label="P/L" />
                  <SortTh colKey="pvp" label="P/VP" />
                  <SortTh colKey="dividend_yield" label="DY %" />
                  <SortTh colKey="roe" label="ROE %" />
                  <SortTh colKey="volatility" label="Vol." />
                  <SortTh colKey="market_cap" label="Cap." />
                  <SortTh colKey="score" label="Score" align="center" />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum ativo passou pelos filtros. Ajuste os critérios.
                    </td>
                  </tr>
                )}
                {sorted.map((row, idx) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-bold">{row.ticker}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{row.name}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-xs">{CLASS_LABELS[row.asset_class] ?? row.asset_class}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">
                      {row.price ? `R$${row.price.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.change_pct != null ? (
                        <span className={`flex items-center justify-end gap-0.5 text-xs font-mono ${row.change_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {row.change_pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {row.change_pct >= 0 ? '+' : ''}{row.change_pct.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground text-xs">{fmt(row.pl)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {row.pvp != null ? <span className={row.pvp < 1 ? 'text-emerald-600' : 'text-amber-600'}>{fmt(row.pvp)}</span> : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {row.dividend_yield ? <span className="text-emerald-600 font-semibold">{fmt(row.dividend_yield)}%</span> : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground text-xs">{fmt(row.roe)}%</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground text-xs">{fmt(row.volatility)}%</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground text-xs">{fmtCap(row.market_cap)}</td>
                    <td className="px-3 py-2.5 text-center"><ScoreBadge score={row.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Disclaimer variant="compact" text="Os dados do screener são baseados em informações públicas e têm fins exclusivamente educativos. A análise da IA não constitui recomendação de investimento." />
    </div>
  )
}
