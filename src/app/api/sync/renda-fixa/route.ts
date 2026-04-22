import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { rendaFixaProvider } from '@/lib/providers/renda-fixa'
import { calculateRendaFixaScore, calculateDebentureScore } from '@/lib/analytics/score-calculator'

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
    const [rfResult, debResult] = await Promise.all([
      rendaFixaProvider.fetchRendaFixa(),
      rendaFixaProvider.fetchDebentures(),
    ])

    // Renda Fixa: delete and reinsert (no unique constraint)
    await supabase.from('renda_fixa_offers').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const rfRows = (rfResult.data ?? []).map(offer => ({
      asset_type: offer.asset_type,
      institution: offer.institution,
      indexer: offer.indexer,
      rate: offer.rate,
      rate_pct_cdi: offer.rate_pct_cdi ?? null,
      maturity_date: offer.maturity_date,
      min_investment: offer.min_investment,
      liquidity: offer.liquidity,
      has_fgc: offer.has_fgc,
      is_available: offer.is_available,
      score: calculateRendaFixaScore(offer),
      source: 'mock',
      updated_at: new Date().toISOString(),
    }))

    const { error: rfError } = await supabase.from('renda_fixa_offers').insert(rfRows)
    if (rfError) throw rfError

    // Debentures: upsert on ticker
    const debRows = (debResult.data ?? []).map(deb => ({
      ticker: deb.ticker,
      issuer: deb.issuer,
      indexer: deb.indexer,
      rate: deb.rate,
      maturity_date: deb.maturity_date,
      rating: deb.rating ?? null,
      avg_volume: deb.avg_volume ?? null,
      estimated_risk: deb.estimated_risk,
      is_available: true,
      score: calculateDebentureScore(deb),
      source: 'mock',
      updated_at: new Date().toISOString(),
    }))

    const { error: debError } = await supabase
      .from('debenture_offers')
      .upsert(debRows, { onConflict: 'ticker' })
    if (debError) throw debError

    const total = rfRows.length + debRows.length
    const duration = Date.now() - startedAt.getTime()

    await supabase.from('data_sync_runs').insert({
      source_name: 'renda_fixa',
      status: 'success',
      records_fetched: total,
      records_inserted: total,
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: duration,
    })

    return NextResponse.json({ success: true, renda_fixa: rfRows.length, debentures: debRows.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try { await supabase.from('data_sync_runs').insert({
      source_name: 'renda_fixa',
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
