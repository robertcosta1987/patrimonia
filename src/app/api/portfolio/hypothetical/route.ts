import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
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

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 })

  const [profileRes, assetsRes] = await Promise.all([
    supabase.from('investor_profiles').select('*').eq('user_id', user.id).single(),
    supabase
      .from('assets')
      .select(`
        ticker, name, sector, segment, asset_class,
        asset_metrics(pl, pvp, dividend_yield, roe, score, volatility),
        asset_prices(price)
      `)
      .eq('is_active', true),
  ])

  const profile = profileRes.data ?? {
    profile: 'moderado',
    risk_score: 50,
    allocation_renda_fixa: 50,
    allocation_fii: 25,
    allocation_acoes: 20,
    allocation_caixa: 5,
  }

  const assetsSummary = (assetsRes.data ?? []).map(a => {
    const m = (a.asset_metrics as any)?.[0] ?? (a.asset_metrics as any) ?? {}
    const prices: any[] = Array.isArray(a.asset_prices) ? a.asset_prices : []
    return {
      ticker: a.ticker,
      name: a.name,
      class: a.asset_class,
      sector: a.sector,
      segment: a.segment,
      price: prices[0]?.price ?? null,
      pl: m.pl ?? null,
      pvp: m.pvp ?? null,
      dividend_yield: m.dividend_yield ?? null,
      roe: m.roe ?? null,
      score: m.score ?? null,
      volatility: m.volatility ?? null,
    }
  })

  const client = new Anthropic({ apiKey: key })

  const prompt = `Você é um analista de investimentos especializado no mercado brasileiro. Data: Abril 2025.

PERFIL DO INVESTIDOR:
${JSON.stringify({
  profile: profile.profile,
  risk_score: profile.risk_score,
  allocation_renda_fixa: profile.allocation_renda_fixa,
  allocation_fii: profile.allocation_fii,
  allocation_acoes: profile.allocation_acoes,
  allocation_caixa: profile.allocation_caixa,
}, null, 2)}

ATIVOS DISPONÍVEIS NA BASE DE DADOS:
${JSON.stringify(assetsSummary, null, 2)}

Crie uma carteira hipotética EDUCATIVA com 6 a 9 ativos escolhidos dos disponíveis acima, otimizada para este perfil.
Para renda fixa/tesouro, use os tickers especiais: "TESOURO_SELIC", "TESOURO_IPCA", "TESOURO_PRE", "CDB_CDI".

Responda APENAS com JSON válido (sem markdown):
{
  "profile": "nome do perfil",
  "reasoning": "Racional detalhado da carteira em 2-3 parágrafos em português",
  "expectedReturn": "ex: '12-16% a.a.'",
  "riskLevel": "Baixo/Moderado/Alto",
  "allocation": [
    {"name": "Renda Fixa / Tesouro", "value": número_inteiro, "color": "#3b82f6"},
    {"name": "FIIs", "value": número_inteiro, "color": "#10b981"},
    {"name": "Ações", "value": número_inteiro, "color": "#f59e0b"},
    {"name": "FI-Infra", "value": número_inteiro, "color": "#06b6d4"},
    {"name": "Caixa", "value": número_inteiro, "color": "#94a3b8"}
  ],
  "tickers": [
    {
      "ticker": "TICKER",
      "name": "Nome completo do ativo",
      "asset_class": "classe",
      "percentage": número_inteiro,
      "reasoning": "Por que este ativo foi selecionado (1-2 frases diretas)",
      "expectedReturn": "ex: '13% a.a.' ou null"
    }
  ]
}

REGRAS:
- A soma de "value" em allocation deve ser exatamente 100
- A soma de "percentage" em tickers deve ser próxima de 100 (pode ter pequena diferença por arredondamento)
- Escolha ativos com melhores scores para o perfil de risco
- Perfil conservador: priorize renda fixa, tesouro, FIIs de tijolo defensivos
- Perfil moderado: equilibre renda fixa, FIIs, alguma ação blue chip
- Perfil arrojado: mais ações, FI-Infra, FIIs de papel
- Omita classes com value=0 em allocation
- Explique claramente por que cada ativo foi escolhido`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  const extracted = extractJSON(text)
  try {
    const result = JSON.parse(extracted)
    return NextResponse.json(result)
  } catch {
    console.error('[hypothetical-portfolio] JSON parse error, raw:', text.slice(0, 500))
    return NextResponse.json({ error: 'Falha ao processar resposta da IA. Tente novamente.' }, { status: 500 })
  }
}
