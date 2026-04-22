'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Disclaimer } from '@/components/common/disclaimer'
import { LineChart, TrendingUp, BarChart3, DollarSign, Percent } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'

function calcPassiveIncome(patrimony: number, rate: number) {
  return (patrimony * rate) / 100 / 12
}

function calcInterestSensitivity(rate: number, duration: number, deltaRate: number) {
  return -duration * (deltaRate / (1 + rate / 100)) * 100
}

function buildGrowthProjection(initial: number, monthly: number, rate: number, years: number) {
  const points = []
  let balance = initial
  const monthlyRate = rate / 12 / 100

  for (let y = 0; y <= years; y++) {
    points.push({ year: y, value: Math.round(balance) })
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly
    }
  }
  return points
}

function fmtBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)
}

export default function EstimativasPage() {
  const [patrimony, setPatrimony] = useState(500000)
  const [monthly, setMonthly] = useState(2000)
  const [rate, setRate] = useState(13.65)
  const [years, setYears] = useState(15)
  const [duration, setDuration] = useState(5)
  const [deltaRate, setDeltaRate] = useState(1)

  const passiveIncome = calcPassiveIncome(patrimony, rate)
  const sensitivity = calcInterestSensitivity(rate / 100, duration, deltaRate / 100)
  const growthData = buildGrowthProjection(patrimony, monthly, rate, years)
  const finalValue = growthData[growthData.length - 1]?.value ?? 0
  const totalInvested = patrimony + monthly * years * 12

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LineChart className="h-6 w-6 text-primary" />
          Estimativas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Projeções ilustrativas baseadas em premissas informadas. Não constituem garantia de resultado.
        </p>
      </div>

      <Disclaimer variant="banner" text="Todas as estimativas abaixo são projeções ilustrativas baseadas nas premissas informadas. Os resultados são simulações educativas e não garantem rentabilidade futura. Os dados de mercado podem sofrer defasagem." />

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Premissas da análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Patrimônio atual (R$)</Label>
              <Input type="number" value={patrimony} onChange={e => setPatrimony(+e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Aporte mensal (R$)</Label>
              <Input type="number" value={monthly} onChange={e => setMonthly(+e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Taxa estimada (% a.a.)</Label>
              <Input type="number" step="0.1" value={rate} onChange={e => setRate(+e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horizonte (anos)</Label>
              <Input type="number" min={1} max={50} value={years} onChange={e => setYears(+e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: TrendingUp,
            label: 'Patrimônio estimado',
            value: fmtBRL(finalValue),
            sub: `em ${years} anos`,
            color: 'text-primary',
          },
          {
            icon: DollarSign,
            label: 'Renda passiva est.',
            value: fmtBRL(passiveIncome),
            sub: 'por mês (estimativa)',
            color: 'text-emerald-600',
          },
          {
            icon: BarChart3,
            label: 'Rendimento estimado',
            value: fmtBRL(finalValue - totalInvested),
            sub: `vs. ${fmtBRL(totalInvested)} investido`,
            color: 'text-amber-600',
          },
          {
            icon: Percent,
            label: 'Retorno total est.',
            value: `${(((finalValue / totalInvested) - 1) * 100).toFixed(0)}%`,
            sub: `no período de ${years} anos`,
            color: 'text-blue-600',
          },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Projeção de crescimento patrimonial</CardTitle>
          <CardDescription className="text-xs">
            Estimativa considerando {rate}% a.a. com aportes de {fmtBRL(monthly)}/mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} tickFormatter={v => `${v}a`} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v}
              />
              <Tooltip
                formatter={(val) => [fmtBRL(Number(val)), 'Patrimônio est.']}
                labelFormatter={l => `Ano ${l}`}
              />
              <ReferenceLine
                y={totalInvested}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                label={{ value: 'Total investido', fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#colorVal)"
                name="Patrimônio"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sensitivity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sensibilidade à variação de juros</CardTitle>
          <CardDescription className="text-xs">
            Impacto estimado de uma variação de {deltaRate}% na taxa sobre um título com duration de {duration} anos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Duration (anos)</Label>
              <Input type="number" step="0.5" value={duration} onChange={e => setDuration(+e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Variação de taxa (p.p.)</Label>
              <Input type="number" step="0.25" value={deltaRate} onChange={e => setDeltaRate(+e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600 font-medium">Alta de {deltaRate}p.p. na taxa</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{sensitivity.toFixed(2)}%</p>
              <p className="text-xs text-red-600">variação estimada no preço</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Queda de {deltaRate}p.p. na taxa</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">+{Math.abs(sensitivity).toFixed(2)}%</p>
              <p className="text-xs text-emerald-600">valorização estimada no preço</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Disclaimer variant="compact" text="Estimativas são projeções baseadas em premissas informadas e não constituem garantia. Rentabilidade passada não garante resultados futuros. Os dados podem sofrer defasagem conforme a fonte e o horário da última atualização." />
    </div>
  )
}
