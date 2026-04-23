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

type ComfortLevel = 'comfortable' | 'curious' | 'unfamiliar'

interface UserAnswers {
  categories: {
    rendaFixa: ComfortLevel
    fiis: ComfortLevel
    acoes: ComfortLevel
    fundos: ComfortLevel
    cripto: ComfortLevel
    internacional: ComfortLevel
  }
  objetivo: 'crescimento' | 'renda_passiva' | 'preservacao'
  horizonte: 'curto' | 'medio' | 'longo'
  risco: 'baixa' | 'media' | 'alta'
}

function determineCase(answers: UserAnswers): 'A' | 'B' | 'C' {
  const values = Object.values(answers.categories)
  const comfortable = values.filter(v => v === 'comfortable').length
  const curious = values.filter(v => v === 'curious').length
  if (comfortable >= 3) return 'A'
  if (comfortable >= 1 || curious >= 2) return 'B'
  return 'C'
}

const CATEGORY_LABELS: Record<string, string> = {
  rendaFixa: 'Renda Fixa (Tesouro, CDB, LCI/LCA)',
  fiis: 'Fundos Imobiliários (FIIs)',
  acoes: 'Ações (Bolsa B3)',
  fundos: 'Fundos de Investimento',
  cripto: 'Criptomoedas',
  internacional: 'Investimentos Internacionais',
}

const OBJETIVO_LABELS: Record<string, string> = {
  crescimento: 'Crescimento de patrimônio',
  renda_passiva: 'Geração de renda passiva',
  preservacao: 'Preservação de capital',
}

const HORIZONTE_LABELS: Record<string, string> = {
  curto: 'Curto prazo (até 2 anos)',
  medio: 'Médio prazo (2 a 5 anos)',
  longo: 'Longo prazo (acima de 5 anos)',
}

const RISCO_LABELS: Record<string, string> = {
  baixa: 'Baixa — prefiro segurança mesmo com menos retorno',
  media: 'Média — aceito alguma volatilidade por mais retorno',
  alta: 'Alta — foco em maximizar retorno no longo prazo',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'Serviço não configurado' }, { status: 500 })

  const answers: UserAnswers = await request.json()

  const caseType = determineCase(answers)

  // Fetch user profile for extra context
  const { data: profile } = await supabase
    .from('investor_profiles')
    .select('profile, risk_score')
    .eq('user_id', user.id)
    .single()

  const profileContext = profile
    ? `Perfil de risco do investidor: ${profile.profile} (score ${profile.risk_score}/100).`
    : ''

  const categoryLines = Object.entries(answers.categories)
    .map(([key, val]) => {
      const label = CATEGORY_LABELS[key] ?? key
      const status = val === 'comfortable' ? 'Conheço bem e me sinto confortável'
        : val === 'curious' ? 'Conheço pouco, mas tenho interesse'
        : 'Não conheço / não me sinto confortável'
      return `- ${label}: ${status}`
    })
    .join('\n')

  const caseInstructions = {
    A: `CASO A — ESTRATÉGIA PERSONALIZADA CONFIANTE
O usuário conhece bem múltiplas classes. Use SOMENTE as classes em que ele está confortável.
Construa uma estratégia sofisticada com alocação otimizada, rationale por classe, e comportamento esperado da carteira.
O array "alocacao" deve conter apenas classes com comfort="comfortable". Tipo de cada item: "base".`,

    B: `CASO B — ESTRATÉGIA HÍBRIDA
O usuário conhece algumas classes. Use as familares como base sólida e introduza exposição pequena (10-15%) às classes de interesse.
Rotule claramente: tipo "base" para o núcleo familiar, tipo "exploracao" para as novas.
Explique cada parte com linguagem acessível, deixando claro o propósito de cada bloco.`,

    C: `CASO C — ESTRATÉGIA EDUCATIVA/SUGESTIVA
O usuário tem pouco conhecimento. Priorize segurança e clareza.
Comece com Renda Fixa (Tesouro Selic, CDB) como base. Introduza no máximo 1-2 classes simples de forma gradual.
Use linguagem muito simples, analogias do cotidiano, sem jargão técnico.
Inclua um "roadmapAprendizado" com 4-5 passos do que aprender primeiro.
Tipo de cada item: "educativo".`,
  }[caseType]

  const prompt = `Você é um consultor financeiro sênior especializado no mercado brasileiro. Data: Abril de 2026.
${profileContext}

PERFIL DO USUÁRIO:
Familiaridade com investimentos:
${categoryLines}
Objetivo: ${OBJETIVO_LABELS[answers.objetivo] ?? answers.objetivo}
Horizonte: ${HORIZONTE_LABELS[answers.horizonte] ?? answers.horizonte}
Tolerância a risco: ${RISCO_LABELS[answers.risco] ?? answers.risco}

TIPO DE ESTRATÉGIA A CONSTRUIR:
${caseInstructions}

Responda SOMENTE com JSON válido (sem markdown, sem texto fora do JSON):
{
  "caseType": "${caseType}",
  "titulo": "Nome criativo da estratégia em português",
  "tagline": "Subtítulo de uma linha que resume a filosofia",
  "resumoExecutivo": "Parágrafo de 3-4 frases explicando a estratégia, por que ela serve a este perfil, e o que o usuário pode esperar",
  "alocacao": [
    {
      "categoria": "Nome da classe de ativo",
      "percentual": 35,
      "tipo": "base",
      "exemplos": ["Tesouro Selic", "CDB 110% CDI"],
      "rationale": "Por que esta alocação, em 1-2 frases simples",
      "comportamento": "volatilidade/liquidez/renda — em uma frase"
    }
  ],
  "comportamentoGeral": "Como a carteira se comporta no geral — volatilidade esperada, tipo de retorno, em 2-3 frases",
  "proximosPassos": [
    "Passo 1 concreto e acionável",
    "Passo 2",
    "Passo 3",
    "Passo 4"
  ],
  "roadmapAprendizado": ${caseType === 'C' ? '["O que aprender primeiro", "Segundo tema", "Terceiro", "Quarto", "Quinto"]' : 'null'},
  "alertas": ["Risco ou ponto de atenção importante 1", "Ponto de atenção 2"]
}

REGRAS:
- alocacao: percentuais somam exatamente 100
- português brasileiro claro e profissional
- roadmapAprendizado: preencher apenas para CASO C, null para os demais
- alertas: 2 pontos de atenção relevantes para este perfil`

  const client = new Anthropic({ apiKey: key })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  console.log('[estrategia] stop_reason=', response.stop_reason, 'tokens=', response.usage.output_tokens)

  const extracted = extractJSON(text)
  let strategy: any
  try {
    strategy = JSON.parse(extracted)
  } catch (e) {
    console.error('[estrategia] parse error:', String(e), '| raw[:400]:', text.slice(0, 400))
    return NextResponse.json({ error: 'Falha ao gerar estratégia. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ strategy, caseType })
}
