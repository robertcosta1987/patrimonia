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

// Build ordered month labels relative to a reference date
function buildMonthLabels(referenceDate: Date, offsetMonths: number, count: number): string[] {
  const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const labels: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(referenceDate)
    d.setMonth(d.getMonth() + offsetMonths + i)
    labels.push(`${PT_MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`)
  }
  return labels
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

  // Dynamic month labels
  const now = new Date()
  const pastLabels = buildMonthLabels(now, -12, 12)   // 12 months ago → last month
  const futureLabels = buildMonthLabels(now, 1, 12)    // next month → 12 months ahead
  const todayLabel = (() => {
    const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${PT_MONTHS[now.getMonth()]}/${String(now.getFullYear()).slice(2)}`
  })()

  const client = new Anthropic({ apiKey: key })

  const prompt = `Você é um analista quantitativo especializado no mercado financeiro brasileiro. Data atual: ${todayLabel} (Abril de 2026).

Analise o ativo ${asset.ticker} com os dados fundamentalistas abaixo e gere:
1. Estimativa de preços históricos dos últimos 12 meses (baseada no seu conhecimento do ativo e nas métricas fornecidas)
2. Projeção de preço para os próximos 12 meses (3 cenários)

DADOS DO ATIVO:
${JSON.stringify(assetData)}

Meses históricos (do mais antigo ao mais recente, terminando no mês passado):
${pastLabels.join(', ')}

Mês atual (ponto de hoje): ${todayLabel} — use current_price como valor exato aqui se disponível

Meses futuros:
${futureLabels.join(', ')}

Responda SOMENTE com JSON válido (sem markdown):
{
  "ticker": "${asset.ticker}",
  "name": "${asset.name}",
  "asset_class": "${asset.asset_class}",
  "currentPrice": número_ou_null,
  "historicalMonths": [
    ${pastLabels.map(m => `{"month":"${m}","price":número}`).join(',\n    ')}
  ],
  "futureMonths": [
    ${futureLabels.map(m => `{"month":"${m}","pessimista":número,"base":número,"otimista":número}`).join(',\n    ')}
  ],
  "reasoning": "Análise fundamentalista em português (3-4 parágrafos)",
  "keyFactors": ["fator 1","fator 2","fator 3"],
  "risks": ["risco 1","risco 2","risco 3"],
  "expectedReturnBase": "ex: '+12% em 12 meses'",
  "qualityScore": número_de_0_a_100
}

REGRAS:
- historicalMonths: estime preços plausíveis para os últimos 12 meses com base no seu conhecimento do ativo e na volatilidade fornecida. O último mês histórico deve se conectar suavemente ao currentPrice de hoje.
- futureMonths: pessimista < base < otimista. Todos partem do currentPrice de hoje.
- Use volatility para calibrar spreads entre cenários
- Seja realista e conservador — não exagere retornos
- Todos os preços são números positivos em R$`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  const extracted = extractJSON(text)
  try {
    const result = JSON.parse(extracted)
    // Inject today bridge point so chart lines connect cleanly
    const cp = result.currentPrice ?? assetData.current_price
    result.todayLabel = todayLabel
    result.todayPrice = cp
    return NextResponse.json(result)
  } catch {
    console.error('[ticker-estimate] JSON parse error, raw:', text.slice(0, 500))
    return NextResponse.json({ error: 'Falha ao processar resposta da IA. Tente novamente.' }, { status: 500 })
  }
}
