import { BaseProvider, FetchResult } from './base'
import { AcaoMetrics, FiiMetrics } from '@/types'

interface BrapiQuote {
  symbol: string
  shortName: string
  regularMarketPrice: number
  regularMarketChangePercent: number
  regularMarketVolume?: number
  marketCap?: number
  priceEarnings?: number
  priceToBook?: number
  dividendYield?: number
}

interface BrapiResponse {
  results: BrapiQuote[]
}

export const MOCK_ACOES: AcaoMetrics[] = [
  { asset_id: '1', ticker: 'PETR4', name: 'Petrobras PN', price: 37.42, change_pct: 1.2, pl: 4.1, pvp: 1.1, dividend_yield: 14.2, roe: 28.4, debt_equity: 0.6, revenue_growth: 12.1, volatility: 28.5, avg_volume: 180000000, market_cap: 487000000000, score: 82, updated_at: new Date().toISOString() },
  { asset_id: '2', ticker: 'VALE3', name: 'Vale ON', price: 58.12, change_pct: -0.8, pl: 5.8, pvp: 1.4, dividend_yield: 9.8, roe: 24.1, debt_equity: 0.4, revenue_growth: -2.3, volatility: 31.2, avg_volume: 220000000, market_cap: 281000000000, score: 75, updated_at: new Date().toISOString() },
  { asset_id: '3', ticker: 'ITUB4', name: 'Itaú Unibanco PN', price: 34.88, change_pct: 0.5, pl: 8.2, pvp: 1.9, dividend_yield: 4.2, roe: 22.8, debt_equity: undefined, revenue_growth: 8.4, volatility: 19.1, avg_volume: 95000000, market_cap: 320000000000, score: 79, updated_at: new Date().toISOString() },
  { asset_id: '4', ticker: 'BBDC4', name: 'Bradesco PN', price: 14.21, change_pct: -1.1, pl: 6.9, pvp: 0.9, dividend_yield: 5.8, roe: 13.2, debt_equity: undefined, revenue_growth: -3.1, volatility: 24.3, avg_volume: 65000000, market_cap: 118000000000, score: 62, updated_at: new Date().toISOString() },
  { asset_id: '5', ticker: 'WEGE3', name: 'WEG ON', price: 38.45, change_pct: 0.9, pl: 28.4, pvp: 8.6, dividend_yield: 1.8, roe: 32.1, debt_equity: 0.1, revenue_growth: 18.7, volatility: 22.4, avg_volume: 28000000, market_cap: 151000000000, score: 88, updated_at: new Date().toISOString() },
  { asset_id: '6', ticker: 'RENT3', name: 'Localiza ON', price: 42.18, change_pct: 2.1, pl: 15.3, pvp: 2.8, dividend_yield: 1.2, roe: 18.9, debt_equity: 1.8, revenue_growth: 14.2, volatility: 27.8, avg_volume: 18000000, market_cap: 42000000000, score: 71, updated_at: new Date().toISOString() },
  { asset_id: '7', ticker: 'MGLU3', name: 'Magazine Luiza ON', price: 8.34, change_pct: -2.4, pl: undefined, pvp: 1.2, dividend_yield: 0.0, roe: -8.4, debt_equity: 2.1, revenue_growth: 4.1, volatility: 52.3, avg_volume: 45000000, market_cap: 24000000000, score: 31, updated_at: new Date().toISOString() },
  { asset_id: '8', ticker: 'ABEV3', name: 'Ambev ON', price: 12.44, change_pct: 0.3, pl: 14.8, pvp: 2.2, dividend_yield: 5.4, roe: 15.2, debt_equity: 0.2, revenue_growth: 6.8, volatility: 16.8, avg_volume: 42000000, market_cap: 196000000000, score: 74, updated_at: new Date().toISOString() },
  { asset_id: '9', ticker: 'SUZB3', name: 'Suzano ON', price: 62.87, change_pct: 1.8, pl: 6.2, pvp: 2.1, dividend_yield: 3.2, roe: 35.8, debt_equity: 1.2, revenue_growth: 22.4, volatility: 29.1, avg_volume: 22000000, market_cap: 83000000000, score: 77, updated_at: new Date().toISOString() },
  { asset_id: '10', ticker: 'EGIE3', name: 'Engie Brasil ON', price: 44.12, change_pct: 0.4, pl: 11.2, pvp: 2.4, dividend_yield: 7.8, roe: 21.4, debt_equity: 0.8, revenue_growth: 9.1, volatility: 14.2, avg_volume: 8000000, market_cap: 30000000000, score: 80, updated_at: new Date().toISOString() },
  { asset_id: '11', ticker: 'BBAS3', name: 'Banco do Brasil ON', price: 26.44, change_pct: 0.7, pl: 4.8, pvp: 0.8, dividend_yield: 8.9, roe: 18.1, debt_equity: undefined, revenue_growth: 11.2, volatility: 20.4, avg_volume: 55000000, market_cap: 156000000000, score: 78, updated_at: new Date().toISOString() },
  { asset_id: '12', ticker: 'TAEE11', name: 'Taesa UNT', price: 10.82, change_pct: 0.2, pl: 7.4, pvp: 1.6, dividend_yield: 12.4, roe: 22.8, debt_equity: 1.4, revenue_growth: 4.2, volatility: 12.8, avg_volume: 5000000, market_cap: 7000000000, score: 81, updated_at: new Date().toISOString() },
  { asset_id: '13', ticker: 'RADL3', name: 'Raia Drogasil ON', price: 21.88, change_pct: -0.4, pl: 32.1, pvp: 5.8, dividend_yield: 0.8, roe: 18.4, debt_equity: 0.3, revenue_growth: 16.8, volatility: 17.4, avg_volume: 12000000, market_cap: 38000000000, score: 72, updated_at: new Date().toISOString() },
  { asset_id: '14', ticker: 'CPLE6', name: 'Copel PNB', price: 7.84, change_pct: 1.1, pl: 6.8, pvp: 0.7, dividend_yield: 7.2, roe: 10.4, debt_equity: 0.9, revenue_growth: 5.4, volatility: 18.9, avg_volume: 8000000, market_cap: 11000000000, score: 68, updated_at: new Date().toISOString() },
  { asset_id: '15', ticker: 'VIVT3', name: 'Telefônica Brasil ON', price: 42.44, change_pct: 0.1, pl: 13.8, pvp: 1.8, dividend_yield: 6.8, roe: 13.1, debt_equity: 0.4, revenue_growth: 4.8, volatility: 13.2, avg_volume: 6000000, market_cap: 75000000000, score: 73, updated_at: new Date().toISOString() },
]

