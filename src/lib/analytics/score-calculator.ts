import { AcaoMetrics, FiiMetrics, RendaFixaOffer, DebentureOffer } from '@/types'

// Educational analytical score — not a regulated recommendation
// Scores weight multiple factors and produce a 0-100 range composite

interface ScoreFactors {
  valuation: number    // 0-100
  income: number       // 0-100
  quality: number      // 0-100
  growth: number       // 0-100
  risk: number         // 0-100 (higher = lower risk)
  liquidity: number    // 0-100
}

function weightedScore(factors: ScoreFactors, weights: Record<keyof ScoreFactors, number>): number {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  const raw = Object.entries(factors).reduce((acc, [key, val]) => {
    return acc + val * (weights[key as keyof ScoreFactors] / total)
  }, 0)
  return Math.max(0, Math.min(100, Math.round(raw)))
}

function normalizeToRange(value: number, min: number, max: number, invert = false): number {
  if (max === min) return 50
  const normalized = ((value - min) / (max - min)) * 100
  return invert ? 100 - Math.max(0, Math.min(100, normalized)) : Math.max(0, Math.min(100, normalized))
}

export function calculateAcaoScore(acao: Partial<AcaoMetrics>): number {
  const valuation = (() => {
    const plScore = acao.pl != null ? normalizeToRange(acao.pl, 4, 40, true) : 50
    const pvpScore = acao.pvp != null ? normalizeToRange(acao.pvp, 0.5, 5, true) : 50
    return (plScore + pvpScore) / 2
  })()

  const income = acao.dividend_yield != null
    ? normalizeToRange(acao.dividend_yield, 0, 20)
    : 30

  const quality = acao.roe != null
    ? normalizeToRange(acao.roe, -10, 40)
    : 50

  const growth = acao.revenue_growth != null
    ? normalizeToRange(acao.revenue_growth, -20, 30)
    : 50

  const riskScore = (() => {
    const volScore = acao.volatility != null
      ? normalizeToRange(acao.volatility, 10, 70, true)
      : 50
    const debtScore = acao.debt_equity != null
      ? normalizeToRange(acao.debt_equity, 0, 4, true)
      : 60
    return (volScore + debtScore) / 2
  })()

  const liquidity = acao.avg_volume != null
    ? normalizeToRange(Math.log10(acao.avg_volume + 1), 4, 9)
    : 50

  return weightedScore(
    { valuation, income, quality, growth, risk: riskScore, liquidity },
    { valuation: 20, income: 20, quality: 20, growth: 15, risk: 15, liquidity: 10 }
  )
}

export function calculateFiiScore(fii: Partial<FiiMetrics>): number {
  const valuation = fii.pvp != null
    ? normalizeToRange(fii.pvp, 0.5, 1.5, true)
    : 50

  const income = fii.dividend_yield != null
    ? normalizeToRange(fii.dividend_yield, 6, 18)
    : 50

  const quality = fii.vacancy_rate != null
    ? normalizeToRange(fii.vacancy_rate, 0, 30, true)
    : 60

  const liquidity = fii.avg_volume != null
    ? normalizeToRange(Math.log10(fii.avg_volume + 1), 4, 8)
    : 50

  return weightedScore(
    { valuation, income, quality, growth: 50, risk: 60, liquidity },
    { valuation: 25, income: 30, quality: 20, growth: 0, risk: 0, liquidity: 25 }
  )
}

export function calculateRendaFixaScore(offer: RendaFixaOffer): number {
  const CDI_RATE = 13.65

  const income = (() => {
    if (offer.indexer === 'CDI' && offer.rate_pct_cdi) {
      return normalizeToRange(offer.rate_pct_cdi, 85, 130)
    }
    if (offer.indexer === 'IPCA') {
      return normalizeToRange(offer.rate, 4, 9)
    }
    if (offer.indexer === 'prefixado') {
      return normalizeToRange(offer.rate, 10, 16)
    }
    return 60
  })()

  const fgcScore = offer.has_fgc ? 100 : 40
  const liquidityScore = offer.liquidity === 'diaria' ? 90 : offer.liquidity === 'prazo' ? 60 : 40

  return weightedScore(
    { valuation: income, income, quality: fgcScore, growth: 50, risk: fgcScore, liquidity: liquidityScore },
    { valuation: 30, income: 30, quality: 20, growth: 0, risk: 10, liquidity: 10 }
  )
}

export function calculateDebentureScore(deb: DebentureOffer): number {
  const ratingMap: Record<string, number> = {
    'AAA': 100, 'AA+': 92, 'AA': 88, 'AA-': 84,
    'A+': 78, 'A': 72, 'A-': 68,
    'BBB+': 62, 'BBB': 55, 'BBB-': 48,
    'BB+': 40, 'BB': 32, 'BB-': 24, 'B': 16,
  }

  const ratingScore = deb.rating ? (ratingMap[deb.rating] ?? 50) : 50
  const riskScore = deb.estimated_risk === 'baixo' ? 90 : deb.estimated_risk === 'medio' ? 60 : 30

  const income = (() => {
    if (deb.indexer === 'CDI') return normalizeToRange(deb.rate, 0.5, 4)
    if (deb.indexer === 'IPCA') return normalizeToRange(deb.rate, 3, 9)
    return 60
  })()

  const liquidity = deb.avg_volume != null
    ? normalizeToRange(Math.log10(deb.avg_volume + 1), 4, 7)
    : 40

  return weightedScore(
    { valuation: income, income, quality: ratingScore, growth: 50, risk: riskScore, liquidity },
    { valuation: 20, income: 25, quality: 25, growth: 0, risk: 20, liquidity: 10 }
  )
}
