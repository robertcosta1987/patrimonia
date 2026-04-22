import { NextRequest, NextResponse } from 'next/server'

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET_KEY
  const auth = req.headers.get('authorization')
  const xSync = req.headers.get('x-sync-secret')
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  if (syncSecret && xSync === syncSecret) return true
  return false
}

async function callSync(baseUrl: string, path: string, authHeader: string | null, syncSecret: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authHeader) headers['authorization'] = authHeader
  if (syncSecret) headers['x-sync-secret'] = syncSecret

  const res = await fetch(`${baseUrl}${path}`, { method: 'GET', headers })
  return res.ok ? await res.json() : { error: await res.text() }
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const authHeader = req.headers.get('authorization')
  const syncSecret = req.headers.get('x-sync-secret')

  const [bcb, b3, tesouro, rendaFixa] = await Promise.allSettled([
    callSync(baseUrl, '/api/sync/bcb', authHeader, syncSecret),
    callSync(baseUrl, '/api/sync/b3', authHeader, syncSecret),
    callSync(baseUrl, '/api/sync/tesouro', authHeader, syncSecret),
    callSync(baseUrl, '/api/sync/renda-fixa', authHeader, syncSecret),
  ])

  const results = {
    bcb: bcb.status === 'fulfilled' ? bcb.value : { error: bcb.reason },
    b3: b3.status === 'fulfilled' ? b3.value : { error: b3.reason },
    tesouro: tesouro.status === 'fulfilled' ? tesouro.value : { error: tesouro.reason },
    renda_fixa: rendaFixa.status === 'fulfilled' ? rendaFixa.value : { error: rendaFixa.reason },
  }

  const hasErrors = Object.values(results).some(r => r?.error)
  return NextResponse.json({ success: !hasErrors, results }, { status: hasErrors ? 207 : 200 })
}

export const GET = run
export const POST = run
