import { BaseProvider, FetchResult } from './base'

export interface BcbSerie {
  id: number
  nome: string
  valor: number
  data: string
}

// BCB public SGS series IDs
const SERIES = {
  SELIC_META: 432,
  SELIC_OVER: 11,
  CDI: 12,
  IPCA_MENSAL: 433,
  IPCA_12M: 13522,
  IGPM_MENSAL: 189,
  DOLAR: 1,
  EURO: 21619,
}

const MOCK_INDICATORS = [
  { id: SERIES.SELIC_META, nome: 'Selic Meta', valor: 13.75, data: '2026-04-01' },
  { id: SERIES.CDI, nome: 'CDI', valor: 13.65, data: '2026-04-22' },
  { id: SERIES.IPCA_MENSAL, nome: 'IPCA Mensal', valor: 0.44, data: '2026-03-01' },
  { id: SERIES.IPCA_12M, nome: 'IPCA 12 Meses', valor: 5.06, data: '2026-03-01' },
  { id: SERIES.IGPM_MENSAL, nome: 'IGP-M Mensal', valor: 0.41, data: '2026-03-01' },
  { id: SERIES.DOLAR, nome: 'Dólar (PTAX)', valor: 5.24, data: '2026-04-22' },
  { id: SERIES.EURO, nome: 'Euro', valor: 5.89, data: '2026-04-22' },
]

export class BcbProvider extends BaseProvider {
  constructor() {
    super({
      name: 'bcb',
      baseUrl: process.env.BCB_API_BASE_URL ?? 'https://api.bcb.gov.br',
      timeout: 10000,
    })
  }

  async fetchLatestIndicators(): Promise<FetchResult<BcbSerie[]>> {
    // SGS API format: /dados/serie/bcdata.sgs.{id}/dados/ultimos/1
    try {
      const results = await Promise.allSettled(
        Object.entries(SERIES).map(async ([, id]) => {
          const result = await this.fetchJson<Array<{ valor: string; data: string }>>(
            `/dados/serie/bcdata.sgs.${id}/dados/ultimos/1?formato=json`
          )
          return { id, result }
        })
      )

      const anySuccess = results.some(
        (r) => r.status === 'fulfilled' && r.value.result.data !== null
      )

      if (!anySuccess) {
        return this.mockResult(MOCK_INDICATORS)
      }

      const series: BcbSerie[] = []
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.result.data) {
          const raw = result.value.result.data[0]
          const mockItem = MOCK_INDICATORS.find((m) => m.id === result.value.id)
          if (raw && mockItem) {
            series.push({
              id: result.value.id,
              nome: mockItem.nome,
              valor: parseFloat(raw.valor.replace(',', '.')),
              data: raw.data,
            })
          }
        }
      }

      return {
        data: series.length > 0 ? series : MOCK_INDICATORS,
        error: null,
        source: this.config.name,
        fetched_at: new Date().toISOString(),
        is_mock: series.length === 0,
      }
    } catch {
      return this.mockResult(MOCK_INDICATORS)
    }
  }

  async healthCheck(): Promise<boolean> {
    const result = await this.fetchJson('/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json')
    return result.error === null
  }
}

export const bcbProvider = new BcbProvider()
