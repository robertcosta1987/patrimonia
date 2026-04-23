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

const MONTHS = ['Mai/26','Jun/26','Jul/26','Ago/26','Set/26','Out/26','Nov/26','Dez/26','Jan/27','Fev/27','Mar/27','Abr/27']

// Build smooth monthly curve from annual return %.
// Uses a slight sinusoidal variance so the chart looks organic, not just a straight line.
function buildMonthlyPriceCurve(currentPrice: number, annualReturnPct: number) {
  return MONTHS.map((month, i) => {
    const t = (i + 1) / 12
    // slight S-curve: ease-in early, ease-out late
    const base = currentPrice * Math.pow(1 + annualReturnPct / 100, t)
    // small noise: ±1% sinusoidal wobble so chart looks realistic
    const wobble = base * 0.01 * Math.sin((i + 1) * 1.3)
    return { month, price: +(base + wobble).toFixed(2) }
  })
}

// Build monthly portfolio return % curve from annual return %
function buildMonthlyReturnCurve(annualReturnPct: number) {
  const monthlyRate = Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1
  return MONTHS.map((month, i) => {
    const wobble = monthlyRate * 0.3 * Math.sin((i + 1) * 1.7)
    return { month, pct: +((monthlyRate + wobble) * 100).toFixed(2) }
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 })

  const { portfolioId, force } = await request.json()
  if (!portfolioId) return NextResponse.json({ error: 'portfolioId obrigatório' }, { status: 400 })

  const { data: portfolio, error: pfErr } = await supabase
    .from('generated_portfolios')
    .select('*')
    .eq('id', portfolioId)
    .eq('user_id', user.id)
    .single()

  if (pfErr || !portfolio) return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 })

  if (portfolio.projections && !force) {
    return NextResponse.json({ projections: portfolio.projections })
  }

  const tickers: { ticker: string; name: string; asset_class: string; percentage: number }[] = portfolio.tickers

  // Fetch live metrics for all tickers
  const tickerSymbols = tickers.map(t => t.ticker)
  const { data: assets } = await supabase
    .from('assets')
    .select(`
      ticker, asset_class, sector,
      asset_metrics(pl, pvp, dividend_yield, roe, volatility, score),
      asset_prices(price, ingested_at)
    `)
    .in('ticker', tickerSymbols)

  const assetMap: Record<string, any> = {}
  for (const a of assets ?? []) {
    const m = (a.asset_metrics as any)?.[0] ?? {}
    const prices: any[] = Array.isArray(a.asset_prices) ? a.asset_prices : []
    const latest = prices.sort((x: any, y: any) => (y.ingested_at ?? '').localeCompare(x.ingested_at ?? ''))[0]
    assetMap[a.ticker] = {
      class: a.asset_class, sector: a.sector,
      pl: m.pl, pvp: m.pvp, dy: m.dividend_yield, roe: m.roe, vol: m.volatility, score: m.score,
      price: latest?.price ?? null,
    }
  }

  const enrichedTickers = tickers.map(t => ({
    ticker: t.ticker, name: t.name, pct: t.percentage,
    ...(assetMap[t.ticker] ?? {}),
  }))

  const client = new Anthropic({ apiKey: key })

  const prompt = `Analista quantitativo do mercado brasileiro. Data: Abril 2026.

Carteira: Perfil ${portfolio.profile} | Risco ${portfolio.risk_level} | Retorno esperado ${portfolio.expected_return}
Ativos: ${JSON.stringify(enrichedTickers)}

Estime o retorno anual (%) de cada ativo nos 3 cenários para os próximos 12 meses.

Responda SOMENTE com JSON válido (sem markdown):
{
  "portfolioReasoning": "Análise macro da carteira em 2-3 frases",
  "portfolioYear": { "pessimista": -4.5, "base": 12.0, "otimista": 23.5 },
  "tickers": [
    { "ticker": "XXXX11", "currentPrice": 95.50, "yearReturn": { "pessimista": -6.0, "base": 10.5, "otimista": 22.0 }, "reasoning": "1 frase explicando a projeção" }
  ],
  "assumptions": ["premissa 1", "premissa 2", "premissa 3"]
}

REGRAS:
- portfolioYear: retorno % anual ponderado da carteira inteira
- tickers: retorno % anual de cada ativo (pessimista < base < otimista)
- currentPrice: preço atual em R$ (use o dado fornecido ou estime de forma educativa)
- Cenários diferenciados e realistas para o Brasil atual
- Português brasileiro
- JSON mínimo e completo — sem campos extras`

  console.log('[portfolio/project] calling claude, tickers=', tickerSymbols.length)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  console.log('[portfolio/project] stop_reason=', response.stop_reason, 'tokens=', response.usage.output_tokens)

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const extracted = extractJSON(text)

  let raw: any
  try {
    raw = JSON.parse(extracted)
  } catch (e) {
    console.error('[portfolio/project] parse error:', String(e), '| raw[:400]:', text.slice(0, 400))
    return NextResponse.json({ error: 'Falha ao processar projeção da IA. Tente novamente.' }, { status: 500 })
  }

  if (!raw.portfolioYear || !raw.tickers) {
    console.error('[portfolio/project] missing fields:', Object.keys(raw))
    return NextResponse.json({ error: 'Resposta da IA incompleta. Tente novamente.' }, { status: 500 })
  }

  // Expand compact AI response into full month-by-month curves on the server
  const projections = {
    portfolioReasoning: raw.portfolioReasoning ?? '',
    assumptions: raw.assumptions ?? [],
    portfolioYear: raw.portfolioYear,
    // portfolio composite: monthly % returns
    portfolioMonths: (['pessimista', 'base', 'otimista'] as const).reduce((acc, s) => {
      const curve = buildMonthlyReturnCurve(raw.portfolioYear[s] ?? 0)
      curve.forEach((pt, i) => {
        if (!acc[i]) acc[i] = { month: pt.month, pessimista: 0, base: 0, otimista: 0 }
        acc[i][s] = pt.pct
      })
      return acc
    }, [] as { month: string; pessimista: number; base: number; otimista: number }[]),
    // per-ticker monthly price curves
    tickers: raw.tickers.map((t: any) => {
      const allocationTicker = tickers.find(pt => pt.ticker === t.ticker)
      return {
        ticker: t.ticker,
        percentage: allocationTicker?.percentage ?? 0,
        currentPrice: t.currentPrice ?? 100,
        reasoning: t.reasoning ?? '',
        yearReturn: {
          pessimista: `${t.yearReturn?.pessimista >= 0 ? '+' : ''}${t.yearReturn?.pessimista ?? 0}%`,
          base: `${t.yearReturn?.base >= 0 ? '+' : ''}${t.yearReturn?.base ?? 0}%`,
          otimista: `${t.yearReturn?.otimista >= 0 ? '+' : ''}${t.yearReturn?.otimista ?? 0}%`,
        },
        yearReturnNum: t.yearReturn,
        months: MONTHS.map((month, i) => {
          const cp = t.currentPrice ?? 100
          return {
            month,
            pessimista: buildMonthlyPriceCurve(cp, t.yearReturn?.pessimista ?? 0)[i].price,
            base: buildMonthlyPriceCurve(cp, t.yearReturn?.base ?? 0)[i].price,
            otimista: buildMonthlyPriceCurve(cp, t.yearReturn?.otimista ?? 0)[i].price,
          }
        }),
      }
    }),
  }

  await supabase
    .from('generated_portfolios')
    .update({ projections, updated_at: new Date().toISOString() })
    .eq('id', portfolioId)

  return NextResponse.json({ projections })
}
