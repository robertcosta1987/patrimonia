import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { answers, strategy, caseType } = await request.json()
  if (!strategy) return NextResponse.json({ error: 'Estratégia inválida' }, { status: 400 })

  const { error } = await supabase
    .from('user_strategies')
    .upsert({
      user_id: user.id,
      answers,
      strategy,
      case_type: caseType,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('[estrategia/save]', error)
    return NextResponse.json({ error: 'Falha ao salvar estratégia' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabase
    .from('user_strategies')
    .select('answers, strategy, case_type, updated_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ saved: data ?? null })
}