export const MOCK_FIIS: FiiMetrics[] = [
  { asset_id: '21', ticker: 'MXRF11', name: 'Maxi Renda', segment: 'Papel', price: 9.88, change_pct: 0.2, pvp: 0.94, dividend_yield: 12.8, vacancy_rate: 0, avg_volume: 12000000, net_worth: 3800000000, score: 84, updated_at: new Date().toISOString() },
  { asset_id: '22', ticker: 'HGLG11', name: 'CSHG Logística', segment: 'Logística', price: 162.34, change_pct: 0.8, pvp: 0.92, dividend_yield: 9.4, vacancy_rate: 4.2, avg_volume: 5000000, net_worth: 4200000000, score: 87, updated_at: new Date().toISOString() },
  { asset_id: '23', ticker: 'XPML11', name: 'XP Malls', segment: 'Shopping', price: 98.12, change_pct: 1.1, pvp: 0.88, dividend_yield: 10.2, vacancy_rate: 5.1, avg_volume: 7000000, net_worth: 3600000000, score: 82, updated_at: new Date().toISOString() },
  { asset_id: '24', ticker: 'KNRI11', name: 'Kinea Renda Imobiliária', segment: 'Híbrido', price: 152.88, change_pct: 0.4, pvp: 0.91, dividend_yield: 8.9, vacancy_rate: 6.8, avg_volume: 4500000, net_worth: 5800000000, score: 80, updated_at: new Date().toISOString() },
  { asset_id: '25', ticker: 'VISC11', name: 'Vinci Shopping Centers', segment: 'Shopping', price: 98.44, change_pct: 0.6, pvp: 0.87, dividend_yield: 10.8, vacancy_rate: 4.8, avg_volume: 4000000, net_worth: 3100000000, score: 83, updated_at: new Date().toISOString() },
  { asset_id: '26', ticker: 'BCFF11', name: 'BTG Pactual Fundo de Fundos', segment: 'Fundo de Fundos', price: 71.24, change_pct: -0.3, pvp: 0.90, dividend_yield: 11.2, vacancy_rate: 0, avg_volume: 3000000, net_worth: 1400000000, score: 78, updated_at: new Date().toISOString() },
  { asset_id: '27', ticker: 'RBRR11', name: 'RBR Rendimento High Grade', segment: 'Papel', price: 95.18, change_pct: 0.1, pvp: 0.96, dividend_yield: 13.4, vacancy_rate: 0, avg_volume: 2800000, net_worth: 1200000000, score: 85, updated_at: new Date().toISOString() },
  { asset_id: '28', ticker: 'HSML11', name: 'HSI Malls', segment: 'Shopping', price: 68.44, change_pct: 0.9, pvp: 0.83, dividend_yield: 11.8, vacancy_rate: 6.2, avg_volume: 3200000, net_worth: 1100000000, score: 79, updated_at: new Date().toISOString() },
  { asset_id: '29', ticker: 'BRCO11', name: 'Bresco Logística', segment: 'Logística', price: 88.22, change_pct: 0.3, pvp: 0.89, dividend_yield: 9.8, vacancy_rate: 2.1, avg_volume: 2000000, net_worth: 1600000000, score: 86, updated_at: new Date().toISOString() },
  { asset_id: '30', ticker: 'ALZR11', name: 'Alianza Trust Renda Imobiliária', segment: 'Lajes Corporativas', price: 104.56, change_pct: -0.5, pvp: 0.94, dividend_yield: 9.2, vacancy_rate: 8.4, avg_volume: 1500000, net_worth: 900000000, score: 76, updated_at: new Date().toISOString() },
  { asset_id: '31', ticker: 'CPTS11', name: 'Capitânia Securities II', segment: 'Papel', price: 8.42, change_pct: 0.0, pvp: 0.97, dividend_yield: 14.2, vacancy_rate: 0, avg_volume: 8000000, net_worth: 2100000000, score: 83, updated_at: new Date().toISOString() },
  { asset_id: '32', ticker: 'RECR11', name: 'REC Recebíveis Imobiliários', segment: 'Papel', price: 94.12, change_pct: 0.5, pvp: 0.95, dividend_yield: 13.1, vacancy_rate: 0, avg_volume: 3500000, net_worth: 1800000000, score: 82, updated_at: new Date().toISOString() },
]

