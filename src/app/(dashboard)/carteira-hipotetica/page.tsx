'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Disclaimer } from '@/components/common/disclaimer'
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, Save, ExternalLink } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'

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

interface HypotheticalPortfolio {
  profile: string
  reasoning: string
  expectedReturn: string
  riskLevel: string
  allocation: AllocationItem[]
  tickers: PortfolioTicker[]
}

const RISK_COLORS: Record<string, string> = {
  Baixo: 'text-blue-700 border-blue-300 bg-blue-50',
  Moderado: 'text-amber-700 border-amber-300 bg-amber-50',
  Alto: 'text-rose-700 border-rose-300 bg-rose-50',
}

const CLASS_LABELS: Record<string, string> = {
  acao: 'Ação',
  fii: 'FII',
  fi_infra: 'FI-Infra',
  tesouro: 'Tesouro',
  renda_fixa: 'Renda Fixa',
  TESOURO_SELIC: 'Tesouro Selic',
  TESOURO_IPCA: 'Tesouro IPCA+',
  TESOURO_PRE: 'Tesouro Prefixado',
  CDB_CDI: 'CDB',
}

export default function CarteiraHipoteticaPage() {
  const [portfolio, setPortfolio] = useState<HypotheticalPortfolio | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    setSavedId(null)
    setSavedName(null)
    try {
      const res = await fetch('/api/portfolio/hypothetical', { method: 'POST' })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setPortfolio(data)
    } catch {
      setError('Falha na conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function savePortfolio() {
    if (!portfolio) return
    setSaving(true)
    try {
      const res = await fetch('/api/portfolio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolio),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setSavedId(data.id)
        setSavedName(data.name)
      }
    } catch {
      setError('Falha ao salvar carteira.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Sua Carteira Hipotética
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          A IA monta uma carteira teórica personalizada baseada no seu perfil de risco. Fins exclusivamente educativos.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Carteira 100% Hipotética — Não é Recomendação de Investimento</p>
          <p className="text-xs text-amber-700 mt-1">
            Esta carteira é gerada por inteligência artificial com fins exclusivamente educativos e analíticos.
            Não constitui aconselhamento financeiro, jurídico ou tributário individualizado.
            Antes de qualquer decisão de investimento, consulte um assessor habilitado pela CVM.
            Rentabilidade passada não garante resultados futuros.
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Button onClick={generate} disabled={loading} size="lg" className="gap-2 min-w-[220px]">
          {loading
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Gerando carteira…</>
            : <><Sparkles className="h-4 w-4" /> {portfolio ? 'Gerar nova carteira' : 'Gerar Carteira com IA'}</>
          }
        </Button>
        {portfolio && !savedId && (
          <Button onClick={savePortfolio} disabled={saving} variant="outline" size="lg" className="gap-2">
            {saving ? <><RefreshCw className="h-4 w-4 animate-spin" /> Salvando…</> : <><Save className="h-4 w-4" /> Salvar carteira</>}
          </Button>
        )}
      </div>

      {savedId && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Carteira salva com sucesso!</p>
            <p className="text-xs text-emerald-700">{savedName}</p>
          </div>
          <Link href={`/minhas-carteiras/${savedId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-100">
              <ExternalLink className="h-3.5 w-3.5" /> Ver detalhes
            </Button>
          </Link>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {portfolio && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{portfolio.profile}</Badge>
            <Badge variant="outline" className="text-emerald-700 border-emerald-300">
              <TrendingUp className="h-3 w-3 mr-1" />
              {portfolio.expectedReturn}
            </Badge>
            <Badge
              variant="outline"
              className={RISK_COLORS[portfolio.riskLevel] ?? 'text-muted-foreground'}
            >
              Risco {portfolio.riskLevel}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alocação por classe de ativo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={portfolio.allocation.filter(a => a.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {portfolio.allocation.filter(a => a.value > 0).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val}%`, 'Alocação']} />
                    <Legend
                      formatter={(value) => <span className="text-xs">{value}</span>}
                      iconSize={10}
                    />
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
                  {portfolio.reasoning.split('\n').filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Ativos selecionados pela IA
              </CardTitle>
              <CardDescription className="text-xs">
                Seleção baseada em fundamentos e compatibilidade com o perfil de risco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {portfolio.tickers.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                    <div className="text-center min-w-[68px]">
                      <p className="text-sm font-bold font-mono">{t.ticker}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 mt-0.5 font-normal">
                        {t.percentage}%
                      </Badge>
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
                      <span className="text-xs text-emerald-600 font-semibold whitespace-nowrap shrink-0">
                        {t.expectedReturn}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Distribuição por classe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {portfolio.allocation.filter(a => a.value > 0).map((a, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{a.name}</span>
                    <span className="font-bold" style={{ color: a.color }}>{a.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${a.value}%`, backgroundColor: a.color }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Disclaimer
        variant="compact"
        text="Esta carteira hipotética é gerada por IA para fins educativos. Não constitui recomendação de investimento. Os ativos são exemplos analíticos baseados em dados públicos. Consulte um assessor CVM habilitado antes de investir."
      />
    </div>
  )
}
