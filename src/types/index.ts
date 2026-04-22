// Core domain types for PatrimonIA

export type AssetClass = 'acao' | 'fii' | 'tesouro' | 'renda_fixa' | 'debenture' | 'caixa'
export type InvestorProfile = 'conservador' | 'moderado' | 'arrojado'
export type AlertType = 'preco' | 'dividend_yield' | 'pvp' | 'vencimento' | 'taxa' | 'ranking'
export type DataSourceType = 'bcb' | 'tesouro' | 'b3' | 'cvm' | 'anbima' | 'partner' | 'manual'
export type SyncStatus = 'idle' | 'running' | 'success' | 'error' | 'partial'

// ── Asset Models ──────────────────────────────────────────────────────────────

export interface Asset {
  id: string
  ticker: string
  name: string
  asset_class: AssetClass
  sector?: string
  segment?: string
  issuer?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface AssetPrice {
  id: string
  asset_id: string
  price: number
  change_pct?: number
  volume?: number
  source: DataSourceType
  source_timestamp: string
  ingested_at: string
}

export interface AcaoMetrics {
  asset_id: string
  ticker: string
  name: string
  price: number
  change_pct?: number
  pl?: number          // P/L
  pvp?: number         // P/VP
  dividend_yield?: number
  roe?: number
  debt_equity?: number
  revenue_growth?: number
  volatility?: number
  avg_volume?: number
  market_cap?: number
  score: number
  updated_at: string
}

export interface FiiMetrics {
  asset_id: string
  ticker: string
  name: string
  segment: string
  price: number
  change_pct?: number
  pvp?: number
  dividend_yield?: number
  vacancy_rate?: number
  avg_volume?: number
  net_worth?: number
  score: number
  updated_at: string
}

export interface TesouroOffer {
  id: string
  title_type: string
  maturity_date: string
  indexer: 'selic' | 'ipca' | 'prefixado'
  rate: number
  min_investment: number
  price: number
  liquidity: 'diaria' | 'no_vencimento'
  is_available: boolean
  updated_at: string
}

export interface RendaFixaOffer {
  id: string
  asset_type: 'CDB' | 'LCI' | 'LCA' | 'CRI' | 'CRA' | 'LC'
  institution: string
  indexer: 'CDI' | 'IPCA' | 'prefixado' | 'selic'
  rate: number
  rate_pct_cdi?: number
  maturity_date: string
  min_investment: number
  liquidity: 'diaria' | 'no_vencimento' | 'prazo'
  has_fgc: boolean
  is_available: boolean
  score: number
  updated_at: string
}

export interface DebentureOffer {
  id: string
  ticker: string
  issuer: string
  indexer: 'CDI' | 'IPCA' | 'prefixado' | 'IGPM'
  rate: number
  maturity_date: string
  rating?: string
  avg_volume?: number
  estimated_risk: 'baixo' | 'medio' | 'alto'
  score: number
  updated_at: string
}

// ── Investor Profile ──────────────────────────────────────────────────────────

export interface InvestorProfileData {
  id: string
  user_id: string
  age: number
  monthly_income: number
  patrimony: number
  main_goal: 'preservacao' | 'renda' | 'crescimento' | 'equilibrio'
  investment_horizon: 'curto' | 'medio' | 'longo'  // <2y, 2-5y, >5y
  risk_tolerance: number  // 1-5
  experience: 'iniciante' | 'intermediario' | 'avancado'
  profile: InvestorProfile
  risk_score: number  // 0-100
  allocation_renda_fixa: number
  allocation_fii: number
  allocation_acoes: number
  allocation_caixa: number
  created_at: string
  updated_at: string
}

// ── Model Portfolio ───────────────────────────────────────────────────────────

export interface ModelPortfolio {
  id: string
  profile: InvestorProfile
  name: string
  description: string
  allocations: PortfolioAllocation[]
}

export interface PortfolioAllocation {
  asset_class: AssetClass
  percentage: number
  label: string
  rationale: string
  expected_characteristic: string
}

// ── Simulation ────────────────────────────────────────────────────────────────

export interface SimulationInput {
  initial_amount: number
  monthly_contribution: number
  period_months: number
  annual_rate: number
  asset_type: AssetClass | 'generic'
  reinvest: boolean
}

export interface SimulationScenario {
  label: string
  annual_rate: number
  total_invested: number
  final_amount: number
  total_yield: number
  data_points: { month: number; amount: number }[]
}

export interface SimulationResult {
  input: SimulationInput
  conservative: SimulationScenario
  base: SimulationScenario
  optimistic: SimulationScenario
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title?: string
  messages: ChatMessage[]
  created_at: string
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string
  user_id: string
  asset_id?: string
  ticker?: string
  alert_type: AlertType
  condition: 'above' | 'below'
  threshold: number
  is_active: boolean
  created_at: string
}

export interface AlertEvent {
  id: string
  alert_id: string
  user_id: string
  ticker?: string
  message: string
  current_value: number
  is_read: boolean
  triggered_at: string
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string
  user_id: string
  asset_id: string
  ticker: string
  asset_class: AssetClass
  notes?: string
  created_at: string
}

// ── Data Ingestion ────────────────────────────────────────────────────────────

export interface DataSource {
  id: string
  name: string
  type: DataSourceType
  base_url?: string
  is_active: boolean
  health_status: 'healthy' | 'degraded' | 'down' | 'unknown'
  last_successful_sync?: string
  last_error?: string
}

export interface SyncRun {
  id: string
  source_id: string
  source_name: string
  status: SyncStatus
  records_fetched: number
  records_inserted: number
  error_message?: string
  started_at: string
  finished_at?: string
  duration_ms?: number
}

// ── Glossary ──────────────────────────────────────────────────────────────────

export interface GlossaryTerm {
  id: string
  term: string
  definition: string
  example: string
  why_it_matters: string
  category: string
  tags: string[]
}

// ── Macro ─────────────────────────────────────────────────────────────────────

export interface MacroIndicator {
  name: string
  label: string
  value: number
  unit: string
  date: string
  source: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  profile?: InvestorProfileData
  recent_alerts: AlertEvent[]
  macro_indicators: MacroIndicator[]
  featured_acoes: AcaoMetrics[]
  featured_fiis: FiiMetrics[]
  data_freshness: { source: string; last_updated: string; status: string }[]
}