export const MOCK_FI_INFRA: FiiMetrics[] = [
  { asset_id: '41', ticker: 'KDIF11', name: 'Kinea Infra FII', segment: 'Infraestrutura', price: 112.84, change_pct: 0.3, pvp: 0.98, dividend_yield: 13.8, vacancy_rate: 0, avg_volume: 9800000, net_worth: 8200000000, score: 86, updated_at: new Date().toISOString() },
  { asset_id: '42', ticker: 'CPFF11', name: 'Capitânia Premium FII', segment: 'Infraestrutura', price: 88.42, change_pct: 0.1, pvp: 0.97, dividend_yield: 14.2, vacancy_rate: 0, avg_volume: 4200000, net_worth: 2100000000, score: 85, updated_at: new Date().toISOString() },
  { asset_id: '43', ticker: 'VGHF11', name: 'Vinci Hedge Fund FII', segment: 'Infraestrutura', price: 10.14, change_pct: -0.2, pvp: 0.94, dividend_yield: 12.4, vacancy_rate: 0, avg_volume: 6300000, net_worth: 3800000000, score: 81, updated_at: new Date().toISOString() },
  { asset_id: '44', ticker: 'RZAK11', name: 'Riza Akin FII', segment: 'Infraestrutura', price: 97.88, change_pct: 0.5, pvp: 0.96, dividend_yield: 14.8, vacancy_rate: 0, avg_volume: 2100000, net_worth: 900000000, score: 84, updated_at: new Date().toISOString() },
  { asset_id: '45', ticker: 'HABT11', name: 'Habitasec FII', segment: 'Infraestrutura', price: 9.92, change_pct: 0.0, pvp: 0.99, dividend_yield: 13.1, vacancy_rate: 0, avg_volume: 3500000, net_worth: 1600000000, score: 82, updated_at: new Date().toISOString() },
  { asset_id: '46', ticker: 'MFII11', name: 'Mérito Desenvolvimentos FII', segment: 'Infraestrutura', price: 94.22, change_pct: 0.7, pvp: 0.92, dividend_yield: 15.2, vacancy_rate: 0, avg_volume: 1800000, net_worth: 700000000, score: 83, updated_at: new Date().toISOString() },
  { asset_id: '47', ticker: 'NVHO11', name: 'Novii FII', segment: 'Infraestrutura', price: 100.44, change_pct: -0.4, pvp: 0.95, dividend_yield: 13.5, vacancy_rate: 0, avg_volume: 2800000, net_worth: 1200000000, score: 80, updated_at: new Date().toISOString() },
  { asset_id: '48', ticker: 'JURO11', name: 'Sparta Infra FII', segment: 'Infraestrutura', price: 98.12, change_pct: 0.2, pvp: 1.01, dividend_yield: 12.8, vacancy_rate: 0, avg_volume: 1500000, net_worth: 600000000, score: 78, updated_at: new Date().toISOString() },
]

