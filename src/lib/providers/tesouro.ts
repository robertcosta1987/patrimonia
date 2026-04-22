import { BaseProvider, FetchResult } from './base'
import { TesouroOffer } from '@/types'

const MOCK_TESOURO: TesouroOffer[] = [
  {
    id: 'td-selic-2029',
    title_type: 'Tesouro Selic 2029',
    maturity_date: '2029-03-01',
    indexer: 'selic',
    rate: 0.1225,
    min_investment: 100.0,
    price: 14285.23,
    liquidity: 'diaria',
    is_available: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'td-ipca-2029',
    title_type: 'Tesouro IPCA+ 2029',
    maturity_date: '2029-05-15',
    indexer: 'ipca',
    rate: 6.84,
    min_investment: 30.0,
    price: 3512.18,
    liquidity: 'diaria',
    is_available: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'td-ipca-2035',
    title_type: 'Tesouro IPCA+ 2035',
    maturity_date: '2035-05-15',
    indexer: 'ipca',
    rate: 7.15,
    min_investment: 30.0,
    price: 2148.67,
    liquidity: 'diaria',
    is_available: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'td-ipca-2045-juros',
    title_type: 'Tesouro IPCA+ com Juros Semestrais 2045',
    maturity_date: '2045-05-15',
    indexer: 'ipca',
    rate: 6.98,
    min_investment: 30.0,
    price: 4123.45,
    liquidity: 'diaria',
    is_available: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'td-pre-2027',
    title_type: 'Tesouro Prefixado 2027',
    maturity_date: '2027-01-01',
    indexer: 'prefixado',
    rate: 13.42,
    min_investment: 30.0,
    price: 755.89,
    liquidity: 'diaria',
    is_available: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'td-pre-2031-juros',
    title_type: 'Tesouro Prefixado com Juros Semestrais 2031',
    maturity_date: '2031-01-01',
    indexer: 'prefixado',
    rate: 13.71,
    min_investment: 30.0,
    price: 1000.0,
    liquidity: 'diaria',
    is_available: true,
    updated_at: new Date().toISOString(),
  },
]

export class TesouroProvider extends BaseProvider {
  constructor() {
    super({
      name: 'tesouro',
      baseUrl: process.env.TESOURO_API_BASE_URL ?? 'https://www.tesourodireto.com.br',
      timeout: 10000,
    })
  }

  async fetchOffers(): Promise<FetchResult<TesouroOffer[]>> {
    // Tesouro Direto doesn't have a simple public API, so we use mock data
    // In production, integrate with licensed data feed or B3 partner API
    return this.mockResult(MOCK_TESOURO)
  }

  async healthCheck(): Promise<boolean> {
    return true // Mock always healthy
  }
}

export const tesouroProvider = new TesouroProvider()
