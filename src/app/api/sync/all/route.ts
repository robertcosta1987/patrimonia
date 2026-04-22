import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { bcbProvider } from '@/lib/providers/bcb'
import { b3Provider } from '@/lib/providers/b3'
import { tesouroProvider } from '@/lib/providers/tesouro'
import { rendaFixaProvider } from '@/lib/providers/renda-fixa'
import { calculateAcaoScore, calculateFiiScore, calculateRendaFixaScore, calculateDebentureScore } from '@/lib/analytics/score-calculator'

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET_KEY
  const auth = req.headers.get('authorization')
  const xSync = req.headers.get('x-sync-secret')
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  if (syncSecret && xSync === syncSecret) return true
  return false
}

const BCB_SERIES_META: Record<number, { name: string; label: string; unit: string }> = {
  432:   { name: 'selic_meta',  label: 'Selic Meta',    unit: '% a.a.' },
  11:    { name: 'selic_over',  label: 'Selic Over',    unit: '% a.a.' },
  12:    { name: 'cdi',         label: 'CDI',           unit: '% a.a.' },
  433:   { name: 'ipca_mensal', label: 'IPCA Mensal',   unit: '%' },
  13522: { name: 'ipca_12m',    label: 'IPCA 12 Meses', unit: '%' },
  189:   { name: 'igpm_mensal', label: 'IGP-M Mensal',  unit: '%' },
  1:     { name: 'dolar_ptax',  label: 'Dólar (PTAX)',  unit: 'R$' },
  21619: { name: 'euro',        label: 'Euro',          unit: 'R$' },
}

async function syncBcb(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const result = await bcbProvider.fetchLatestIndicators()
  if (!result.data?.length) throw new Error('No BCB data')

  const rows = result.data
    .filter(s => BCB_SERIES_META[s.id])
    .map(s => ({
      name: BCB_SERIES_META[s.id].name,
      label: BCB_SERIES_META[s.id].label,
      value: s.valor,
      unit: BCB_SERIES_META[s.id].unit,
      reference_date: s.data,
      source: result.is_mock ? 'mock' : 'bcb_sgs',
      fetched_at: new Date().toISOString(),
    }))

  const { error } = await supabase.from('macro_indicators').upsert(rows, { onConflict: 'name,reference_date' })
  if (error) throw error
  return { records: rows.length, is_mock: result.is_mock }
}

async function syncB3(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const [acoes, fiis] = await Promise.all([b3Provider.fetchAcoes(), b3Provider.fetchFiis()])
  const now = new Date().toISOString()
  let inserted = 0

  async function upsertAsset(ticker: string, name: string, assetClass: string, extra: Record<string, string | null>) {
    const { data } = await supabase
      .from('assets')
      .upsert({ ticker, name, asset_class: assetClass, is_active: true, updated_at: now, ...extra }, { onConflict: 'ticker' })
      .select('id')
      .single()
    return data?.id as string | null
  }

  for (const acao of acoes) {
    const assetId = await upsertAsset(acao.ticker, acao.name, 'acao', { sector: null, segment: null })
    if (!assetId) continue
    await supabase.from('asset_prices').insert({ asset_id: assetId, price: acao.price, change_pct: acao.change_pct, volume: acao.avg_volume, source: 'brapi', source_timestamp: now, ingested_at: now })
    await supabase.from('asset_metrics').upsert({ asset_id: assetId, pl: acao.pl ?? null, pvp: acao.pvp ?? null, dividend_yield: acao.dividend_yield ?? null, roe: acao.roe ?? null, debt_equity: acao.debt_equity ?? null, revenue_growth: acao.revenue_growth ?? null, volatility: acao.volatility ?? null, avg_volume: acao.avg_volume ?? null, market_cap: acao.market_cap ?? null, score: calculateAcaoScore(acao), updated_at: now }, { onConflict: 'asset_id' })
    inserted++
  }

  for (const fii of fiis) {
    const assetId = await upsertAsset(fii.ticker, fii.name, 'fii', { segment: fii.segment ?? null, sector: null })
    if (!assetId) continue
    await supabase.from('asset_prices').insert({ asset_id: assetId, price: fii.price, change_pct: fii.change_pct, volume: fii.avg_volume, source: 'brapi', source_timestamp: now, ingested_at: now })
    await supabase.from('asset_metrics').upsert({ asset_id: assetId, pvp: fii.pvp ?? null, dividend_yield: fii.dividend_yield ?? null, vacancy_rate: fii.vacancy_rate ?? null, avg_volume: fii.avg_volume ?? null, net_worth: fii.net_worth ?? null, score: calculateFiiScore(fii), updated_at: now }, { onConflict: 'asset_id' })
    inserted++
  }

  return { acoes: acoes.length, fiis: fiis.length, inserted }
}