export class B3Provider extends BaseProvider {
  constructor() {
    super({
      name: 'b3',
      baseUrl: 'https://brapi.dev',
      timeout: 15000,
    })
  }

  private async fetchBrapiQuotes(tickers: string[]): Promise<Map<string, BrapiQuote>> {
    const token = process.env.BRAPI_TOKEN ?? 'demo'
    const symbols = tickers.join(',')
    const result = await this.fetchJson<BrapiResponse>(
      `/api/quote/${symbols}?token=${token}&fundamental=true`
    )

    const map = new Map<string, BrapiQuote>()
    if (result.data?.results) {
      for (const q of result.data.results) {
        map.set(q.symbol, q)
      }
    }
    return map
  }

  async fetchAcoes(): Promise<AcaoMetrics[]> {
    try {
      const tickers = MOCK_ACOES.map(a => a.ticker)
      const quotes = await this.fetchBrapiQuotes(tickers)
      if (quotes.size === 0) return MOCK_ACOES

      return MOCK_ACOES.map(mock => {
        const real = quotes.get(mock.ticker)
        if (!real) return mock
        return {
          ...mock,
          price: real.regularMarketPrice,
          change_pct: real.regularMarketChangePercent,
          pl: real.priceEarnings ?? mock.pl,
          pvp: real.priceToBook ?? mock.pvp,
          dividend_yield: real.dividendYield ?? mock.dividend_yield,
          market_cap: real.marketCap ?? mock.market_cap,
          avg_volume: real.regularMarketVolume ?? mock.avg_volume,
          updated_at: new Date().toISOString(),
        }
      })
    } catch {
      return MOCK_ACOES
    }
  }

  async fetchFiis(): Promise<FiiMetrics[]> {
    try {
      const tickers = MOCK_FIIS.map(f => f.ticker)
      const quotes = await this.fetchBrapiQuotes(tickers)
      if (quotes.size === 0) return MOCK_FIIS

      return MOCK_FIIS.map(mock => {
        const real = quotes.get(mock.ticker)
        if (!real) return mock
        return {
          ...mock,
          price: real.regularMarketPrice,
          change_pct: real.regularMarketChangePercent,
          pvp: real.priceToBook ?? mock.pvp,
          dividend_yield: real.dividendYield ?? mock.dividend_yield,
          avg_volume: real.regularMarketVolume ?? mock.avg_volume,
          updated_at: new Date().toISOString(),
        }
      })
    } catch {
      return MOCK_FIIS
    }
  }

  async fetchFiInfra(): Promise<FiiMetrics[]> {
    try {
      const tickers = MOCK_FI_INFRA.map(f => f.ticker)
      const quotes = await this.fetchBrapiQuotes(tickers)
      if (quotes.size === 0) return MOCK_FI_INFRA

      return MOCK_FI_INFRA.map(mock => {
        const real = quotes.get(mock.ticker)
        if (!real) return mock
        return {
          ...mock,
          price: real.regularMarketPrice,
          change_pct: real.regularMarketChangePercent,
          pvp: real.priceToBook ?? mock.pvp,
          dividend_yield: real.dividendYield ?? mock.dividend_yield,
          avg_volume: real.regularMarketVolume ?? mock.avg_volume,
          updated_at: new Date().toISOString(),
        }
      })
    } catch {
      return MOCK_FI_INFRA
    }
  }

  async fetchRealResult(): Promise<FetchResult<{ acoes: AcaoMetrics[]; fiis: FiiMetrics[] }>> {
    const [acoes, fiis] = await Promise.all([this.fetchAcoes(), this.fetchFiis()])
    const isReal = acoes[0]?.price !== MOCK_ACOES[0]?.price
    return {
      data: { acoes, fiis },
      error: null,
      source: isReal ? 'brapi' : 'mock',
      fetched_at: new Date().toISOString(),
      is_mock: !isReal,
    }
  }

  async healthCheck(): Promise<boolean> {
    const quotes = await this.fetchBrapiQuotes(['PETR4'])
    return quotes.size > 0
  }
}

export const b3Provider = new B3Provider()
