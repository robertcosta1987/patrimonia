import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { b3Provider } from '@/lib/providers/b3'
import { calculateAcaoScore, calculateFiiScore } from '@/lib/analytics/score-calculator'
import { AcaoMetrics, FiiMetrics } from '@/types'

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET_KEY
  const auth = req.headers.get('authorization')
  const xSync = req.headers.get('x-sync-secret')
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  if (syncSecret && xSync === syncSecret) return true
  return false
}

async function upsertAsset(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  ticker: string,
  name: string,
  assetClass: 'acao' | 'fii',
  extra: Record<string, string | null>
): Promise<string | null> {
  const { data, error } = await supabase
    .from('assets')
    .upsert({
      ticker,
      name,
      asset_class: assetClass,
      is_active: true,
      updated_at: new Date().toISOString(),
      ...extra,
    }, { onConflict: 'ticker' })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id
}

async function syncAcoes(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  acoes: AcaoMetrics[]
): Promise<number> {
  let inserted = 0
  const now = new Date().toISOString()

  for (const acao of acoes) {
    const assetId = await upsertAsset(supabase, acao.ticker, acao.name, 'acao', {
      sector: null,
      segment: null,
    })
    if (!assetId) continue

    // Insert price record
    await supabase.from('asset_prices').insert({
      asset_id: assetId,
      price: acao.price,
      change_pct: acao.change_pct,
      volume: acao.avg_volume,
      source: 'brapi',
      source_timestamp: now,
      ingested_at: now,
    })

    // Calculate score and upsert metrics
    const score = calculateAcaoScore(acao)
    await supabase.from('asset_metrics').upsert({
      asset_id: assetId,
      pl: acao.pl ?? null,
      pvp: acao.pvp ?? null,
      dividend_yield: acao.dividend_yield ?? null,
      roe: acao.roe ?? null,
      debt_equity: acao.debt_equity ?? null,
      revenue_growth: acao.revenue_growth ?? null,
      volatility: acao.volatility ?? null,
      avg_volume: acao.avg_volume ?? null,
      market_cap: acao.market_cap ?? null,
      score,
      updated_at: now,
    }, { onConflict: 'asset_id' })

    inserted++
  }

  return inserted
}

async function syncFiis(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  fiis: FiiMetrics[]
): Promise<number> {
  let inserted = 0
  const now = new Date().toISOString()

  for (const fii of fiis) {
    const assetId = await upsertAsset(supabase, fii.ticker, fii.name, 'fii', {
      segment: fii.segment ?? null,
      sector: null,
    })
    if (!assetId) continue

    await supabase.from('asset_prices').insert({
      asset_id: assetId,
      price: fii.price,
      change_pct: fii.change_pct,
      volume: fii.avg_volume,
      source: 'brapi',
      source_timestamp: now,
      ingested_at: now,
    })

    const score = calculateFiiScore(fii)
    await supabase.from('asset_metrics').upsert({
      asset_id: assetId,
      pvp: fii.pvp ?? null,
      dividend_yield: fii.dividend_yield ?? null,
      vacancy_rate: fii.vacancy_rate ?? null,
      avg_volume: fii.avg_volume ?? null,
      net_worth: fii.net_worth ?? null,
      score,
      updated_at: now,
    }, { onConflict: 'asset_id' })

    inserted++
  }

  return inserted
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const supabase = await createServiceClient()

  try {
    const [acoes, fiis] = await Promise.all([b3Provider.fetchAcoes(), b3Provider.fetchFiis()])

    const [acoesInserted, fiisInserted] = await Promise.all([
      syncAcoes(supabase, acoes),
      syncFiis(supabase, fiis),
    ])

    const total = acoesInserted + fiisInserted
    const duration = Date.now() - startedAt.getTime()

    await supabase.from('data_sync_runs').insert({
      source_name: 'b3',
      status: 'success',
      records_fetched: acoes.length + fiis.length,
      records_inserted: total,
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: duration,
    })

    return NextResponse.json({
      success: true,
      acoes: acoesInserted,
      fiis: fiisInserted,
      total,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try { await supabase.from('data_sync_runs').insert({
      source_name: 'b3',
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
