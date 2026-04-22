import { SimulationInput, SimulationResult, SimulationScenario } from '@/types'

function calculateGrowth(
  initial: number,
  monthly: number,
  months: number,
  annualRate: number,
  reinvest: boolean
): { total_invested: number; final_amount: number; data_points: { month: number; amount: number }[] } {
  const monthlyRate = annualRate / 12 / 100
  let balance = initial
  const data_points: { month: number; amount: number }[] = [{ month: 0, amount: initial }]

  for (let m = 1; m <= months; m++) {
    const yield_amount = reinvest ? balance * monthlyRate : 0
    balance = balance + monthly + yield_amount

    if (m % 3 === 0 || m === months) {
      data_points.push({ month: m, amount: Math.round(balance * 100) / 100 })
    }
  }

  const total_invested = initial + monthly * months
  return { total_invested, final_amount: Math.round(balance * 100) / 100, data_points }
}

export function runSimulation(input: SimulationInput): SimulationResult {
  const baseRate = input.annual_rate
  const conservativeRate = baseRate * 0.7
  const optimisticRate = baseRate * 1.4

  const buildScenario = (label: string, rate: number): SimulationScenario => {
    const { total_invested, final_amount, data_points } = calculateGrowth(
      input.initial_amount,
      input.monthly_contribution,
      input.period_months,
      rate,
      input.reinvest
    )
    return {
      label,
      annual_rate: Math.round(rate * 100) / 100,
      total_invested,
      final_amount,
      total_yield: Math.round((final_amount - total_invested) * 100) / 100,
      data_points,
    }
  }

  return {
    input,
    conservative: buildScenario('Conservador', conservativeRate),
    base: buildScenario('Base', baseRate),
    optimistic: buildScenario('Otimista', optimisticRate),
  }
}

export function getDefaultRateForAssetType(assetType: string): number {
  const rates: Record<string, number> = {
    tesouro: 13.5,
    renda_fixa: 14.0,
    fii: 11.0,
    acao: 15.0,
    debenture: 14.5,
    caixa: 13.65,
    generic: 13.65,
  }
  return rates[assetType] ?? 13.65
}
