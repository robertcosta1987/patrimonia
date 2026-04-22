import { BaseProvider, FetchResult } from './base'
import { RendaFixaOffer, DebentureOffer } from '@/types'

export const MOCK_RENDA_FIXA: RendaFixaOffer[] = [
  { id: 'rf-1', asset_type: 'CDB', institution: 'Nubank', indexer: 'CDI', rate: 102, rate_pct_cdi: 102, maturity_date: '2027-04-22', min_investment: 1, liquidity: 'diaria', has_fgc: true, is_available: true, score: 88, updated_at: new Date().toISOString() },
  { id: 'rf-2', asset_type: 'CDB', institution: 'XP Investimentos', indexer: 'CDI', rate: 115, rate_pct_cdi: 115, maturity_date: '2028-04-22', min_investment: 1000, liquidity: 'no_vencimento', has_fgc: true, is_available: true, score: 91, updated_at: new Date().toISOString() },
  { id: 'rf-3', asset_type: 'LCI', institution: 'Itaú', indexer: 'CDI', rate: 92, rate_pct_cdi: 92, maturity_date: '2026-10-22', min_investment: 5000, liquidity: 'no_vencimento', has_fgc: true, is_available: true, score: 82, updated_at: new Date().toISOString() },
  { id: 'rf-4', asset_type: 'LCA', institution: 'BTG Pactual', indexer: 'CDI', rate: 96, rate_pct_cdi: 96, maturity_date: '2027-01-22', min_investment: 1000, liquidity: 'no_vencimento', has_fgc: true, is_available: true, score: 85, updated_at: new Date().toISOString() },
  { id: 'rf-5', asset_type: 'CDB', institution: 'Banco Inter', indexer: 'CDI', rate: 105, rate_pct_cdi: 105, maturity_date: '2027-10-22', min_investment: 100, liquidity: 'diaria', has_fgc: true, is_available: true, score: 87, updated_at: new Date().toISOString() },
  { id: 'rf-6', asset_type: 'CDB', institution: 'Banco Master', indexer: 'IPCA', rate: 7.2, maturity_date: '2029-04-22', min_investment: 500, liquidity: 'no_vencimento', has_fgc: true, is_available: true, score: 84, updated_at: new Date().toISOString() },
  { id: 'rf-7', asset_type: 'CDB', institution: 'Sofisa Direto', indexer: 'prefixado', rate: 13.8, maturity_date: '2027-04-22', min_investment: 1, liquidity: 'no_vencimento', has_fgc: true, is_available: true, score: 86, updated_at: new Date().toISOString() },
  { id: 'rf-8', asset_type: 'LCI', institution: 'Banco Pine', indexer: 'CDI', rate: 98, rate_pct_cdi: 98, maturity_date: '2027-04-22', min_investment: 2000, liquidity: 'no_vencimento', has_fgc: true, is_available: true, score: 83, updated_at: new Date().toISOString() },
  { id: 'rf-9', asset_type: 'LCA', institution: 'Banco ABC Brasil', indexer: 'CDI', rate: 97, rate_pct_cdi: 97, maturity_date: '2027-07-22', min_investment: 3000, liquidity: 'no_vencimento', has_fgc: true, is_available: true, score: 84, updated_at: new Date().toISOString() },
  { id: 'rf-10', asset_type: 'CDB', institution: 'C6 Bank', indexer: 'CDI', rate: 103, rate_pct_cdi: 103, maturity_date: '2028-01-22', min_investment: 1, liquidity: 'diaria', has_fgc: true, is_available: true, score: 86, updated_at: new Date().toISOString() },
]

export const MOCK_DEBENTURES: DebentureOffer[] = [
  { id: 'deb-1', ticker: 'IGTAC5', issuer: 'Iguatemi Empresa de Shopping Centers', indexer: 'CDI', rate: 1.35, maturity_date: '2028-08-15', rating: 'AA-', avg_volume: 1200000, estimated_risk: 'baixo', score: 82, updated_at: new Date().toISOString() },
  { id: 'deb-2', ticker: 'RDVT11', issuer: 'Rodovias do Tietê', indexer: 'IPCA', rate: 5.4, maturity_date: '2033-06-15', rating: 'A+', avg_volume: 800000, estimated_risk: 'baixo', score: 79, updated_at: new Date().toISOString() },
  { id: 'deb-3', ticker: 'CCPR12', issuer: 'Cyrela Commercial Properties', indexer: 'CDI', rate: 2.1, maturity_date: '2027-12-15', rating: 'A', avg_volume: 600000, estimated_risk: 'medio', score: 74, updated_at: new Date().toISOString() },
  { id: 'deb-4', ticker: 'EQPA3', issuer: 'Equatorial Pará Distribuidora de Energia', indexer: 'IPCA', rate: 6.2, maturity_date: '2035-04-15', rating: 'AA', avg_volume: 1500000, estimated_risk: 'baixo', score: 85, updated_at: new Date().toISOString() },
  { id: 'deb-5', ticker: 'ARML11', issuer: 'Armafer Construção e Montagem', indexer: 'CDI', rate: 3.8, maturity_date: '2026-09-15', rating: 'BBB+', avg_volume: 200000, estimated_risk: 'medio', score: 65, updated_at: new Date().toISOString() },
  { id: 'deb-6', ticker: 'CMGD15', issuer: 'CEMIG Distribuição', indexer: 'IPCA', rate: 5.8, maturity_date: '2032-06-15', rating: 'AA-', avg_volume: 1100000, estimated_risk: 'baixo', score: 81, updated_at: new Date().toISOString() },
  { id: 'deb-7', ticker: 'TPIS3', issuer: 'Triunfo Participações e Investimentos', indexer: 'IPCA', rate: 7.1, maturity_date: '2030-12-15', rating: 'BBB', avg_volume: 400000, estimated_risk: 'alto', score: 58, updated_at: new Date().toISOString() },
  { id: 'deb-8', ticker: 'LEVE3', issuer: 'Metal Leve', indexer: 'CDI', rate: 1.85, maturity_date: '2028-03-15', rating: 'A+', avg_volume: 700000, estimated_risk: 'baixo', score: 77, updated_at: new Date().toISOString() },
]

export class RendaFixaProvider extends BaseProvider {
  constructor() {
    super({
      name: 'partner_fixed_income',
      baseUrl: process.env.PARTNER_FIXED_INCOME_API_BASE_URL ?? 'https://example.com',
      timeout: 10000,
    })
  }

  async fetchRendaFixa(): Promise<FetchResult<RendaFixaOffer[]>> {
    return this.mockResult(MOCK_RENDA_FIXA)
  }

  async fetchDebentures(): Promise<FetchResult<DebentureOffer[]>> {
    return this.mockResult(MOCK_DEBENTURES)
  }

  async healthCheck(): Promise<boolean> {
    return true
  }
}

export const rendaFixaProvider = new RendaFixaProvider()
