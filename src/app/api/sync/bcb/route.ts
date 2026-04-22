import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { bcbProvider } from '@/lib/providers/bcb'

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET_KEY
  const auth = req.headers.get('authorization')
  const xSync = req.headers.get('x-sync-secret')
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  if (syncSecret && xSync === syncSecret) return true
  return false
}

const SERIES_META: Record<number, { name: string; label: string; unit: string }> = {
  432:   { name: 'selic_meta',   label: 'Selic Meta',       unit: '% a.a.' },
  11:    { name: 'selic_over',   label: 'Selic Over',       unit: '% a.a.' },
  12:    { name: 'cdi',          label: 'CDI',              unit: '% a.a.' },
  433:   { name: 'ipca_mensal',  label: 'IPCA Mensal',      unit: '%' },
  13522: { name: 'ipca_12m',     label: 'IPCA 12 Meses',    unit: '%' },
  189:   { name: 'igpm_mensal',  label: 'IGP-M Mensal',     unit: '%' },
  1:     { name: 'dolar_ptax',   label: 'Dólar (PTAX)',     unit: 'R$' },
  21619: { name: 'euro',         label: 'Euro',             unit: 'R$' },
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const supabase = await createServiceClient()

  try {
    const result = await bcbProvider.fetchLatestIndicators()
    if (!result.data?.length) throw new Error('No data returned from BCB')

    const rows = result.data
      .filter(serie => SERIES_META[serie.id])
      .map(serie => ({
        name: SERIES_META[serie.id].name,
        label: SERIES_META[serie.id].label,
        value: serie.valor,
        unit: SERIES_META[serie.id].unit,
        reference_date: serie.data,
        source: result.is_mock ? 'mock' : 'bcb_sgs',
        fetched_at: new Date().toISOString(),
      }))

    // Upsert on composite unique key (name, reference_date)
    const { error } = await supabase
      .from('macro_indicators')
      .upsert(rows, { onConflict: 'name,reference_date' })

    if (error) throw error

    const duration = Date.now() - startedAt.getTime()
    await supabase.from('data_sync_runs').insert({
      source_name: 'bcb',
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
      source_name: 'bcb',
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
