'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Disclaimer } from '@/components/common/disclaimer'
import { LineChart as LineChartIcon, TrendingUp, BarChart3, DollarSign, Percent, Search, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  AreaChart, Area, ComposedChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, ReferenceArea,
} from 'recharts'

// ─── Patrimônio calculator ─────────────────────────────────────────

function calcPassiveIncome(patrimony: number, rate: number) {
  return (patrimony * rate) / 100 / 12
}

function buildGrowthProjection(initial: number, monthly: number, rate: number, years: number) {
  const safeInitial = isNaN(initial) || initial < 0 ? 0 : initial
  const safeMonthly = isNaN(monthly) || monthly < 0 ? 0 : monthly
  const safeRate = isNaN(rate) || rate <= 0 ? 0.01 : rate
  const safeYears = isNaN(years) || years < 1 ? 1 : Math.min(years, 50)

  const points = []
  let balance = safeInitial
  const monthlyRate = safeRate / 12 / 100

  for (let y = 0; y <= safeYears; y++) {
    points.push({ year: y, value: Math.round(balance) })
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + safeMonthly
    }
  }
  return points
}

function fmtBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)
}

function PatrimonioTab() {
  const [patrimony, setPatrimony] = useState(500000)
  const [monthly, setMonthly] = useState(2000)
  const [rate, setRate] = useState(13.65)
  const [years, setYears] = useState(15)
  const [duration, setDuration] = useState(5)
  const [deltaRate, setDeltaRate] = useState(1)

  const passiveIncome = calcPassiveIncome(patrimony, rate)
  const growthData = buildGrowthProjection(patrimony, monthly, rate, years)
  const finalValue = growthData[growthData.length - 1]?.value ?? 0
  const totalInvested = patrimony + monthly * years * 12
  const sensitivity = -(duration * (deltaRate / (1 + rate / 100))) * 100

  return (
    <div className="space-y-6">
      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Premissas da análise</CardTitle>
          <CardDescription className="text-xs">Altere os valores abaixo — o gráfico atualiza em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Patrimônio atual (R$)</Label>
              <Input type="number" value={patrimony} onChange={e => setPatrimony(+e.target.value || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Aporte mensal (R$)</Label>
              <Input type="number" value={monthly} onChange={e => setMonthly(+e.target.value || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Taxa estimada (% a.a.)</Label>
              <Input type="number" step="0.1" value={rate} onChange={e => setRate(+e.target.value || 0.01)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horizonte (anos)</Label>
              <Input type="number" min={1} max={50} value={years} onChange={e => setYears(+e.target.value || 1)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: 'Patrimônio estimado', value: fmtBRL(finalValue), sub: `em ${years} anos`, color: 'text-primary' },
          { icon: DollarSign, label: 'Renda passiva est.', value: fmtBRL(passiveIncome), sub: 'por mês (estimativa)', color: 'text-emerald-600' },
          { icon: BarChart3, label: 'Rendimento estimado', value: fmtBRL(Math.max(0, finalValue - totalInvested)), sub: `vs. ${fmtBRL(totalInvested)} investido`, color: 'text-amber-600' },
          { icon: Percent, label: 'Retorno total est.', value: totalInvested > 0 ? `${(((finalValue / totalInvested) - 1) * 100).toFixed(0)}%` : '—', sub: `no período de ${years} anos`, color: 'text-blue-600' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Projeção de crescimento patrimonial</CardTitle>
              <CardDescription className="text-xs">
                {rate}% a.a. com aportes de {fmtBRL(monthly)}/mês — atualiza em tempo real conforme os parâmetros acima
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs text-primary border-primary/30">ao vivo</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthData} key={`${patrimony}-${monthly}-${rate}-${years}`}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} tickFormatter={v => `${v}a`} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v}
              />
              <Tooltip
                formatter={(val) => [fmtBRL(Number(val)), 'Patrimônio est.']}
                labelFormatter={l => `Ano ${l}`}
              />
              <ReferenceLine
                y={totalInvested}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                label={{ value: 'Total investido', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#colorVal)"
                name="Patrimônio"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sensitivity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sensibilidade à variação de juros</CardTitle>
          <CardDescription className="text-xs">
            Impacto estimado de uma variação de {deltaRate}p.p. sobre título com duration de {duration} anos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Duration (anos)</Label>
              <Input type="number" step="0.5" value={duration} onChange={e => setDuration(+e.target.value || 1)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Variação de taxa (p.p.)</Label>
              <Input type="number" step="0.25" value={deltaRate} onChange={e => setDeltaRate(+e.target.value || 0.25)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600 font-medium">Alta de {deltaRate}p.p. na taxa</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{sensitivity.toFixed(2)}%</p>
              <p className="text-xs text-red-600">variação estimada no preço</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Queda de {deltaRate}p.p. na taxa</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">+{Math.abs(sensitivity).toFixed(2)}%</p>
              <p className="text-xs text-emerald-600">valorização estimada no preço</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Ticker estimation ─────────────────────────────────────────────

const TICKER_SUGGESTIONS = [
  { group: 'Ações', tickers: ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'WEGE3', 'B3SA3', 'PRIO3', 'RENT3'] },
  { group: 'FIIs', tickers: ['MXRF11', 'HGLG11', 'KNRI11', 'XPML11', 'BTLG11', 'ALZR11'] },
  { group: 'FI-Infra', tickers: ['KDIF11', 'CPFF11', 'VGHF11', 'RZAK11'] },
]

interface TickerEstimate {
  ticker: string
  name: string
  asset_class: string
  currentPrice: number | null
  todayLabel: string
  todayPrice: number | null
  historicalMonths: { month: string; price: number }[]
  futureMonths: { month: string; pessimista: number; base: number; otimista: number }[]
  reasoning: string
  keyFactors: string[]
  risks: string[]
  expectedReturnBase: string
  qualityScore: number
}

function TickerTab() {
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TickerEstimate | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyze(t?: string) {
    const target = (t ?? ticker).trim().toUpperCase()
    if (!target) return
    setTicker(target)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/estimates/ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: target }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Falha na conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Build unified 25-point dataset: 12 past + today + 12 future
  // Each point can have: actual (past), pessimista/base/otimista (future)
  // Today's point has all four so lines connect visually
  const chartData = result
    ? [
        // Past 12 months — only "actual" field populated
        ...(result.historicalMonths ?? []).map(m => ({ month: m.month, actual: m.price })),
        // Today bridge — all lines meet at current price
        {
          month: result.todayLabel ?? 'Hoje',
          actual: result.todayPrice ?? result.currentPrice,
          pessimista: result.todayPrice ?? result.currentPrice,
          base: result.todayPrice ?? result.currentPrice,
          otimista: result.todayPrice ?? result.currentPrice,
        },
        // Future 12 months — pessimista/base/otimista only
        ...(result.futureMonths ?? []).map(m => ({
          month: m.month,
          pessimista: m.pessimista,
          base: m.base,
          otimista: m.otimista,
        })),
      ]
    : []

  const todayIndex = result
    ? (result.historicalMonths?.length ?? 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análise de ticker por IA</CardTitle>
          <CardDescription className="text-xs">
            Selecione um ativo — a IA estima os últimos 12 meses históricos e projeta os próximos 12 meses (3 cenários)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: PETR4, MXRF11, KDIF11…"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              className="max-w-xs"
            />
            <Button onClick={() => analyze()} disabled={loading || !ticker.trim()} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Analisando…' : 'Analisar'}
            </Button>
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            {TICKER_SUGGESTIONS.map(group => (
              <div key={group.group} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-14 shrink-0">{group.group}</span>
                {group.tickers.map(t => (
                  <button
                    key={t}
                    onClick={() => analyze(t)}
                    disabled={loading}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors font-mono font-medium border border-border disabled:opacity-50"
                  >
                    {t}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold">{result.ticker}</h2>
              <p className="text-muted-foreground text-sm">{result.name}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {result.currentPrice && (
                <Badge variant="outline" className="font-mono">
                  {fmtBRL(result.currentPrice)} atual
                </Badge>
              )}
              <Badge variant="outline" className="text-emerald-700 border-emerald-300">{result.expectedReturnBase}</Badge>
              <Badge variant="outline" className="text-primary border-primary/30">
                Score: {result.qualityScore}/100
              </Badge>
            </div>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-sm">Histórico + Projeção de preço — 24 meses</CardTitle>
                  <CardDescription className="text-xs">
                    12 meses históricos (estimados) · Hoje · 12 meses projetados (3 cenários)
                  </CardDescription>
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 bg-gray-500 rounded" /> Histórico
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-3 bg-red-400 rounded" /><span className="inline-block h-0.5 w-2 bg-blue-500 rounded" /><span className="inline-block h-0.5 w-3 bg-emerald-500 rounded" /> Cenários
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="futureShade" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f0f9ff" stopOpacity={0} />
                      <stop offset="100%" stopColor="#f0f9ff" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    interval={1}
                    angle={-35}
                    textAnchor="end"
                    height={44}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => `R$${Number(v).toFixed(0)}`}
                    domain={['auto', 'auto']}
                    width={56}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const todayLbl = result?.todayLabel ?? 'Hoje'
                      const isToday = label === todayLbl
                      const isPast = chartData.findIndex(d => d.month === label) <= todayIndex
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
                          <p className="font-semibold mb-1.5">{label}{isToday ? ' · Hoje' : isPast ? ' · Histórico' : ' · Projeção'}</p>
                          {payload.map((p: any) => (
                            <div key={p.dataKey} className="flex justify-between gap-3">
                              <span style={{ color: p.color }}>{
                                p.dataKey === 'actual' ? 'Preço real' :
                                p.dataKey === 'base' ? 'Base' :
                                p.dataKey === 'pessimista' ? 'Pessimista' : 'Otimista'
                              }</span>
                              <span className="font-mono font-medium">R$ {Number(p.value).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />

                  <Legend
                    formatter={(value) => (
                      <span className="text-xs">
                        {value === 'actual' ? 'Histórico (est.)' :
                         value === 'base' ? 'Cenário Base' :
                         value === 'pessimista' ? 'Pessimista' : 'Otimista'}
                      </span>
                    )}
                  />

                  {/* Shade future region */}
                  {result?.todayLabel && (
                    <ReferenceArea
                      x1={result.todayLabel}
                      fill="#eff6ff"
                      fillOpacity={0.4}
                    />
                  )}

                  {/* Today vertical line */}
                  {result?.todayLabel && (
                    <ReferenceLine
                      x={result.todayLabel}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      label={{
                        value: 'Hoje',
                        position: 'insideTopRight',
                        fontSize: 10,
                        fill: 'hsl(var(--muted-foreground))',
                        dy: -4,
                      }}
                    />
                  )}

                  {/* Historical actual price — solid dark line */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#374151"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    name="actual"
                    activeDot={{ r: 4 }}
                  />

                  {/* Future scenarios — start at today, diverge forward */}
                  <Line
                    type="monotone"
                    dataKey="pessimista"
                    stroke="#ef4444"
                    strokeWidth={1.75}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                    name="pessimista"
                    activeDot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="base"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    name="base"
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="otimista"
                    stroke="#10b981"
                    strokeWidth={1.75}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                    name="otimista"
                    activeDot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Price summary bar below chart */}
              {result.futureMonths && result.futureMonths.length > 0 && result.todayPrice && (
                <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
                  {([
                    { key: 'pessimista', label: 'Pessimista', color: 'text-red-600 bg-red-50 border-red-200' },
                    { key: 'base', label: 'Base', color: 'text-blue-600 bg-blue-50 border-blue-200' },
                    { key: 'otimista', label: 'Otimista', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                  ] as const).map(({ key, label, color }) => {
                    const last = result.futureMonths[result.futureMonths.length - 1]
                    const finalPrice = last[key]
                    const pct = ((finalPrice - result.todayPrice!) / result.todayPrice! * 100)
                    return (
                      <div key={key} className={`rounded-lg border p-3 text-center ${color}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
                        <p className="font-bold text-base mt-0.5">R$ {finalPrice.toFixed(2)}</p>
                        <p className="text-xs mt-0.5 font-medium">
                          {pct >= 0 ? '+' : ''}{pct.toFixed(1)}% em 12 meses
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factors & Risks */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Fatores positivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.keyFactors.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-emerald-500 shrink-0 font-bold">+</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Riscos a monitorar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-500 shrink-0 font-bold">!</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Reasoning */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Análise fundamentalista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                {result.reasoning.split('\n').filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Disclaimer variant="compact" text="Projeções de ticker são estimativas educativas geradas por IA com base em fundamentos públicos. Não constituem recomendação de compra ou venda. Rentabilidade passada não garante resultados futuros." />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────

export default function EstimativasPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LineChartIcon className="h-6 w-6 text-primary" />
          Estimativas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Projeções patrimoniais e análise de ativos por IA. Fins exclusivamente educativos.
        </p>
      </div>

      <Tabs defaultValue="patrimonio">
        <TabsList>
          <TabsTrigger value="patrimonio">Patrimônio</TabsTrigger>
          <TabsTrigger value="ticker">Projeção de Ticker</TabsTrigger>
        </TabsList>
        <TabsContent value="patrimonio" className="mt-6">
          <PatrimonioTab />
        </TabsContent>
        <TabsContent value="ticker" className="mt-6">
          <TickerTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
