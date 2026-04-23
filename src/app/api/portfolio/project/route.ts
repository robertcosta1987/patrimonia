import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 90

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fenced) return fenced[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end > start) return raw.slice(start, end + 1)
  return raw.trim()
}

const MONTHS = ['Mai/26','Jun/26','Jul/26','Ago/26','Set/26','Out/26','Nov/26','Dez/26','Jan/27','Fev/27','Mar/27','Abr/27']

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
      pl: m.pl, pvp: m.pvp, dy: m.dividend_yield, roe: m.roe,
      vol: m.volatility, score: m.score,
      price: latest?.price ?? null,
    }
  }

  const enrichedTickers = tickers.map(t => ({
    ticker: t.ticker,
    name: t.name,
    class: t.asset_class,
    pct: t.percentage,
    ...(assetMap[t.ticker] ?? {}),
  }))

  const client = new Anthropic({ apiKey: key })

  // Build a compact schema example showing exactly 2 months so Claude knows the shape
  const schemaExample = JSON.stringify({
    portfolioReasoning: "string",
    portfolioMonths: [
      { month: "Mai/26", pessimista: -1.2, base: 0.8, otimista: 2.1 },
      { month: "Jun/26", pessimista: -0.9, base: 1.1, otimista: 2.5 }
    ],
    tickers: [
      {
        ticker: "TICKER11",
        currentPrice: 95.50,
        months: [
          { month: "Mai/26", pessimista: 93.10, base: 96.80, otimista: 100.20 },
          { month: "Jun/26", pessimista: 92.50, base: 97.90, otimista: 102.40 }
        ],
        yearReturn: { pessimista: "-5%", base: "+12%", otimista: "+25%" },
        reasoning: "string"
      }
    ],
    assumptions: ["string", "string", "string"]
  }, null, 2)

  const prompt = `Você é um analista quantitativo do mercado brasileiro. Data de referência: Abril de 2026.

Projete o desempenho desta carteira hipotética para os próximos 12 meses.

CARTEIRA: Perfil ${portfolio.profile} | Risco ${portfolio.risk_level} | Retorno esperado ${portfolio.expected_return}
ATIVOS: ${JSON.stringify(enrichedTickers)}

MESES OBRIGATÓRIOS (exatamente estes 12, nesta ordem): ${MONTHS.join(', ')}

Responda SOMENTE com JSON válido, sem texto fora do JSON, sem markdown, sem comentários.
Estrutura exata (mostro 2 meses como exemplo, você deve retornar todos os 12):

${schemaExample}

REGRAS OBRIGATÓRIAS:
1. portfolioMonths: retorno mensal % do portfólio ponderado pelos pesos (pode ser negativo)
2. tickers: preço projetado absoluto por mês em R$ (use currentPrice do ativo como base; se não disponível, estime um preço educativo razoável para o tipo de ativo)
3. Retorne TODOS os 12 meses para portfolioMonths e para CADA ticker
4. yearReturn: variação % acumulada no ano (ex: "+15%", "-3%")
5. Cenários realistas e diferenciados para o mercado brasileiro atual
6. JSON completo e válido — não corte nem truncar`

  console.log('[portfolio/project] calling claude, tickers=', tickerSymbols.length)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  })

  console.log('[portfolio/project] stop_reason=', response.stop_reason, 'tokens=', response.usage.output_tokens)

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  if (response.stop_reason === 'max_tokens') {
    console.error('[portfolio/project] response truncated — token limit hit')
    return NextResponse.json({ error: 'Resposta da IA truncada. Tente novamente com menos ativos na carteira.' }, { status: 500 })
  }

  const extracted = extractJSON(text)

  let projections: any
  try {
    projections = JSON.parse(extracted)
  } catch (e) {
    console.error('[portfolio/project] JSON parse error:', String(e), '| raw[:500]:', text.slice(0, 500))
    return NextResponse.json({ error: 'Falha ao processar projeção da IA. Tente novamente.' }, { status: 500 })
  }

  // Validate minimum structure
  if (!projections.portfolioMonths || !projections.tickers) {
    console.error('[portfolio/project] missing fields in response')
    return NextResponse.json({ error: 'Resposta da IA incompleta. Tente novamente.' }, { status: 500 })
  }

  await supabase
    .from('generated_portfolios')
    .update({ projections, updated_at: new Date().toISOString() })
    .eq('id', portfolioId)

  return NextResponse.json({ projections })
}
