'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderOpen, TrendingUp, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SavedPortfolio {
  id: string
  name: string
  profile: string
  expected_return: string
  risk_level: string
  tickers: { ticker: string; percentage: number }[]
  created_at: string
}

const RISK_COLORS: Record<string, string> = {
  Baixo: 'text-blue-700 border-blue-300 bg-blue-50',
  Moderado: 'text-amber-700 border-amber-300 bg-amber-50',
  Alto: 'text-rose-700 border-rose-300 bg-rose-50',
}

export default function MinhasCarteirasPage() {
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('generated_portfolios')
        .select('id, name, profile, expected_return, risk_level, tickers, created_at')
        .order('created_at', { ascending: false })
      setPortfolios((data as SavedPortfolio[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            Minhas Carteiras Geradas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Carteiras hipotéticas salvas — clique para ver projeções e simulações de capital.
          </p>
        </div>
        <Link href="/carteira-hipotetica">
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" /> Nova carteira
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando…</div>
      )}

      {!loading && portfolios.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-medium">Nenhuma carteira salva ainda</p>
            <p className="text-muted-foreground text-xs mt-1 mb-4">
              Gere uma carteira hipotética e salve-a para analisar projeções e simular capital.
            </p>
            <Link href="/carteira-hipotetica">
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" /> Gerar minha primeira carteira
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {portfolios.map(p => (
        <Link key={p.id} href={`/minhas-carteiras/${p.id}`} className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize text-xs">{p.profile}</Badge>
                <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {p.expected_return}
                </Badge>
                <Badge variant="outline" className={`text-xs ${RISK_COLORS[p.risk_level] ?? ''}`}>
                  Risco {p.risk_level}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {p.tickers?.length ?? 0} ativos
                </span>
              </div>
              {p.tickers && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.tickers.slice(0, 8).map(t => (
                    <span key={t.ticker} className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded">
                      {t.ticker} <span className="text-muted-foreground">{t.percentage}%</span>
                    </span>
                  ))}
                  {p.tickers.length > 8 && (
                    <span className="text-[11px] text-muted-foreground px-2 py-0.5">+{p.tickers.length - 8} mais</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}

      {!loading && portfolios.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Todas as carteiras têm fins exclusivamente educativos e não constituem recomendação de investimento.
        </div>
      )}
    </div>
  )
}
