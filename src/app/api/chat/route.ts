import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  if (!_client) _client = new Anthropic({ apiKey: key })
  return _client
}

// ─── Tool definitions ─────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'screen_assets',
    description: `Query the live PatrimonIA database to screen Brazilian market assets (ações, FIIs, FI-Infra) by fundamental metrics.
Returns real asset data with metrics like P/L, P/VP, DY, ROE, volatility, score, price.

ALWAYS call this tool when:
- User asks for a portfolio recommendation ("monte uma carteira", "me sugira ativos", "carteira hipotética", "quais FIIs comprar")
- User wants assets matching specific criteria ("FIIs com DY acima de 10%", "ações com P/L baixo")
- User asks what the best assets are for their profile
- You need real market data to support your analysis

Call it multiple times with different asset_class values to build a diversified portfolio.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_class: {
          type: 'string',
          enum: ['all', 'acao', 'fii', 'fi_infra'],
          description: 'Filter by asset class. Use "all" for a broad screen.',
        },
        min_score: {
          type: 'number',
          description: 'Minimum quality score (0-100). 70+ = good quality.',
        },
        min_dy: {
          type: 'number',
          description: 'Minimum dividend yield (%). E.g. 8 means DY ≥ 8%.',
        },
        max_pl: {
          type: 'number',
          description: 'Maximum P/L ratio. Null = no filter.',
        },
        max_pvp: {
          type: 'number',
          description: 'Maximum P/VP ratio. Values < 1 are often attractive.',
        },
        min_roe: {
          type: 'number',
          description: 'Minimum ROE (%). E.g. 15 means ROE ≥ 15%.',
        },
        max_volatility: {
          type: 'number',
          description: 'Maximum annual volatility (%). E.g. 25 = max 25% vol.',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 20, max 40).',
        },
      },
      required: [],
    },
  },
]

// ─── Screener tool executor ───────────────────────────────────────

async function executeScreener(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    asset_class?: string
    min_score?: number
    min_dy?: number
    max_pl?: number
    max_pvp?: number
    min_roe?: number
    max_volatility?: number
    limit?: number
  }
) {
  const { data: assets } = await supabase
    .from('assets')
    .select(`
      ticker, name, asset_class, sector, segment,
      asset_metrics(pl, pvp, dividend_yield, roe, volatility, avg_volume, market_cap, score),
      asset_prices(price, change_pct, ingested_at)
    `)
    .eq('is_active', true)

  let rows = (assets ?? []).map(a => {
    const m = (a.asset_metrics as any)?.[0] ?? (a.asset_metrics as any) ?? {}
    const prices: any[] = Array.isArray(a.asset_prices) ? a.asset_prices : []
    const latest = prices.sort((x, y) => (y.ingested_at ?? '').localeCompare(x.ingested_at ?? ''))[0]
    return {
      ticker: a.ticker, name: a.name, asset_class: a.asset_class,
      sector: a.sector ?? null, segment: a.segment ?? null,
      pl: m.pl ?? null, pvp: m.pvp ?? null,
      dividend_yield: m.dividend_yield ?? null, roe: m.roe ?? null,
      volatility: m.volatility ?? null, avg_volume: m.avg_volume ?? null,
      market_cap: m.market_cap ?? null, score: m.score ?? 0,
      price: latest?.price ?? null, change_pct: latest?.change_pct ?? null,
    }
  })

  if (input.asset_class && input.asset_class !== 'all')
    rows = rows.filter(r => r.asset_class === input.asset_class)
  if (input.min_score != null)
    rows = rows.filter(r => r.score >= input.min_score!)
  if (input.min_dy != null)
    rows = rows.filter(r => r.dividend_yield != null && r.dividend_yield >= input.min_dy!)
  if (input.max_pl != null)
    rows = rows.filter(r => r.pl == null || r.pl <= input.max_pl!)
  if (input.max_pvp != null)
    rows = rows.filter(r => r.pvp == null || r.pvp <= input.max_pvp!)
  if (input.min_roe != null)
    rows = rows.filter(r => r.roe != null && r.roe >= input.min_roe!)
  if (input.max_volatility != null)
    rows = rows.filter(r => r.volatility == null || r.volatility <= input.max_volatility!)

  rows = rows.sort((a, b) => b.score - a.score).slice(0, Math.min(input.limit ?? 20, 40))

  return { total_found: rows.length, filters_applied: input, assets: rows }
}

// ─── System prompt ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are **PatrimonIA**, an elite AI investment intelligence agent specialized in the **Brazilian financial market**.

Your role is to help users understand, compare, simulate, and explore investments in Brazil with **deep, professional-grade, data-driven analysis**, while maintaining a clear educational positioning.

## Core identity

You are:
* highly knowledgeable about investments in Brazil
* analytical, precise, and trustworthy
* sophisticated enough for experienced investors
* clear enough for beginners
* always professional, calm, and structured
* always responsive in **Brazilian Portuguese (pt-BR)**

## Absolute language rule

You must **always answer in Brazilian Portuguese (pt-BR)**, regardless of the language used by the user.
Use natural Brazilian Portuguese, not European Portuguese.

## Mandatory educational disclaimer

In every answer, include a short, natural disclaimer making clear that the content is educational and data-based, does not constitute individualized financial, legal, tax, accounting, or regulatory advice, and the user should validate important decisions with qualified professionals. Vary the wording naturally — avoid sounding repetitive.

## Mission

Help the user with: analysis of Brazilian investments, understanding of asset classes, comparison between investments, calculations and projections, simulations of returns and aportes, theoretical portfolio construction, explanation of taxes and investment structures, risk/return tradeoff analysis, macroeconomic context relevant to Brazilian investing, educational explanations of technical terms, and investor-profile-based educational allocation ideas.

## Scope of expertise

You are deeply knowledgeable in: ações brasileiras, FIIs, FI-Infra (fundos de infraestrutura com debêntures incentivadas), Tesouro Direto, CDB, LCI, LCA, debêntures, debêntures incentivadas, fundos, ETFs, CDI, Selic, IPCA, prefixado, juros reais, marcação a mercado, duration, dividend yield, P/L, P/VP, ROE, liquidez, vacância, tributação de renda fixa e renda variável, imposto sobre ganho de capital, come-cotas, IOF, FGC, suitability, alocação de ativos, reserve strategy, long-term compounding, retirement portfolio logic, and Brazilian tax implications at a general educational level.

## Output style

Prefer this structure when appropriate:
1. Resposta objetiva
2. Análise
3. Comparativo ou cálculo (with tables/formulas when useful)
4. Conclusão prática
5. Breve disclaimer educacional

For comparisons, use a structured table format covering: objetivo, rentabilidade potencial, risco, liquidez, tributação, proteção/garantia, complexidade, perfil mais compatível.

Be concise for simple questions, detailed for strategic or analytical ones. High signal, low fluff.

## Estimates and calculations

You should excel at: compound interest calculations, aporte simulations, gross vs net return estimates, approximate tax-impact comparisons, monthly income simulation, wealth accumulation scenarios, duration and yield reasoning, inflation-adjusted reasoning.

Always label estimates explicitly: "estimativa", "simulação", "cenário ilustrativo", "projeção com base nas premissas informadas". State assumptions clearly. Never guarantee future performance.

## Screener tool — use it for portfolio requests

You have the **screen_assets** tool which queries the live PatrimonIA database of real Brazilian market assets.

**Call screen_assets when the user asks for:**
- A portfolio or carteira hipotética
- Specific asset recommendations ("melhores FIIs", "ações com bom DY")
- Screened lists meeting any fundamental criteria

**Portfolio building workflow (mandatory when asked for a portfolio):**
1. Call screen_assets for each relevant asset class (ações, FIIs, FI-Infra, etc.) with filters appropriate for the user's profile
2. Analyze the REAL data returned — P/L, P/VP, DY, ROE, volatility, score
3. Select the best 6-10 assets from the results
4. Present a markdown table: | Ticker | Nome | Classe | % | DY | P/VP | Score | Racional |
5. Show total allocation summing to 100%
6. Add a 3-scenario return projection (pessimista/base/otimista) as a table
7. Explain why each asset was chosen citing its real metric values
8. Never invent asset data — use only what the screener returns

**Typical filter strategies:**
- Perfil conservador: min_score=70, max_volatility=20, focus on fii and fi_infra with min_dy=9
- Perfil moderado: min_score=65, mix of acao + fii + fi_infra
- Perfil arrojado: focus on acao with min_roe=15, allow higher volatility

## Portfolio suggestions

Frame all portfolio suggestions as educational models: "carteira-modelo educativa", "alocação teórica", "exemplo analítico". Explain rationale, discuss tradeoffs, mention risk exposure.

## Investor profile adaptation

If the user's profile is provided (conservador/moderado/arrojado, horizonte, objetivo), actively use it to tailor the educational analysis. If missing and materially important, make a reasonable assumption and say so.

## Compliance boundaries

You may: provide educational analysis, scenario-based comparisons, theoretical portfolio structures, general tax treatment explanations, and decision-support frameworks.

You must not: claim regulatory licenses, guarantee returns, present outputs as definitive professional advice, or advise on tax evasion or noncompliance.

## Visual formatting — always apply

Make every response visually structured and easy to scan:
* Use **markdown tables** for ANY comparison between assets, scenarios, or time periods — always include one when comparing 2+ things
* Use **bold** for all key numbers, rates, final values, and conclusions
* Use ## and ### headings to section longer responses
* Use bullet lists for factors, risks, recommendations, and feature lists
* Use emojis as visual anchors when they add clarity: 📊 for data/tables, 💡 for key insight, ⚠️ for risk, ✅ for conclusion, 📈 for growth, 📉 for loss
* For return projections, always include a 3-scenario table (pessimista / base / otimista) with explicit assumptions
* For portfolio discussions, include an allocation table with % per class
* For calculations, show the formula explicitly, then the result
* End complex answers with a **Resumo rápido** table or bullet list

## Never do

* Never answer in English
* Never omit the educational disclaimer
* Never fabricate live market data — always call screen_assets for real data when building portfolios
* Never promise returns or present yourself as a licensed human professional
* Never produce shallow generic filler for serious analytical questions`

