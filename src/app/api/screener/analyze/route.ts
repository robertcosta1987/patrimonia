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

  const { assets, filters } = await request.json()
  if (!assets || assets.length === 0) {
    return NextResponse.json({ error: 'Nenhum ativo para analisar' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey: key })

  const prompt = `Você é um analista quantitativo especializado no mercado brasileiro. Data: Abril 2025.

O usuário aplicou os seguintes filtros no screener:
${JSON.stringify(filters, null, 2)}

Os seguintes ${assets.length} ativos passaram pelos filtros:
${JSON.stringify(assets, null, 2)}

Analise estes ativos filtrados e responda APENAS com JSON válido (sem markdown):
{
  "summary": "Resumo da análise em 2-3 frases",
  "topPicks": [
    {
      "ticker": "TICKER",
      "reason": "Por que este ativo se destaca entre os filtrados (1-2 frases)",
      "strengths": ["ponto forte 1", "ponto forte 2"],
      "risks": ["risco 1"],
      "expectedReturn": "ex: '12-15% a.a.'"
    }
  ],
  "insights": [
    "Insight sobre o conjunto de ativos filtrados 1",
    "Insight 2",
    "Insight 3"
  ],
  "sectorAnalysis": "Análise do contexto setorial e macro relevante para estes ativos",
  "portfolioSuggestion": "Como estes ativos poderiam compor uma carteira diversificada (2-3 frases)"
}

REGRAS:
- Selecione no máximo 5 top picks ordenados por atratividade
- Base a análise nos dados fornecidos, não em suposições
- Seja específico e cite métricas concretas
- Todo o conteúdo em Português brasileiro`

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
    console.error('[screener-analyze] JSON parse error, raw:', text.slice(0, 300))
    return NextResponse.json({ error: 'Falha ao processar resposta da IA.' }, { status: 500 })
  }
}
