import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { profile, reasoning, expectedReturn, riskLevel, allocation, tickers } = body

  if (!tickers || tickers.length === 0)
    return NextResponse.json({ error: 'Carteira inválida' }, { status: 400 })

  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const name = `Carteira ${profile ?? 'IA'} — ${dateStr}`

  const { data, error } = await supabase
    .from('generated_portfolios')
    .insert({
      user_id: user.id,
      name,
      profile,
      reasoning,
      expected_return: expectedReturn,
      risk_level: riskLevel,
      allocation,
      tickers,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[portfolio/save]', error)
    return NextResponse.json({ error: 'Falha ao salvar carteira' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, name })
}
