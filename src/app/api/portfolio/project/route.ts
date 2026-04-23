import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fenced) return fenced[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end > start) return raw.slice(start, end + 1)
  return raw.trim()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 })

  const { portfolioId } = await request.json()
  if (!portfolioId) return NextResponse.json({ error: 'portfolioId obrigatório' }, { status: 400 })

  const { data: portfolio, error: pfErr } = await supabase
    .from('generated_portfolios')
    .select('*')
    .eq('id', portfolioId)
    .eq('user_id', user.id)
    .single()

  if (pfErr || !portfolio) return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 })

  // If already projected, return cached
  if (portfolio.projections) {
    return NextResponse.json({ projections: portfolio.projections })
  }

  const tickers: { ticker: string; name: string; asset_class: string; percentage: number }[] = portfolio.tickers

  // Fetch live metrics for all tickers
  const tickerSymbols = tickers.map(t => t.ticker)
  const { data: assets } = await supabase
    .from('assets')
    .select(`
      ticker, name, asset_class, sector,
      asset_metrics(pl, pvp, dividend_yield, roe, volatility, score),
      asset_prices(price, change_pct, ingested_at)
    `)
    .in('ticker', tickerSymbols)

  const assetMap: Record<string, any> = {}
  for (const a of assets ?? []) {
    const m = (a.asset_metrics as any)?.[0] ?? {}
    const prices: any[] = Array.isArray(a.asset_prices) ? a.asset_prices : []
    const latest = prices.sort((x, y) => (y.ingested_at ?? '').localeCompare(x.ingested_at ?? ''))[0]
    assetMap[a.ticker] = {
      ticker: a.ticker, name: a.name, asset_class: a.asset_class, sector: a.sector,
      pl: m.pl, pvp: m.pvp, dividend_yield: m.dividend_yield, roe: m.roe,
      volatility: m.volatility, score: m.score,
      price: latest?.price ?? null,
    }
  }

  const enrichedTickers = tickers.map(t => ({
    ...t,
    ...(assetMap[t.ticker] ?? {}),
  }))

  const client = new Anthropic({ apiKey: key })

  const prompt = `Você é um analista quantitativo especializado no mercado brasileiro. Data de referência: Abril de 2026.

Analise esta carteira hipotética e projete o desempenho de cada ativo para os próximos 12 meses (mês a mês).

## Carteira
Perfil: ${portfolio.profile} | Risco: ${portfolio.risk_level} | Retorno esperado: ${portfolio.expected_return}

## Ativos com métricas
${JSON.stringify(enrichedTickers, null, 2)}

## Tarefa

Retorne APENAS JSON válido (sem markdown) com a seguinte estrutura:
{
  "portfolioReasoning": "Análise geral da carteira e perspectivas para os próximos 12 meses (2-3 frases)",
  "portfolioMonths": [
    { "month": "Mai/26", "pessimista": -2.1, "base": 1.5, "otimista": 3.8 },
    ... (12 meses, valores são retornos mensais % do portfólio ponderado)
  ],
  "tickers": [
    {
      "ticker": "TICKER11",
      "currentPrice": 95.50,
      "months": [
        { "month": "Mai/26", "pessimista": 93.10, "base": 96.80, "otimista": 100.20 },
        ... (12 meses, valores são preços projetados)
      ],
      "yearReturn": { "pessimista": "-5%", "base": "+12%", "otimista": "+25%" },
      "reasoning": "Por que este ativo tem estas projeções (1-2 frases)"
    }
  ],
  "assumptions": ["Premissa macroeconômica 1", "Premissa 2", "Premissa 3"]
}

REGRAS:
- portfolioMonths: retorno mensal % ponderado pela alocação (pode ser negativo)
- tickers: preço absoluto projetado por mês (use currentPrice como base, estimativas educativas se não disponível)
- 12 meses: Mai/26, Jun/26, Jul/26, Ago/26, Set/26, Out/26, Nov/26, Dez/26, Jan/27, Fev/27, Mar/27, Abr/27
- Cenários realistas para mercado brasileiro
- Tudo em Português brasileiro`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const extracted = extractJSON(text)

  let projections: any
  try {
    projections = JSON.parse(extracted)
  } catch {
    console.error('[portfolio/project] JSON parse error:', text.slice(0, 300))
    return NextResponse.json({ error: 'Falha ao processar projeção da IA' }, { status: 500 })
  }

  // Cache projections in DB
  await supabase
    .from('generated_portfolios')
    .update({ projections, updated_at: new Date().toISOString() })
    .eq('id', portfolioId)

  return NextResponse.json({ projections })
}
