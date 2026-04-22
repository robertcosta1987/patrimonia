import { BaseProvider, FetchResult } from './base'
import { TesouroOffer } from '@/types'

const MOCK_TESOURO: TesouroOffer[] = [
  { id: 'td-selic-2029', title_type: 'Tesouro Selic 2029', maturity_date: '2029-03-01', indexer: 'selic', rate: 0.1225, min_investment: 100.0, price: 14285.23, liquidity: 'diaria', is_available: true, updated_at: new Date().toISOString() },
  { id: 'td-ipca-2029', title_type: 'Tesouro IPCA+ 2029', maturity_date: '2029-05-15', indexer: 'ipca', rate: 6.84, min_investment: 30.0, price: 3512.18, liquidity: 'diaria', is_available: true, updated_at: new Date().toISOString() },
  { id: 'td-ipca-2035', title_type: 'Tesouro IPCA+ 2035', maturity_date: '2035-05-15', indexer: 'ipca', rate: 7.15, min_investment: 30.0, price: 2148.67, liquidity: 'diaria', is_available: true, updated_at: new Date().toISOString() },
  { id: 'td-ipca-2045-juros', title_type: 'Tesouro IPCA+ com Juros Semestrais 2045', maturity_date: '2045-05-15', indexer: 'ipca', rate: 6.98, min_investment: 30.0, price: 4123.45, liquidity: 'diaria', is_available: true, updated_at: new Date().toISOString() },
  { id: 'td-pre-2027', title_type: 'Tesouro Prefixado 2027', maturity_date: '2027-01-01', indexer: 'prefixado', rate: 13.42, min_investment: 30.0, price: 755.89, liquidity: 'diaria', is_available: true, updated_at: new Date().toISOString() },
  { id: 'td-pre-2031-juros', title_type: 'Tesouro Prefixado com Juros Semestrais 2031', maturity_date: '2031-01-01', indexer: 'prefixado', rate: 13.71, min_investment: 30.0, price: 1000.0, liquidity: 'diaria', is_available: true, updated_at: new Date().toISOString() },
]

interface TesouroBond {
  nm: string
  mtrtyDt: string
  anulInvstmtRate: number
  minInvstmtAmt: number
  untrInvstmtVal: number
}

interface TesouroJsonResponse {
  response?: {
    TrsrBdTradgList?: Array<{ TrsrBd: TesouroBond }>
  }
  responseStatus?: number
}

export class TesouroProvider extends BaseProvider {
  constructor() {
    super({
      name: 'tesouro',
      baseUrl: 'https://www.tesourodireto.com.br',
      timeout: 10000,
    })
  }

  async fetchOffers(): Promise<FetchResult<TesouroOffer[]>> {
    try {
      const result = await this.fetchJson<TesouroJsonResponse>(
        '/json/br/com/b3/tesourodireto/service/api/wallet/v1/PriceVetor.json'
      )

      const list = result.data?.response?.TrsrBdTradgList
      if (result.error || !list?.length) {
        return this.mockResult(MOCK_TESOURO)
      }

      const now = new Date().toISOString()
      const offers: TesouroOffer[] = list.map(({ TrsrBd: td }) => {
        const name = td.nm
        const nameLower = name.toLowerCase()
        const indexer: 'selic' | 'ipca' | 'prefixado' =
          nameLower.includes('selic') ? 'selic' :
          nameLower.includes('ipca') ? 'ipca' : 'prefixado'
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

        return {
          id: `td-${slug}`,
          title_type: name,
          maturity_date: td.mtrtyDt.split('T')[0],
          indexer,
          rate: td.anulInvstmtRate,
          min_investment: td.minInvstmtAmt,
          price: td.untrInvstmtVal,
          liquidity: 'diaria',
          is_available: true,
          updated_at: now,
        }
      })

      return {
        data: offers,
        error: null,
        source: 'tesouro_direto',
        fetched_at: now,
        is_mock: false,
      }
    } catch {
      return this.mockResult(MOCK_TESOURO)
    }
  }

  async healthCheck(): Promise<boolean> {
    const result = await this.fetchOffers()
    return !result.is_mock
  }
}

export const tesouroProvider = new TesouroProvider()
