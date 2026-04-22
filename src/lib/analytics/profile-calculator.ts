import { InvestorProfile } from '@/types'

export interface ProfileInput {
  age: number
  monthly_income: number
  patrimony: number
  main_goal: 'preservacao' | 'renda' | 'crescimento' | 'equilibrio'
  investment_horizon: 'curto' | 'medio' | 'longo'
  risk_tolerance: number  // 1-5
  experience: 'iniciante' | 'intermediario' | 'avancado'
}

export interface ProfileResult {
  profile: InvestorProfile
  risk_score: number
  allocation_renda_fixa: number
  allocation_fii: number
  allocation_acoes: number
  allocation_caixa: number
  explanation: string
}

export function calculateProfile(input: ProfileInput): ProfileResult {
  let score = 0

  // Age component (younger = more risk capacity)
  if (input.age < 30) score += 20
  else if (input.age < 40) score += 16
  else if (input.age < 50) score += 12
  else if (input.age < 60) score += 8
  else score += 4

  // Horizon component
  if (input.investment_horizon === 'longo') score += 20
  else if (input.investment_horizon === 'medio') score += 12
  else score += 4

  // Risk tolerance (1-5 scale)
  score += (input.risk_tolerance - 1) * 5  // 0 to 20

  // Goal component
  const goalScores = { crescimento: 20, equilibrio: 14, renda: 8, preservacao: 4 }
  score += goalScores[input.main_goal]

  // Experience component
  if (input.experience === 'avancado') score += 15
  else if (input.experience === 'intermediario') score += 8
  else score += 2

  // Reserve adequacy (>6 months = more risk capacity)
  const reserveMonths = input.patrimony / Math.max(input.monthly_income, 1)
  if (reserveMonths >= 12) score += 5
  else if (reserveMonths >= 6) score += 3
  else score -= 3

  // Normalize to 0-100
  const risk_score = Math.max(0, Math.min(100, Math.round((score / 82) * 100)))

  // Determine profile
  let profile: InvestorProfile
  if (risk_score < 35) profile = 'conservador'
  else if (risk_score < 68) profile = 'moderado'
  else profile = 'arrojado'

  // Allocation by profile
  const allocations = {
    conservador: { renda_fixa: 70, fii: 15, acoes: 5, caixa: 10 },
    moderado: { renda_fixa: 45, fii: 25, acoes: 25, caixa: 5 },
    arrojado: { renda_fixa: 20, fii: 20, acoes: 55, caixa: 5 },
  }

  const alloc = allocations[profile]

  const explanations: Record<InvestorProfile, string> = {
    conservador: 'Seu perfil indica preferência por segurança e preservação do capital. A alocação sugerida prioriza renda fixa e ativos de baixa volatilidade.',
    moderado: 'Seu perfil equilibra busca por rentabilidade com tolerância moderada a riscos. A alocação diversifica entre renda fixa, FIIs e ações.',
    arrojado: 'Seu perfil demonstra maior tolerância a oscilações em busca de crescimento de longo prazo. A alocação concentra mais em renda variável.',
  }

  return {
    profile,
    risk_score,
    allocation_renda_fixa: alloc.renda_fixa,
    allocation_fii: alloc.fii,
    allocation_acoes: alloc.acoes,
    allocation_caixa: alloc.caixa,
    explanation: explanations[profile],
  }
}