async function syncTesouro(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const result = await tesouroProvider.fetchOffers()
  if (!result.data?.length) throw new Error('No tesouro data')

  await supabase.from('tesouro_offers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const rows = result.data.map(o => ({ title_type: o.title_type, maturity_date: o.maturity_date, indexer: o.indexer, rate: o.rate, min_investment: o.min_investment, price: o.price ?? null, liquidity: o.liquidity, is_available: o.is_available, source: result.is_mock ? 'mock' : 'tesouro_direto', updated_at: new Date().toISOString() }))
  const { error } = await supabase.from('tesouro_offers').insert(rows)
  if (error) throw error
  return { records: rows.length, is_mock: result.is_mock }
}

async function syncRendaFixa(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const [rfResult, debResult] = await Promise.all([rendaFixaProvider.fetchRendaFixa(), rendaFixaProvider.fetchDebentures()])

  await supabase.from('renda_fixa_offers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const rfRows = (rfResult.data ?? []).map(o => ({ asset_type: o.asset_type, institution: o.institution, indexer: o.indexer, rate: o.rate, rate_pct_cdi: o.rate_pct_cdi ?? null, maturity_date: o.maturity_date, min_investment: o.min_investment, liquidity: o.liquidity, has_fgc: o.has_fgc, is_available: o.is_available, score: calculateRendaFixaScore(o), source: 'mock', updated_at: new Date().toISOString() }))
  const { error: rfErr } = await supabase.from('renda_fixa_offers').insert(rfRows)
  if (rfErr) throw rfErr

  const debRows = (debResult.data ?? []).map(d => ({ ticker: d.ticker, issuer: d.issuer, indexer: d.indexer, rate: d.rate, maturity_date: d.maturity_date, rating: d.rating ?? null, avg_volume: d.avg_volume ?? null, estimated_risk: d.estimated_risk, is_available: true, score: calculateDebentureScore(d), source: 'mock', updated_at: new Date().toISOString() }))
  const { error: debErr } = await supabase.from('debenture_offers').upsert(debRows, { onConflict: 'ticker' })
  if (debErr) throw debErr

  return { renda_fixa: rfRows.length, debentures: debRows.length }
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = await createServiceClient()

  const results: Record<string, unknown> = {}
  let hasErrors = false

  for (const [name, fn] of [
    ['bcb', () => syncBcb(supabase)],
    ['b3', () => syncB3(supabase)],
    ['tesouro', () => syncTesouro(supabase)],
    ['renda_fixa', () => syncRendaFixa(supabase)],
  ] as const) {
    try {
      results[name] = { success: true, ...(await fn()) }
      await supabase.from('data_sync_runs').insert({ source_name: name, status: 'success', records_fetched: 0, records_inserted: 0, started_at: new Date(startedAt).toISOString(), finished_at: new Date().toISOString(), duration_ms: Date.now() - startedAt })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results[name] = { success: false, error: msg }
      hasErrors = true
      await supabase.from('data_sync_runs').insert({ source_name: name, status: 'error', records_fetched: 0, records_inserted: 0, error_message: msg, started_at: new Date(startedAt).toISOString(), finished_at: new Date().toISOString(), duration_ms: Date.now() - startedAt })
    }
  }

  return NextResponse.json({ success: !hasErrors, duration_ms: Date.now() - startedAt, results }, { status: hasErrors ? 207 : 200 })
}

export const GET = run
export const POST = run
