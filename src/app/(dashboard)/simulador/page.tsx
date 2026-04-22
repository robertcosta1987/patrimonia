'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SimulationDisclaimer } from '@/components/common/disclaimer'
import { runSimulation, getDefaultRateForAssetType } from '@/lib/analytics/simulator'
import { SimulationResult } from '@/types'
import { Calculator, TrendingUp, DollarSign, BarChart3 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'

const schema = z.object({
  initial_amount: z.number().min(0),
  monthly_contribution: z.number().min(0),
  period_years: z.number().min(1).max(50),
  annual_rate: z.number().min(0.1).max(50),
  asset_type: z.string(),
  reinvest: z.boolean(),
})

type FormData = z.infer<typeof schema>

function fmtBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function fmtPct(val: number) {
  return `${val.toFixed(2)}%`
}

const ASSET_TYPES = [
  { value: 'tesouro', label: 'Tesouro Direto' },
  { value: 'renda_fixa', label: 'Renda Fixa' },
  { value: 'fii', label: 'Fundos Imobiliários' },
  { value: 'acao', label: 'Ações' },
  { value: 'debenture', label: 'Debêntures' },
  { value: 'generic', label: 'Taxa personalizada' },
]

export default function SimuladorPage() {
  const [result, setResult] = useState<SimulationResult | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      initial_amount: 10000,
      monthly_contribution: 500,
      period_years: 10,
      annual_rate: 13.65,
      asset_type: 'generic',
      reinvest: true,
    },
  })

  const watchAssetType = watch('asset_type')

  function onAssetTypeChange(val: string | null) {
    if (!val) return
    setValue('asset_type', val)
    const defaultRate = getDefaultRateForAssetType(val)
    setValue('annual_rate', defaultRate)
  }

  function onSubmit(data: FormData) {
    const sim = runSimulation({
      initial_amount: data.initial_amount,
      monthly_contribution: data.monthly_contribution,
      period_months: data.period_years * 12,
      annual_rate: data.annual_rate,
      asset_type: data.asset_type as 'generic',
      reinvest: data.reinvest,
    })
    setResult(sim)
  }

  const chartData = result
    ? result.base.data_points.map((pt) => ({
        mes: pt.month,
        base: result.base.data_points.find(p => p.month === pt.month)?.amount ?? 0,
        conservador: result.conservative.data_points.find(p => p.month === pt.month)?.amount ?? 0,
        otimista: result.optimistic.data_points.find(p => p.month === pt.month)?.amount ?? 0,
      }))
    : []

  const totalInvested = result?.base.total_invested

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Simulador de Aportes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Projete o crescimento do seu patrimônio com aportes regulares. Resultados são estimativas educativas.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Parâmetros da simulação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo de investimento</Label>
                <Select value={watchAssetType} onValueChange={onAssetTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor inicial (R$)</Label>
                <Input type="number" step="100" {...register('initial_amount', { valueAsNumber: true })} />
                {errors.initial_amount && <p className="text-xs text-destructive">{errors.initial_amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Aporte mensal (R$)</Label>
                <Input type="number" step="100" {...register('monthly_contribution', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Prazo (anos)</Label>
                <Input type="number" min={1} max={50} {...register('period_years', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Rentabilidade estimada (% a.a.)</Label>
                <Input type="number" step="0.1" {...register('annual_rate', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">Taxa base para o cenário moderado</p>
              </div>
              <div className="flex items-center justify-between">
                <Label>Reinvestir rendimentos</Label>
                <Switch checked={watch('reinvest')} onCheckedChange={v => setValue('reinvest', v)} />
              </div>
              <Button type="submit" className="w-full">Simular</Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {/* Scenario Cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { scenario: result.conservative, label: 'Conservador', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                  { scenario: result.base, label: 'Base', color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
                  { scenario: result.optimistic, label: 'Otimista', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                ].map(({ scenario, label, color, bg }) => (
                  <Card key={label} className={`border-2 ${bg}`}>
                    <CardContent className="p-3 text-center">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</p>
                      <p className={`text-lg font-bold mt-1 ${color}`}>{fmtBRL(scenario.final_amount)}</p>
                      <p className="text-xs text-muted-foreground">{fmtPct(scenario.annual_rate)} a.a.</p>
                      <div className="mt-2 pt-2 border-t text-xs space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Investido</span>
                          <span className="font-medium">{fmtBRL(scenario.total_invested)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rendimento</span>
                          <span className={`font-medium ${color}`}>{fmtBRL(scenario.total_yield)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Evolução patrimonial (3 cenários)</CardTitle>
                  <CardDescription className="text-xs">Estimativas em R$ ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 10 }}
                        tickFormatter={v => `${Math.round(v / 12)}a`}
                        label={{ value: 'Anos', position: 'insideBottom', offset: -2, fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v}
                      />
                      <Tooltip
                        formatter={(val, name) => [fmtBRL(Number(val)), String(name)]}
                        labelFormatter={l => `Mês ${l} (${Math.round(Number(l) / 12)} anos)`}
                      />
                      <Legend />
                      {totalInvested && (
                        <ReferenceLine y={totalInvested} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Total investido', fontSize: 10 }} />
                      )}
                      <Line type="monotone" dataKey="conservador" stroke="#3b82f6" strokeWidth={2} dot={false} name="Conservador" />
                      <Line type="monotone" dataKey="base" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} name="Base" />
                      <Line type="monotone" dataKey="otimista" stroke="#10b981" strokeWidth={2} dot={false} name="Otimista" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-64 text-center text-muted-foreground space-y-3 border-2 border-dashed rounded-xl p-8">
              <BarChart3 className="h-12 w-12 text-muted" />
              <div>
                <p className="font-medium">Configure os parâmetros</p>
                <p className="text-sm">e clique em Simular para ver as projeções</p>
              </div>
            </div>
          )}

          <SimulationDisclaimer />
        </div>
      </div>
    </div>
  )
}
