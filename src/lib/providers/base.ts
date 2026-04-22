export interface ProviderConfig {
  name: string
  baseUrl: string
  apiKey?: string
  timeout?: number
  retries?: number
}

export interface FetchResult<T> {
  data: T | null
  error: string | null
  source: string
  fetched_at: string
  is_mock: boolean
}

export abstract class BaseProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  protected async fetchJson<T>(
    path: string,
    options?: RequestInit
  ): Promise<FetchResult<T>> {
    const url = `${this.config.baseUrl}${path}`
    const fetched_at = new Date().toISOString()

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
          ...options?.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout ?? 15000),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as T
      return { data, error: null, source: this.config.name, fetched_at, is_mock: false }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[${this.config.name}] Fetch error:`, error)
      return { data: null, error, source: this.config.name, fetched_at, is_mock: false }
    }
  }

  protected mockResult<T>(data: T): FetchResult<T> {
    return {
      data,
      error: null,
      source: `${this.config.name}:mock`,
      fetched_at: new Date().toISOString(),
      is_mock: true,
    }
  }

  abstract healthCheck(): Promise<boolean>
}