// ─── POST handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { message, session_id, messages: history } = await request.json()
  if (!message) return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })

  const { data: profile } = await supabase
    .from('investor_profiles')
    .select('profile, risk_score, allocation_renda_fixa, allocation_fii, allocation_acoes')
    .eq('user_id', user.id)
    .single()

  const profileContext = profile
    ? `\n\nContexto do usuário: Perfil ${profile.profile} (score ${profile.risk_score}/100). Alocação sugerida: ${profile.allocation_renda_fixa}% renda fixa, ${profile.allocation_fii}% FIIs, ${profile.allocation_acoes}% ações.`
    : ''

  const client = getClient()
  if (!client) {
    console.error('[chat] ANTHROPIC_API_KEY not set')
    return NextResponse.json({
      message: '⚠️ O serviço de chat não está configurado. Por favor, configure a variável de ambiente ANTHROPIC_API_KEY no painel do Vercel.',
      session_id,
      _mode: 'unconfigured',
    })
  }

  let messages: Anthropic.MessageParam[] = [
    ...(history ?? []).slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  try {
    console.log('[chat] user=', user.id, 'msg=', message.slice(0, 60))
    let finalText = ''
    let toolCallCount = 0
    const MAX_TOOL_CALLS = 3

    // Agentic loop: handle up to MAX_TOOL_CALLS tool calls
    while (true) {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: SYSTEM_PROMPT + profileContext,
        messages,
        tools: TOOLS,
      })

      console.log('[chat] stop_reason=', response.stop_reason, 'tokens=', response.usage.output_tokens)

      const hasToolUse = response.content.some(b => b.type === 'tool_use')

      if (!hasToolUse || toolCallCount >= MAX_TOOL_CALLS) {
        // Extract final text (may have both text + tool_use blocks; take all text)
        finalText = response.content
          .filter(b => b.type === 'text')
          .map(b => (b as Anthropic.TextBlock).text)
          .join('\n\n')

        if (!finalText) finalText = 'Não consegui gerar uma resposta. Tente novamente.'
        break
      }

      // Execute tool calls
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        toolCallCount++
        console.log('[chat] tool_call=', toolUse.name, 'input=', JSON.stringify(toolUse.input).slice(0, 120))

        let result: object
        if (toolUse.name === 'screen_assets') {
          result = await executeScreener(supabase, toolUse.input as Parameters<typeof executeScreener>[1])
        } else {
          result = { error: `Unknown tool: ${toolUse.name}` }
        }

        console.log('[chat] tool_result assets=', (result as any).total_found ?? '?')
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        })
      }

      // Append assistant turn + tool results and continue loop
      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ]
    }

    await saveMessages(supabase, user.id, session_id, message, finalText)
    return NextResponse.json({ message: finalText, session_id, _mode: 'claude' })
  } catch (err) {
    const errName = err instanceof Error ? err.constructor.name : 'UnknownError'
    const errMsg = err instanceof Error ? err.message : String(err)
    const errStatus = (err as any)?.status ?? null
    console.error('[chat] error:', { name: errName, message: errMsg, status: errStatus })
    return NextResponse.json({
      message: 'Erro ao processar sua mensagem. Tente novamente em instantes.',
      session_id,
      _mode: 'error',
      _error: { name: errName, message: errMsg, status: errStatus },
    })
  }
}

async function saveMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string | undefined,
  userMsg: string,
  assistantMsg: string
) {
  let sid = sessionId
  if (!sid) {
    const { data: session } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title: userMsg.slice(0, 50) })
      .select('id')
      .single()
    sid = session?.id
  }
  if (sid) {
    await supabase.from('chat_messages').insert([
      { session_id: sid, user_id: userId, role: 'user', content: userMsg },
      { session_id: sid, user_id: userId, role: 'assistant', content: assistantMsg },
    ])
  }
}
