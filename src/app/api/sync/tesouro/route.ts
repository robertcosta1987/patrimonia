import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { tesouroProvider } from '@/lib/providers/tesouro'

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET_KEY
  const auth = req.headers.get('authorization')
  const xSync = req.headers.get('x-sync-secret')
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  if (syncSecret && xSync === syncSecret) return true
  return false
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const supabase = await createServiceClient()

  try {
    const result = await tesouroProvider.fetchOffers()
    if (!result.data?.length) throw new Error('No tesouro offers returned')

    // Delete existing and reinsert (no unique key constraint beyond id)
    await supabase.from('tesouro_offers').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const rows = result.data.map(offer => ({
      title_type: offer.title_type,
      maturity_date: offer.maturity_date,
      indexer: offer.indexer,
      rate: offer.rate,
      min_investment: offer.min_investment,
      price: offer.price ?? null,
      liquidity: offer.liquidity,
      is_available: offer.is_available,
      source: result.is_mock ? 'mock' : 'tesouro_direto',
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('tesouro_offers').insert(rows)
    if (error) throw error

    const duration = Date.now() - startedAt.getTime()
    await supabase.from('data_sync_runs').insert({
      source_name: 'tesouro',
      status: 'success',
      records_fetched: result.data.length,
      records_inserted: rows.length,
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: duration,
    })

    return NextResponse.json({ success: true, records: rows.length, is_mock: result.is_mock })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try { await supabase.from('data_sync_runs').insert({
      source_name: 'tesouro',
      status: 'error',
      records_fetched: 0,
      records_inserted: 0,
      error_message: msg,
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt.getTime(),
    }) } catch {}
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const GET = run
export const POST = run
