import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 50_000 })
  return _openai
}

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

## Portfolio suggestions

Frame all portfolio suggestions as educational models: "carteira-modelo educativa", "alocação teórica", "exemplo analítico". Explain rationale, discuss tradeoffs, mention risk exposure.

## Investor profile adaptation

If the user's profile is provided (conservador/moderado/arrojado, horizonte, objetivo), actively use it to tailor the educational analysis. If missing and materially important, make a reasonable assumption and say so.

## Compliance boundaries

You may: provide educational analysis, scenario-based comparisons, theoretical portfolio structures, general tax treatment explanations, and decision-support frameworks.

You must not: claim regulatory licenses, guarantee returns, present outputs as definitive professional advice, or advise on tax evasion or noncompliance.

## Never do

* Never answer in English
* Never omit the educational disclaimer
* Never fabricate live market data — if current data is unavailable, say so and use clearly labeled assumptions
* Never promise returns or present yourself as a licensed human professional
* Never produce shallow generic filler for serious analytical questions`

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
    ? `\n\nContexto do usuário atual: Perfil ${profile.profile} (score ${profile.risk_score}/100). Alocação sugerida: ${profile.allocation_renda_fixa}% renda fixa, ${profile.allocation_fii}% FIIs, ${profile.allocation_acoes}% ações.`
    : ''

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT + profileContext },
    ...(history ?? []).slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const openai = getOpenAI()
  if (!openai) {
    console.log('[chat] OPENAI_API_KEY not set — using demo mode')
    const demoResponse = getDemoResponse(message)
    await saveMessages(supabase, user.id, session_id, message, demoResponse)
    return NextResponse.json({ message: demoResponse, session_id, _mode: 'demo' })
  }

  try {
    console.log('[chat] calling OpenAI, model=gpt-4o-mini, user=', user.id)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 900,
      temperature: 0.7,
    })

    const assistantMessage = completion.choices[0]?.message?.content ?? 'Não consegui gerar uma resposta.'
    console.log('[chat] OpenAI success, tokens=', completion.usage?.total_tokens)
    await saveMessages(supabase, user.id, session_id, message, assistantMessage)
    return NextResponse.json({ message: assistantMessage, session_id, _mode: 'openai' })
  } catch (err) {
    const errName = err instanceof Error ? err.constructor.name : 'UnknownError'
    const errMsg = err instanceof Error ? err.message : String(err)
    const errStatus = (err as any)?.status ?? null
    const errCode = (err as any)?.code ?? null
    console.error('[chat] OpenAI error:', { name: errName, message: errMsg, status: errStatus, code: errCode })

    const fallback = getDemoResponse(message)
    await saveMessages(supabase, user.id, session_id, message, fallback)
    return NextResponse.json({
      message: fallback,
      session_id,
      _mode: 'fallback',
      _error: { name: errName, message: errMsg, status: errStatus, code: errCode },
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

function getDemoResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('cdi') || lower.includes('selic')) {
    return `**CDI e Selic** são as principais taxas de referência do mercado brasileiro.\n\nA **Selic** é a taxa básica de juros definida pelo Banco Central. O **CDI** acompanha a Selic e é usado como benchmark da renda fixa.\n\n**Exemplo prático:** Um CDB a 102% do CDI com Selic em 13,75% ao ano rende ~14,0% ao ano bruto.\n\n⚠️ *Análise educativa. Não constitui recomendação de investimento.*`
  }
  if (lower.includes('fii') || lower.includes('fundo imobiliário')) {
    return `**FIIs (Fundos de Investimento Imobiliário)** são fundos negociados na B3 que investem em imóveis ou títulos imobiliários.\n\n**Tipos principais:**\n- FIIs de Tijolo: shoppings, galpões logísticos, lajes corporativas\n- FIIs de Papel: CRIs, LCIs — maior rendimento, menos imóvel físico\n- FOFs: investem em outros FIIs\n\n**Métricas-chave:** Dividend Yield (DY), P/VP, vacância física.\n\n⚠️ *Análise educativa. Não constitui recomendação de investimento.*`
  }
  if (lower.includes('ipca') || lower.includes('inflação')) {
    return `**IPCA** é o Índice de Preços ao Consumidor Amplo, o índice oficial de inflação do Brasil, medido pelo IBGE mensalmente.\n\n**Por que importa para investimentos?**\n- Tesouro IPCA+ garante retorno real (acima da inflação)\n- LCIs/LCAs e CDBs indexados ao IPCA protegem o poder de compra\n- Se seu investimento rende menos que o IPCA, você perde poder aquisitivo\n\n⚠️ *Análise educativa. Não constitui recomendação de investimento.*`
  }
  if (lower.includes('tesouro')) {
    return `**Tesouro Direto** é o programa do governo federal para venda de títulos públicos a pessoas físicas.\n\n**Principais títulos:**\n- **Tesouro Selic**: liquidez diária, ideal para reserva de emergência\n- **Tesouro IPCA+**: protege da inflação, bom para longo prazo\n- **Tesouro Prefixado**: taxa garantida, bom quando Selic está alta\n\nSão considerados os investimentos mais seguros do Brasil (risco soberano).\n\n⚠️ *Análise educativa. Não constitui recomendação de investimento.*`
  }
  if (lower.includes('ação') || lower.includes('ações') || lower.includes('ibovespa') || lower.includes('b3')) {
    return `**Ações** representam frações do capital de empresas listadas na B3.\n\n**Métricas fundamentalistas importantes:**\n- **P/L** (Preço/Lucro): quanto o mercado paga por R$1 de lucro\n- **P/VP**: preço vs. valor patrimonial\n- **DY** (Dividend Yield): dividendos sobre o preço da ação\n- **ROE**: retorno sobre patrimônio líquido\n\nO **Ibovespa** é o principal índice da B3, com ~90 empresas mais negociadas.\n\n⚠️ *Análise educativa. Não constitui recomendação de investimento.*`
  }

  return `Olá! Sou o **PatrimonIA**, seu copiloto educacional de investimentos no mercado brasileiro.\n\nPosso ajudar com:\n- 📊 Indicadores: CDI, Selic, IPCA, P/L, DY, P/VP\n- 🏢 FIIs, ações, renda fixa, Tesouro Direto\n- 💡 Análises educativas por perfil de investidor\n- 🧮 Simulações e cenários\n\nComo posso ajudar?\n\n⚠️ *Fins educativos. Não constitui recomendação individual de investimento.*`
}
