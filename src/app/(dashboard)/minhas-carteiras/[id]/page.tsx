'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Disclaimer } from '@/components/common/disclaimer'
import {
  FolderOpen, TrendingUp, RefreshCw, AlertTriangle, CheckCircle2,
  BarChart3, Wallet, ChevronLeft
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PortfolioTicker {
  ticker: string
  name: string
  asset_class: string
  percentage: number
  reasoning: string
  expectedReturn?: string | null
}

interface AllocationItem {
  name: string
  value: number
  color: string
}

interface Portfolio {
  id: string
  name: string
  profile: string
  reasoning: string
  expected_return: string
  risk_level: string
  allocation: AllocationItem[]
  tickers: PortfolioTicker[]
  projections: any | null
  created_at: string
}

const CLASS_LABELS: Record<string, string> = {
  acao: 'Ação', fii: 'FII', fi_infra: 'FI-Infra',
  TESOURO_SELIC: 'Tesouro Selic', TESOURO_IPCA: 'Tesouro IPCA+',
  TESOURO_PRE: 'Tesouro Prefixado', CDB_CDI: 'CDB',
}

const RISK_COLORS: Record<string, string> = {
  Baixo: 'text-blue-700 border-blue-300 bg-blue-50',
  Moderado: 'text-amber-700 border-amber-300 bg-amber-50',
  Alto: 'text-rose-700 border-rose-300 bg-rose-50',
}

const SCENARIO_COLORS = { pessimista: '#ef4444', base: '#3b82f6', otimista: '#22c55e' }

type Tab = 'visao' | 'projecoes' | 'simulacao'

export default function CarteiraDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loadingPortfolio, setLoadingPortfolio] = useState(true)
  const [projecting, setProjecting] = useState(false)
  const [projError, setProjError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('visao')
  const [capital, setCapital] = useState('')
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('generated_portfolios')
        .select('*')
        .eq('id', id)
        .single()
      setPortfolio(data as Portfolio)
      setLoadingPortfolio(false)
      if (data?.tickers?.length) setSelectedTicker(data.tickers[0].ticker)
    }
    load()
  }, [id])

  async function generateProjections(force = false) {
    setProjecting(true)
    setProjError(null)
    try {
      const res = await fetch('/api/portfolio/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId: id, force }),
      })
      const data = await res.json()
      if (data.error) setProjError(data.error)
      else setPortfolio(prev => prev ? { ...prev, projections: data.projections } : prev)
    } catch {
      setProjError('Falha na conexão. Tente novamente.')
    } finally {
      setProjecting(false)
    }
  }

  if (loadingPortfolio) {
    return <div className="text-center py-20 text-muted-foreground text-sm">Carregando carteira…</div>
  }

  if (!portfolio) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground">Carteira não encontrada.</p>
        <Link href="/minhas-carteiras">
          <Button variant="outline" className="mt-4 gap-2"><ChevronLeft className="h-4 w-4" /> Voltar</Button>
        </Link>
      </div>
    )
  }

  const proj = portfolio.projections

  // Build portfolio composite chart data from month returns
  const portfolioChartData = proj?.portfolioMonths?.map((m: any, i: number) => {
    let cumPess = 100, cumBase = 100, cumOtim = 100
    for (let j = 0; j <= i; j++) {
      const mo = proj.portfolioMonths[j]
      cumPess *= (1 + mo.pessimista / 100)
      cumBase *= (1 + mo.base / 100)
      cumOtim *= (1 + mo.otimista / 100)
    }
    return {
      month: m.month,
      pessimista: +cumPess.toFixed(2),
      base: +cumBase.toFixed(2),
      otimista: +cumOtim.toFixed(2),
    }
  }) ?? []

  // Capital simulation
  const capitalNum = parseFloat(capital.replace(',', '.'))
  const validCapital = !isNaN(capitalNum) && capitalNum > 0

  function tickerProjectedValue(ticker: PortfolioTicker, scenario: 'pessimista' | 'base' | 'otimista') {
    const invested = validCapital ? capitalNum * (ticker.percentage / 100) : 0
    const tickerProj = proj?.tickers?.find((t: any) => t.ticker === ticker.ticker)
    if (!tickerProj || !invested) return null
    const lastMonth = tickerProj.months?.[tickerProj.months.length - 1]
    const currentPrice = tickerProj.currentPrice ?? 1
    const futurePrice = lastMonth?.[scenario] ?? currentPrice
    const ratio = futurePrice / currentPrice
    return +(invested * ratio).toFixed(2)
  }

  function totalFutureValue(scenario: 'pessimista' | 'base' | 'otimista') {
    if (!validCapital || !proj || !portfolio) return null
    return portfolio.tickers.reduce((sum, t) => {
      const v = tickerProjectedValue(t, scenario)
      return sum + (v ?? capitalNum * (t.percentage / 100))
    }, 0)
  }

  const selectedTickerData = proj?.tickers?.find((t: any) => t.ticker === selectedTicker)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/minhas-carteiras">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" /> Minhas Carteiras
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-primary" />
          {portfolio.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <Badge variant="outline" className="capitalize">{portfolio.profile}</Badge>
          <Badge variant="outline" className="text-emerald-700 border-emerald-300">
            <TrendingUp className="h-3 w-3 mr-1" />{portfolio.expected_return}
          </Badge>
          <Badge variant="outline" className={RISK_COLORS[portfolio.risk_level] ?? ''}>
            Risco {portfolio.risk_level}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(portfolio.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: 'visao', label: 'Visão Geral', icon: FolderOpen },
          { key: 'projecoes', label: 'Projeções 12 Meses', icon: BarChart3 },
          { key: 'simulacao', label: 'Simulação de Capital', icon: Wallet },
        ] as { key: Tab; label: string; icon: any }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Visão Geral */}
      {tab === 'visao' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Alocação por classe de ativo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={portfolio.allocation.filter(a => a.value > 0)}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                      paddingAngle={2} dataKey="value"
                    >
                      {portfolio.allocation.filter(a => a.value > 0).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val}%`, 'Alocação']} />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Racional da carteira</CardTitle>
                <CardDescription className="text-xs">Gerado pela IA com base no seu perfil</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                  {portfolio.reasoning.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Ativos selecionados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {portfolio.tickers.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="text-center min-w-[68px]">
                      <p className="text-sm font-bold font-mono">{t.ticker}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 mt-0.5">{t.percentage}%</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold">{t.name}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {CLASS_LABELS[t.asset_class] ?? t.asset_class}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.reasoning}</p>
                    </div>
                    {t.expectedReturn && (
                      <span className="text-xs text-emerald-600 font-semibold whitespace-nowrap shrink-0">{t.expectedReturn}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Distribuição por classe</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {portfolio.allocation.filter(a => a.value > 0).map((a, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{a.name}</span>
                    <span className="font-bold" style={{ color: a.color }}>{a.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${a.value}%`, backgroundColor: a.color }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Projeções */}
      {tab === 'projecoes' && (
        <div className="space-y-4">
          {!proj && (
            <Card>
              <CardContent className="py-10 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">Projeções ainda não geradas</p>
                <p className="text-xs text-muted-foreground mb-4">
                  A IA irá projetar cada ativo da carteira mês a mês pelos próximos 12 meses.
                </p>
                <Button onClick={() => generateProjections()} disabled={projecting} className="gap-2">
                  {projecting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Projetando…</> : <><BarChart3 className="h-4 w-4" /> Gerar Projeções com IA</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {projError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {projError}
            </div>
          )}

          {proj && (
            <>
              {/* Portfolio composite chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Evolução da carteira — 12 meses (base 100)</CardTitle>
                  <CardDescription className="text-xs">{proj.portfolioReasoning}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={portfolioChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <defs>
                        {(['pessimista', 'base', 'otimista'] as const).map(s => (
                          <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SCENARIO_COLORS[s]} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={SCENARIO_COLORS[s]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={v => `${v}`} />
                      <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}`, '']} />
                      <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                      <Area type="monotone" dataKey="pessimista" stroke={SCENARIO_COLORS.pessimista} fill={`url(#grad-pessimista)`} strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="base" stroke={SCENARIO_COLORS.base} fill={`url(#grad-base)`} strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="otimista" stroke={SCENARIO_COLORS.otimista} fill={`url(#grad-otimista)`} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Assumptions */}
              {proj.assumptions && (
                <Card>
                  <CardHeader><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Premissas da projeção</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {proj.assumptions.map((a: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-primary mt-0.5">•</span>{a}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Ticker selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Projeção por ticker</CardTitle>
                  <CardDescription className="text-xs">Preço projetado mês a mês por cenário</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {portfolio.tickers.map(t => (
                      <button
                        key={t.ticker}
                        onClick={() => setSelectedTicker(t.ticker)}
                        className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
                          selectedTicker === t.ticker
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted hover:bg-muted/80 border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t.ticker} <span className="opacity-70">{t.percentage}%</span>
                      </button>
                    ))}
                  </div>

                  {selectedTickerData ? (
                    <>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={selectedTickerData.months} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={v => `R$${v}`} />
                          <Tooltip formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, '']} />
                          <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                          <Line type="monotone" dataKey="pessimista" stroke={SCENARIO_COLORS.pessimista} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="base" stroke={SCENARIO_COLORS.base} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="otimista" stroke={SCENARIO_COLORS.otimista} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                        <strong>{selectedTickerData.ticker}:</strong> {selectedTickerData.reasoning}
                      </div>
                      <div className="flex gap-4 mt-2">
                        {(['pessimista', 'base', 'otimista'] as const).map(s => (
                          <span key={s} className="text-xs" style={{ color: SCENARIO_COLORS[s] }}>
                            {s}: <strong>{selectedTickerData.yearReturn?.[s]}</strong>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Dados de projeção não disponíveis para este ticker.</p>
                  )}
                </CardContent>
              </Card>

              {/* Ticker summary table */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Resumo — retorno anual por ticker e cenário</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-semibold">Ticker</th>
                          <th className="text-left py-2 font-semibold">Peso</th>
                          <th className="text-right py-2 font-semibold text-red-600">Pessimista</th>
                          <th className="text-right py-2 font-semibold text-blue-600">Base</th>
                          <th className="text-right py-2 font-semibold text-emerald-600">Otimista</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proj.tickers.map((t: any) => (
                          <tr key={t.ticker} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 font-mono font-bold">{t.ticker}</td>
                            <td className="py-2 text-muted-foreground">
                              {portfolio.tickers.find(pt => pt.ticker === t.ticker)?.percentage ?? '–'}%
                            </td>
                            <td className="py-2 text-right text-red-600 font-medium">{t.yearReturn?.pessimista ?? '–'}</td>
                            <td className="py-2 text-right text-blue-600 font-medium">{t.yearReturn?.base ?? '–'}</td>
                            <td className="py-2 text-right text-emerald-600 font-medium">{t.yearReturn?.otimista ?? '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" size="sm" onClick={() => generateProjections(true)} disabled={projecting} className="gap-2">
                {projecting ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Recalculando…</> : <><RefreshCw className="h-3.5 w-3.5" /> Recalcular projeções</>}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Tab: Simulação de Capital */}
      {tab === 'simulacao' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Simulação de Capital
              </CardTitle>
              <CardDescription className="text-xs">
                Informe o capital total a investir. A IA distribui pelos pesos da carteira e projeta o retorno em 12 meses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-center max-w-sm">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    type="number"
                    placeholder="50000"
                    className="pl-9"
                    value={capital}
                    onChange={e => setCapital(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
              {validCapital && (
                <p className="text-xs text-muted-foreground mt-2">
                  Capital: <strong>R$ {capitalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </p>
              )}
            </CardContent>
          </Card>

          {!proj && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Gere as projeções na aba "Projeções 12 Meses" primeiro para habilitar a simulação de capital.
            </div>
          )}

          {proj && validCapital && (
            <>
              {/* Total summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {(['pessimista', 'base', 'otimista'] as const).map(s => {
                  const total = totalFutureValue(s)
                  const gain = total ? total - capitalNum : null
                  const gainPct = gain ? (gain / capitalNum * 100) : null
                  return (
                    <Card key={s}>
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground capitalize mb-1">{s}</p>
                        <p className="text-lg font-bold" style={{ color: SCENARIO_COLORS[s] }}>
                          {total ? `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '–'}
                        </p>
                        {gain !== null && (
                          <p className="text-xs mt-0.5" style={{ color: SCENARIO_COLORS[s] }}>
                            {gain >= 0 ? '+' : ''}{gain.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            {' '}({gainPct !== null ? `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%` : ''})
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Per-ticker breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distribuição e valor projetado por ativo</CardTitle>
                  <CardDescription className="text-xs">Valores projetados em 12 meses nos 3 cenários</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-semibold">Ticker</th>
                          <th className="text-right py-2 font-semibold">Investido</th>
                          <th className="text-right py-2 font-semibold text-red-600">Pessimista</th>
                          <th className="text-right py-2 font-semibold text-blue-600">Base</th>
                          <th className="text-right py-2 font-semibold text-emerald-600">Otimista</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.tickers.map(t => {
                          const invested = capitalNum * (t.percentage / 100)
                          return (
                            <tr key={t.ticker} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-2">
                                <span className="font-mono font-bold">{t.ticker}</span>
                                <span className="text-muted-foreground ml-1.5">({t.percentage}%)</span>
                              </td>
                              <td className="py-2 text-right text-muted-foreground">
                                R$ {invested.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              {(['pessimista', 'base', 'otimista'] as const).map(s => {
                                const future = tickerProjectedValue(t, s)
                                const gain = future ? future - invested : null
                                return (
                                  <td key={s} className="py-2 text-right" style={{ color: SCENARIO_COLORS[s] }}>
                                    {future ? (
                                      <>
                                        <div className="font-medium">R$ {future.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                        {gain !== null && (
                                          <div className="text-[10px] opacity-80">
                                            {gain >= 0 ? '+' : ''}{(gain / invested * 100).toFixed(1)}%
                                          </div>
                                        )}
                                      </>
                                    ) : '–'}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t font-semibold">
                          <td className="py-2">Total</td>
                          <td className="py-2 text-right text-muted-foreground">
                            R$ {capitalNum.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          {(['pessimista', 'base', 'otimista'] as const).map(s => {
                            const total = totalFutureValue(s)
                            return (
                              <td key={s} className="py-2 text-right" style={{ color: SCENARIO_COLORS[s] }}>
                                {total ? `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '–'}
                              </td>
                            )
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Simulação com fins exclusivamente educativos. Os valores projetados são estimativas baseadas em premissas macro e não garantem rentabilidade futura.
              </div>
            </>
          )}

          {proj && !validCapital && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Insira um valor de capital acima para ver a simulação.
            </div>
          )}
        </div>
      )}

      <Disclaimer
        variant="compact"
        text="Projeções e simulações têm fins exclusivamente educativos. Não constituem recomendação de investimento. Rentabilidade passada não é garantia de retorno futuro. Consulte um assessor habilitado pela CVM."
      />
    </div>
  )
}
