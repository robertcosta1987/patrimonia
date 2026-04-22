import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const SYSTEM_PROMPT = `Você é PatrimonIA, um copiloto educacional de investimentos para o mercado brasileiro.

Seu papel é:
- Responder em Português do Brasil, com linguagem clara, precisa e acessível
- Explicar conceitos de investimento de forma didática
- Analisar ativos, métricas e indicadores com base em dados públicos
- Ajudar o usuário a entender o mercado financeiro brasileiro
- Criar análises educativas de carteiras e alocações

Restrições importantes:
- Você NÃO é um assessor de investimentos regulamentado
- Sempre deixe claro quando falar sobre estimativas, projeções ou análises educativas
- Use frases como "análise educativa", "estimativa", "compatível com o perfil informado", "baseado em dados públicos"
- NUNCA diga "compre este ativo agora", "garantia de retorno" ou "melhor investimento para você"
- Ao discutir adequação ao perfil, adicione disclaimer sobre não constituir recomendação individual

Contexto do mercado brasileiro que você conhece bem:
- Tesouro Direto (Selic, IPCA+, Prefixado)
- Renda fixa bancária (CDB, LCI, LCA) com FGC
- Debêntures e CRIs/CRAs
- Ações da B3 (Ibovespa, análise fundamentalista)
- Fundos Imobiliários (FIIs de tijolo e papel)
- Indicadores: Selic, CDI, IPCA, IGP-M, Dólar PTAX
- Perfis de investidor: Conservador, Moderado, Arrojado

Quando o usuário perguntar sobre análise ou simulação, seja didático e mostre cálculos quando relevante.`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { message, session_id, messages: history } = await request.json()

  if (!message) return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })

  // Get investor profile for context
  const { data: profile } = await supabase
    .from('investor_profiles')
    .select('profile, risk_score, allocation_renda_fixa, allocation_fii, allocation_acoes')
    .eq('user_id', user.id)
    .single()

  const profileContext = profile
    ? `\n\nContexto do usuário atual: Perfil ${profile.profile} (score ${profile.risk_score}/100). Alocação sugerida: ${profile.allocation_renda_fixa}% renda fixa, ${profile.allocation_fii}% FIIs, ${profile.allocation_acoes}% ações.`
    : ''

  const systemWithContext = SYSTEM_PROMPT + profileContext

  // Build messages array for OpenAI
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemWithContext },
    ...(history ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const openai = getOpenAI()
  if (!openai) {
    // Demo mode without OpenAI key
    const demoResponse = getDemoResponse(message)
    await saveMessages(supabase, user.id, session_id, message, demoResponse)
    return NextResponse.json({ message: demoResponse, session_id })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 1500,
      temperature: 0.7,
    })

    const assistantMessage = completion.choices[0]?.message?.content ?? 'Não consegui gerar uma resposta.'
    await saveMessages(supabase, user.id, session_id, message, assistantMessage)
    return NextResponse.json({ message: assistantMessage, session_id })
  } catch (err) {
    console.error('OpenAI error:', err)
    const fallback = 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em instantes.'
    return NextResponse.json({ message: fallback }, { status: 200 })
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
    return `**CDI e Selic** são as principais taxas de referência do mercado brasileiro.

A **Selic** é a taxa básica de juros definida pelo Banco Central, atualmente em 13,75% ao ano. Ela serve como âncora da política monetária.

O **CDI** (Certificado de Depósito Interbancário) é uma taxa próxima à Selic, usada nas operações entre bancos. Atualmente em ~13,65% ao ano.

**Por que importam?**
- São o benchmark da renda fixa brasileira
- Um CDB "102% do CDI" rende 102% × 13,65% = ~13,93% ao ano
- O Tesouro Selic segue a taxa Selic com liquidez diária

⚠️ *Esta é uma análise educativa baseada em dados públicos. Não constitui recomendação individual de investimento.*`
  }

  if (lower.includes('fii') || lower.includes('fundo imobiliário')) {
    return `**Fundos de Investimento Imobiliário (FIIs)** são uma forma de investir em imóveis de forma fracionada na B3.

**Principais tipos:**
- **FIIs de Tijolo**: Investem em imóveis físicos (shoppings, logística, lajes corporativas, hospitais)
- **FIIs de Papel**: Investem em títulos do mercado imobiliário (CRIs, LCIs)
- **Fundo de Fundos (FOFs)**: Investem em cotas de outros FIIs

**Métricas importantes:**
- **Dividend Yield (DY)**: Rendimento pago em relação ao preço da cota
- **P/VP**: Preço da cota / Valor Patrimonial — abaixo de 1 indica desconto
- **Vacância**: % de imóveis sem inquilinos (menor = melhor)

**Vantagens educativas observadas:** Rendimentos mensais isentos de IR para pessoa física (nas condições da lei).

⚠️ *Análise educativa. FIIs possuem riscos de mercado, vacância e liquidez. Não constitui recomendação de investimento.*`
  }

  return `Olá! Sou o **PatrimonIA**, seu copiloto educacional de investimentos.

Posso ajudar você com:
- 📊 Explicar indicadores como CDI, Selic, IPCA, P/L, DY
- 🏢 Analisar FIIs, ações e renda fixa de forma educativa
- 💡 Criar análises educativas de carteiras por perfil
- 🧮 Simular cenários de investimento
- 📖 Esclarecer dúvidas sobre o mercado brasileiro

Como posso ajudar hoje?

⚠️ *Esta plataforma tem fins educativos e analíticos. As informações não constituem recomendação individual de investimento.*`
}
