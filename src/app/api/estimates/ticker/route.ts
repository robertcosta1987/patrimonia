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

  const { ticker } = await request.json()
  if (!ticker) return NextResponse.json({ error: 'Ticker obrigatório' }, { status: 400 })

  const { data: asset } = await supabase
    .from('assets')
    .select(`
      ticker, name, sector, segment, asset_class,
      asset_metrics(pl, pvp, dividend_yield, roe, debt_equity, revenue_growth, volatility, avg_volume, market_cap, score),
      asset_prices(price, change_pct, ingested_at)
    `)
    .eq('ticker', ticker.toUpperCase())
    .single()

  if (!asset) {
    return NextResponse.json(
      { error: `Ticker ${ticker.toUpperCase()} não encontrado na base de dados. Tickers disponíveis: PETR4, VALE3, ITUB4, BBDC4, WEGE3, MXRF11, HGLG11, KNRI11, XPML11, KDIF11, CPFF11 e outros.` },
      { status: 404 }
    )
  }

  const metrics = (asset.asset_metrics as any)?.[0] ?? (asset.asset_metrics as any) ?? {}
  const prices: any[] = Array.isArray(asset.asset_prices) ? asset.asset_prices : []
  const latestPrice = prices.sort((a, b) => (b.ingested_at ?? '').localeCompare(a.ingested_at ?? ''))[0]

  const assetData = {
    ticker: asset.ticker,
    name: asset.name,
    asset_class: asset.asset_class,
    sector: asset.sector,
    segment: asset.segment,
    current_price: latestPrice?.price ?? null,
    price_change_pct: latestPrice?.change_pct ?? null,
    pl: metrics.pl ?? null,
    pvp: metrics.pvp ?? null,
    dividend_yield: metrics.dividend_yield ?? null,
    roe: metrics.roe ?? null,
    debt_equity: metrics.debt_equity ?? null,
    revenue_growth: metrics.revenue_growth ?? null,
    volatility: metrics.volatility ?? null,
    market_cap: metrics.market_cap ?? null,
    score: metrics.score ?? null,
  }

  const client = new Anthropic({ apiKey: key })

  const prompt = `Você é um analista quantitativo especializado no mercado financeiro brasileiro. Data de referência: Abril de 2025.

Com base nos dados fundamentalistas abaixo do ativo ${asset.ticker}, gere uma projeção educativa para os próximos 12 meses.

DADOS DO ATIVO:
${JSON.stringify(assetData, null, 2)}

Responda APENAS com um objeto JSON válido (sem markdown, sem texto adicional) no seguinte formato exato:
{
  "ticker": "${asset.ticker}",
  "name": "${asset.name}",
  "asset_class": "${asset.asset_class}",
  "currentPrice": número_ou_null,
  "projectedMonths": [
    {"month": "Mai/25", "pessimista": número, "base": número, "otimista": número},
    {"month": "Jun/25", "pessimista": número, "base": número, "otimista": número},
    {"month": "Jul/25", "pessimista": número, "base": número, "otimista": número},
    {"month": "Ago/25", "pessimista": número, "base": número, "otimista": número},
    {"month": "Set/25", "pessimista": número, "base": número, "otimista": número},
    {"month": "Out/25", "pessimista": número, "base": número, "otimista": número},
    {"month": "Nov/25", "pessimista": número, "base": número, "otimista": número},
    {"month": "Dez/25", "pessimista": número, "base": número, "otimista": número},
    {"month": "Jan/26", "pessimista": número, "base": número, "otimista": número},
    {"month": "Fev/26", "pessimista": número, "base": número, "otimista": número},
    {"month": "Mar/26", "pessimista": número, "base": número, "otimista": número},
    {"month": "Abr/26", "pessimista": número, "base": número, "otimista": número}
  ],
  "reasoning": "Análise fundamentalista em português (3-4 parágrafos) explicando a projeção com base nos dados disponíveis",
  "keyFactors": ["fator positivo 1", "fator positivo 2", "fator positivo 3"],
  "risks": ["risco 1", "risco 2", "risco 3"],
  "expectedReturnBase": "ex: '+12% em 12 meses'",
  "qualityScore": número_de_0_a_100
}

REGRAS:
- Se currentPrice for null, estime com base nas métricas (pvp * valor patrimonial implícito)
- Use volatility para calibrar o spread entre cenários pessimista e otimista
- O cenário base deve ser a projeção mais realista baseada nos fundamentos
- Seja conservador e realista — não exagere retornos
- Todos os preços devem ser números positivos`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  const extracted = extractJSON(text)
  try {
    const result = JSON.parse(extracted)
    return NextResponse.json(result)
  } catch {
    console.error('[ticker-estimate] JSON parse error, raw:', text.slice(0, 500))
    return NextResponse.json({ error: 'Falha ao processar resposta da IA. Tente novamente.' }, { status: 500 })
  }
}
