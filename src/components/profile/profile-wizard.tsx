'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Disclaimer } from '@/components/common/disclaimer'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { calculateProfile } from '@/lib/analytics/profile-calculator'
import { Loader2, CheckCircle2, TrendingUp, Shield, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const schema = z.object({
  age: z.number().min(18).max(100),
  monthly_income: z.number().min(0),
  patrimony: z.number().min(0),
  main_goal: z.enum(['preservacao', 'renda', 'crescimento', 'equilibrio']),
  investment_horizon: z.enum(['curto', 'medio', 'longo']),
  risk_tolerance: z.number().min(1).max(5),
  experience: z.enum(['iniciante', 'intermediario', 'avancado']),
})

type FormData = z.infer<typeof schema>

const STEPS = [
  { title: 'Dados Pessoais', desc: 'Informações básicas sobre você' },
  { title: 'Objetivos', desc: 'O que você busca com os investimentos' },
  { title: 'Tolerância a Risco', desc: 'Sua relação com oscilações de mercado' },
  { title: 'Resultado', desc: 'Seu perfil de investidor' },
]

interface ProfileWizardProps {
  initialProfile?: Record<string, unknown> | null
  userId: string
}

export function ProfileWizard({ initialProfile, userId }: ProfileWizardProps) {
  const [step, setStep] = useState(initialProfile ? 3 : 0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(initialProfile ? {
    profile: initialProfile.profile as string,
    risk_score: initialProfile.risk_score as number,
    allocation_renda_fixa: initialProfile.allocation_renda_fixa as number,
    allocation_fii: initialProfile.allocation_fii as number,
    allocation_acoes: initialProfile.allocation_acoes as number,
    allocation_caixa: initialProfile.allocation_caixa as number,
    explanation: '',
  } : null)
  const router = useRouter()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialProfile ? {
      age: initialProfile.age as number,
      monthly_income: initialProfile.monthly_income as number,
      patrimony: initialProfile.patrimony as number,
      main_goal: initialProfile.main_goal as FormData['main_goal'],
      investment_horizon: initialProfile.investment_horizon as FormData['investment_horizon'],
      risk_tolerance: initialProfile.risk_tolerance as number,
      experience: initialProfile.experience as FormData['experience'],
    } : {
      risk_tolerance: 3,
    },
  })

  const watchedGoal = watch('main_goal')
  const watchedHorizon = watch('investment_horizon')
  const watchedExperience = watch('experience')

  async function onSubmit(data: FormData) {
    setLoading(true)
    const profile = calculateProfile(data)
    setResult(profile)

    const supabase = createClient()
    const { explanation: _explanation, ...profileToSave } = profile
    const { error } = await supabase.from('investor_profiles').upsert({
      user_id: userId,
      ...data,
      ...profileToSave,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      toast.error('Erro ao salvar perfil')
    } else {
      toast.success('Perfil salvo com sucesso!')
      setStep(3)
    }
    setLoading(false)
  }

  const progressPct = ((step + 1) / STEPS.length) * 100

  const profileConfig = {
    conservador: { icon: Shield, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Conservador', desc: 'Prioridade em segurança e previsibilidade' },
    moderado: { icon: BarChart3, color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Moderado', desc: 'Equilíbrio entre segurança e crescimento' },
    arrojado: { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Arrojado', desc: 'Foco em crescimento com maior tolerância a risco' },
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {step < 3 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Etapa {step + 1} de {STEPS.length}</span>
            <span>{STEPS[step].title}</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Personal */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[0].title}</CardTitle>
              <CardDescription>{STEPS[0].desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Idade</Label>
                <Input type="number" placeholder="Ex: 35" {...register('age', { valueAsNumber: true })} />
                {errors.age && <p className="text-xs text-destructive">{errors.age.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Renda mensal (R$)</Label>
                <Input type="number" placeholder="Ex: 8000" {...register('monthly_income', { valueAsNumber: true })} />
                {errors.monthly_income && <p className="text-xs text-destructive">{errors.monthly_income.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Patrimônio aproximado (R$)</Label>
                <Input type="number" placeholder="Ex: 100000" {...register('patrimony', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">Inclua todos os seus investimentos e economias</p>
              </div>
              <Button type="button" onClick={() => setStep(1)} className="w-full">Próxima etapa</Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Goals */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[1].title}</CardTitle>
              <CardDescription>{STEPS[1].desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Qual seu principal objetivo?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'preservacao', label: 'Preservar capital', desc: 'Manter o poder de compra' },
                    { value: 'renda', label: 'Gerar renda', desc: 'Renda passiva regular' },
                    { value: 'crescimento', label: 'Crescer patrimônio', desc: 'Maximizar retorno longo prazo' },
                    { value: 'equilibrio', label: 'Equilíbrio', desc: 'Renda e crescimento' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('main_goal', opt.value as FormData['main_goal'])}
                      className={`text-left p-3 rounded-lg border-2 transition-all ${watchedGoal === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Horizonte de investimento</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'curto', label: 'Curto', desc: '< 2 anos' },
                    { value: 'medio', label: 'Médio', desc: '2 a 5 anos' },
                    { value: 'longo', label: 'Longo', desc: '> 5 anos' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('investment_horizon', opt.value as FormData['investment_horizon'])}
                      className={`text-center p-3 rounded-lg border-2 transition-all ${watchedHorizon === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)} className="flex-1">Voltar</Button>
                <Button type="button" onClick={() => setStep(2)} className="flex-1">Próxima etapa</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Risk */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[2].title}</CardTitle>
              <CardDescription>{STEPS[2].desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Se sua carteira cair 20% em 1 mês, você:</Label>
                <div className="space-y-2">
                  {[
                    { value: '1', label: 'Venderia tudo para evitar mais perdas' },
                    { value: '2', label: 'Ficaria muito preocupado e reduziria posições' },
                    { value: '3', label: 'Manteria a posição e esperaria a recuperação' },
                    { value: '4', label: 'Manteria e aproveitaria para aportar mais' },
                    { value: '5', label: 'Aproveitaria a queda para comprar mais agressivamente' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('risk_tolerance', parseInt(opt.value) as FormData['risk_tolerance'])}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${watch('risk_tolerance') === parseInt(opt.value) ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${watch('risk_tolerance') === parseInt(opt.value) ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{opt.value}</span>
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Experiência com investimentos</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'iniciante', label: 'Iniciante', desc: 'Primeiros passos' },
                    { value: 'intermediario', label: 'Intermediário', desc: 'Já invisto há algum tempo' },
                    { value: 'avancado', label: 'Avançado', desc: 'Mercado financeiro é rotina' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('experience', opt.value as FormData['experience'])}
                      className={`text-center p-3 rounded-lg border-2 transition-all ${watchedExperience === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Calcular perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Seu Perfil de Investidor
                </CardTitle>
                <CardDescription>Análise baseada nas suas respostas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {result.profile && (
                  <div className="flex items-center justify-between p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                    <div>
                      <p className="text-sm text-muted-foreground">Classificação</p>
                      <p className="text-2xl font-bold mt-0.5 capitalize">{result.profile}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Score de risco</p>
                      <p className="text-2xl font-bold">{result.risk_score}<span className="text-base font-normal text-muted-foreground">/100</span></p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-3">Alocação educativa sugerida</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Renda Fixa', value: result.allocation_renda_fixa, color: 'bg-blue-500' },
                      { label: 'FIIs', value: result.allocation_fii, color: 'bg-emerald-500' },
                      { label: 'Ações', value: result.allocation_acoes, color: 'bg-amber-500' },
                      { label: 'Caixa / Reserva', value: result.allocation_caixa, color: 'bg-slate-400' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">{item.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                        </div>
                        <span className="text-xs font-semibold w-8 text-right">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {result.explanation && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{result.explanation}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(0)} className="flex-1">Refazer</Button>
                  <Button onClick={() => router.push('/carteira')} className="flex-1">Ver Carteira-Modelo</Button>
                </div>
              </CardContent>
            </Card>
            <Disclaimer variant="banner" text="Este é um perfil educativo baseado em suas respostas. Não constitui recomendação individual de investimento. Consulte um assessor habilitado para decisões personalizadas." />
          </div>
        )}
      </form>
    </div>
  )
}
