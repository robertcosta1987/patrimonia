'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Disclaimer } from '@/components/common/disclaimer'
import {
  Target, ChevronRight, ChevronLeft, RefreshCw, AlertTriangle,
  CheckCircle2, BookOpen, Lightbulb, TrendingUp, Shield, Rocket,
  GraduationCap, Map, Star, Info,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────

type ComfortLevel = 'comfortable' | 'curious' | 'unfamiliar'
type Objetivo = 'crescimento' | 'renda_passiva' | 'preservacao'
type Horizonte = 'curto' | 'medio' | 'longo'
type Risco = 'baixa' | 'media' | 'alta'
type CaseType = 'A' | 'B' | 'C'

interface Answers {
  categories: {
    rendaFixa: ComfortLevel | ''
    fiis: ComfortLevel | ''
    acoes: ComfortLevel | ''
    fundos: ComfortLevel | ''
    cripto: ComfortLevel | ''
    internacional: ComfortLevel | ''
  }
  objetivo: Objetivo | ''
  horizonte: Horizonte | ''
  risco: Risco | ''
}

interface AllocationItem {
  categoria: string
  percentual: number
  tipo: 'base' | 'exploracao' | 'educativo'
  exemplos: string[]
  rationale: string
  comportamento: string
}

interface Strategy {
  caseType: CaseType
  titulo: string
  tagline: string
  resumoExecutivo: string
  alocacao: AllocationItem[]
  comportamentoGeral: string
  proximosPassos: string[]
  roadmapAprendizado: string[] | null
  alertas: string[]
}

// ─── Static data ─────────────────────────────────────────────────────

const INVESTMENT_CATEGORIES = [
  {
    key: 'rendaFixa' as const,
    label: 'Renda Fixa',
    subtitle: 'Tesouro Direto, CDB, LCI, LCA, CDI',
    icon: '🏦',
    description: 'Investimentos com retorno previsível e baixo risco',
  },
  {
    key: 'fiis' as const,
    label: 'Fundos Imobiliários',
    subtitle: 'FIIs — imóveis via bolsa com renda mensal',
    icon: '🏢',
    description: 'Renda de aluguéis distribuída mensalmente',
  },
  {
    key: 'acoes' as const,
    label: 'Ações',
    subtitle: 'Bolsa de Valores B3',
    icon: '📈',
    description: 'Participação em empresas listadas na bolsa',
  },
  {
    key: 'fundos' as const,
    label: 'Fundos de Investimento',
    subtitle: 'Multimercado, Renda Fixa, Ações',
    icon: '🎯',
    description: 'Gestão profissional de uma cesta de ativos',
  },
  {
    key: 'cripto' as const,
    label: 'Criptomoedas',
    subtitle: 'Bitcoin, Ethereum e outros',
    icon: '₿',
    description: 'Ativos digitais de alta volatilidade',
  },
  {
    key: 'internacional' as const,
    label: 'Investimentos Internacionais',
    subtitle: 'ETFs globais, BDRs, stocks EUA',
    icon: '🌎',
    description: 'Exposição a mercados fora do Brasil',
  },
]

const COMFORT_OPTIONS: { value: ComfortLevel; label: string; color: string }[] = [
  { value: 'comfortable', label: 'Conheço bem e me sinto confortável', color: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
  { value: 'curious', label: 'Conheço pouco, mas tenho interesse', color: 'border-amber-400 bg-amber-50 text-amber-800' },
  { value: 'unfamiliar', label: 'Não conheço / não me sinto confortável', color: 'border-slate-300 bg-slate-50 text-slate-600' },
]

const OBJETIVOS = [
  { value: 'crescimento' as Objetivo, label: 'Crescimento de Patrimônio', sub: 'Quero fazer meu dinheiro crescer no longo prazo', icon: TrendingUp, color: 'border-blue-400 bg-blue-50' },
  { value: 'renda_passiva' as Objetivo, label: 'Renda Passiva', sub: 'Quero receber rendimentos regulares para complementar minha renda', icon: Star, color: 'border-emerald-400 bg-emerald-50' },
  { value: 'preservacao' as Objetivo, label: 'Preservação de Capital', sub: 'Quero proteger meu patrimônio contra inflação com segurança', icon: Shield, color: 'border-slate-400 bg-slate-50' },
]

const HORIZONTES = [
  { value: 'curto' as Horizonte, label: 'Curto Prazo', sub: 'Até 2 anos — posso precisar do dinheiro em breve', icon: '⏱️' },
  { value: 'medio' as Horizonte, label: 'Médio Prazo', sub: '2 a 5 anos — tenho uma meta específica', icon: '📅' },
  { value: 'longo' as Horizonte, label: 'Longo Prazo', sub: 'Acima de 5 anos — estou construindo para o futuro', icon: '🏔️' },
]

const RISCOS = [
  { value: 'baixa' as Risco, label: 'Baixa', sub: 'Prefiro segurança mesmo com menos retorno. Não gosto de ver o saldo oscilar.', color: 'border-blue-400 bg-blue-50' },
  { value: 'media' as Risco, label: 'Média', sub: 'Aceito alguma volatilidade em troca de mais retorno potencial.', color: 'border-amber-400 bg-amber-50' },
  { value: 'alta' as Risco, label: 'Alta', sub: 'Foco em maximizar retorno. Entendo que haverá quedas no caminho.', color: 'border-rose-400 bg-rose-50' },
]

const TIPO_COLORS: Record<string, string> = {
  base: '#3b82f6',
  exploracao: '#f59e0b',
  educativo: '#22c55e',
}

const PALETTE = [
  '#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444','#06b6d4',
  '#ec4899','#84cc16','#f97316','#6366f1',
]

const CASE_META: Record<CaseType, { label: string; color: string; icon: any; description: string }> = {
  A: { label: 'Estratégia Personalizada', color: 'bg-blue-50 border-blue-200 text-blue-800', icon: Rocket, description: 'Carteira sofisticada baseada no seu conhecimento' },
  B: { label: 'Estratégia Híbrida', color: 'bg-amber-50 border-amber-200 text-amber-800', icon: Target, description: 'Base sólida com exploração gradual de novos ativos' },
  C: { label: 'Estratégia Educativa', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: GraduationCap, description: 'Início seguro com foco em aprendizado e crescimento' },
}

// ─── Main component ───────────────────────────────────────────────────

const initialAnswers: Answers = {
  categories: {
    rendaFixa: '' as ComfortLevel,
    fiis: '' as ComfortLevel,
    acoes: '' as ComfortLevel,
    fundos: '' as ComfortLevel,
    cripto: '' as ComfortLevel,
    internacional: '' as ComfortLevel,
  },
  objetivo: '',
  horizonte: '',
  risco: '',
}

type Step = 'loading' | 'intro' | 'categories' | 'goals' | 'generating' | 'result'

export default function EstrategiaPage() {
  const [step, setStep] = useState<Step>('loading')
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load saved strategy on mount
  useEffect(() => {
    fetch('/api/estrategia/save')
      .then(r => r.json())
      .then(data => {
        if (data.saved) {
          setStrategy(data.saved.strategy)
          setAnswers(data.saved.answers ?? initialAnswers)
          setSavedAt(data.saved.updated_at)
          setStep('result')
        } else {
          setStep('intro')
        }
      })
      .catch(() => setStep('intro'))
  }, [])

  function setComfort(key: keyof Answers['categories'], val: ComfortLevel | '') {
    setAnswers(prev => ({ ...prev, categories: { ...prev.categories, [key]: val } }))
  }

  const categoriesComplete = Object.values(answers.categories).every(v => v !== '')
  const goalsComplete = answers.objetivo !== '' && answers.horizonte !== '' && answers.risco !== ''

  async function generate() {
    setStep('generating')
    setError(null)
    try {
      const res = await fetch('/api/estrategia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setStep('goals')
      } else {
        setStrategy(data.strategy)
        setStep('result')
        setSavedAt(new Date().toISOString())
        // Save in background
        fetch('/api/estrategia/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, strategy: data.strategy, caseType: data.caseType }),
        }).catch(console.error)
      }
    } catch {
      setError('Falha na conexão. Tente novamente.')
      setStep('goals')
    }
  }

  function restart() {
    setAnswers(initialAnswers)
    setStrategy(null)
    setSavedAt(null)
    setError(null)
    setStep('intro')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Estratégia de Investimento
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Responda algumas perguntas e a IA monta uma estratégia personalizada para o seu perfil.
        </p>
      </div>

      {/* Progress bar */}
      {step === 'loading' && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
            Carregando sua estratégia…
          </CardContent>
        </Card>
      )}

      {step !== 'intro' && step !== 'result' && step !== 'loading' && (
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => {
            const stepIndex = step === 'categories' ? 0 : step === 'goals' ? 1 : 2
            return (
              <div key={i} className={cn(
                'h-1.5 flex-1 rounded-full transition-all',
                i <= stepIndex ? 'bg-primary' : 'bg-muted'
              )} />
            )
          })}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {step === 'categories' ? 'Passo 1 de 2' : step === 'goals' ? 'Passo 2 de 2' : 'Gerando…'}
          </span>
        </div>
      )}

      {/* ── INTRO ── */}
      {step === 'intro' && (
        <div className="space-y-4">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Monte sua Estratégia com IA</h2>
                <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto leading-relaxed">
                  Em menos de 2 minutos, vamos entender seu conhecimento e objetivos para construir
                  uma estratégia de investimento personalizada — como uma consulta com um assessor financeiro sênior.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
                {[
                  { icon: '🧠', label: 'Avaliação de conhecimento' },
                  { icon: '🎯', label: 'Estratégia personalizada' },
                  { icon: '📊', label: 'Alocação com rationale' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg bg-muted/50 text-xs font-medium">
                    <div className="text-xl mb-1">{item.icon}</div>
                    {item.label}
                  </div>
                ))}
              </div>
              <Button size="lg" onClick={() => setStep('categories')} className="gap-2 min-w-[200px]">
                Começar <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          <Disclaimer variant="compact" text="Este recurso é para fins educativos. As estratégias geradas não constituem recomendação financeira individualizada." />
        </div>
      )}

      {/* ── STEP 1: CATEGORIES ── */}
      {step === 'categories' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Seu nível com cada tipo de investimento</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Seja honesto — não existe resposta certa ou errada. Isso ajuda a IA a montar algo que faz sentido para você.
            </p>
          </div>

          <div className="space-y-3">
            {INVESTMENT_CATEGORIES.map(cat => (
              <Card key={cat.key} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 p-4 border-b">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.subtitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{cat.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
                    {COMFORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setComfort(cat.key, opt.value)}
                        className={cn(
                          'px-4 py-3 text-xs text-left transition-all font-medium flex items-center gap-2',
                          answers.categories[cat.key] === opt.value
                            ? cn('border-2 rounded-none', opt.color)
                            : 'hover:bg-muted/60 text-muted-foreground'
                        )}
                      >
                        <div className={cn(
                          'h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                          answers.categories[cat.key] === opt.value ? 'border-current' : 'border-muted-foreground/30'
                        )}>
                          {answers.categories[cat.key] === opt.value && (
                            <div className="h-2 w-2 rounded-full bg-current" />
                          )}
                        </div>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep('goals')}
              disabled={!categoriesComplete}
              className="gap-2"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: GOALS ── */}
      {step === 'goals' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold">Seus objetivos e tolerância a risco</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Mais três perguntas rápidas para completar seu perfil.</p>
          </div>

          {/* Objetivo */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">Qual é seu principal objetivo financeiro?</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {OBJETIVOS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setAnswers(prev => ({ ...prev, objetivo: o.value }))}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all space-y-2',
                    answers.objetivo === o.value
                      ? cn('border-primary', o.color)
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                  )}
                >
                  <o.icon className={cn('h-5 w-5', answers.objetivo === o.value ? 'text-primary' : 'text-muted-foreground')} />
                  <div>
                    <p className="font-semibold text-sm">{o.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{o.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Horizonte */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">Qual é seu horizonte de investimento?</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {HORIZONTES.map(h => (
                <button
                  key={h.value}
                  onClick={() => setAnswers(prev => ({ ...prev, horizonte: h.value }))}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    answers.horizonte === h.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                  )}
                >
                  <div className="text-2xl mb-2">{h.icon}</div>
                  <p className="font-semibold text-sm">{h.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{h.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Risco */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">Como você se sente em relação ao risco?</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {RISCOS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setAnswers(prev => ({ ...prev, risco: r.value }))}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    answers.risco === r.value
                      ? cn('border-primary', r.color)
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                  )}
                >
                  <p className="font-semibold text-sm">{r.label} tolerância</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('categories')} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button onClick={generate} disabled={!goalsComplete} size="lg" className="gap-2 min-w-[200px]">
              Gerar minha estratégia <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── GENERATING ── */}
      {step === 'generating' && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <RefreshCw className="h-3 w-3 text-white animate-spin" />
              </div>
            </div>
            <div>
              <p className="font-bold text-lg">Construindo sua estratégia…</p>
              <p className="text-sm text-muted-foreground mt-1">
                A IA está analisando seu perfil e montando uma carteira personalizada.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              {['Avaliando perfil', 'Selecionando classes', 'Calculando alocação', 'Finalizando'].map((label, i) => (
                <div
                  key={label}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground animate-pulse"
                  style={{ animationDelay: `${i * 400}ms` }}
                >
                  {label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── RESULT ── */}
      {step === 'result' && strategy && (
        <div className="space-y-5">
          {/* Saved banner */}
          {savedAt && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Estratégia salva · última atualização{' '}
                  <strong>{new Date(savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={restart} className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shrink-0">
                <RefreshCw className="h-3.5 w-3.5" /> Refazer quiz
              </Button>
            </div>
          )}

          {/* Case badge + title */}
          <div className="space-y-3">
            {(() => {
              const meta = CASE_META[strategy.caseType]
              const Icon = meta.icon
              return (
                <div className={cn('flex items-center gap-3 p-4 rounded-xl border-2', meta.color)}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{meta.label}</p>
                    <p className="text-xs opacity-80">{meta.description}</p>
                  </div>
                </div>
              )
            })()}

            <div>
              <h2 className="text-xl font-bold">{strategy.titulo}</h2>
              <p className="text-muted-foreground text-sm mt-0.5 italic">{strategy.tagline}</p>
            </div>
          </div>

          {/* Executive summary */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Resumo Executivo</p>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{strategy.resumoExecutivo}</p>
            </CardContent>
          </Card>

          {/* Allocation */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Alocação Sugerida</CardTitle>
                <CardDescription className="text-xs">
                  {strategy.caseType === 'B' && (
                    <span className="flex gap-3">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full inline-block bg-blue-500" /> Base da estratégia</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full inline-block bg-amber-500" /> Exploração e aprendizado</span>
                    </span>
                  )}
                  {strategy.caseType === 'A' && 'Alocação personalizada por classe de ativo'}
                  {strategy.caseType === 'C' && 'Estratégia educativa progressiva'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={strategy.alocacao}
                      dataKey="percentual"
                      nameKey="categoria"
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={2}
                    >
                      {strategy.alocacao.map((item, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val}%`, 'Alocação']} />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Como a carteira se comporta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{strategy.comportamentoGeral}</p>

                {/* Alertas */}
                {strategy.alertas?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                      <Info className="h-3.5 w-3.5" /> Pontos de atenção
                    </p>
                    {strategy.alertas.map((alerta, i) => (
                      <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">{alerta}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-class breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Detalhamento por classe de ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strategy.alocacao.map((item, i) => (
                  <div key={i} className="rounded-xl border overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeft: `4px solid ${PALETTE[i % PALETTE.length]}` }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm">{item.categoria}</p>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-2 py-0',
                              item.tipo === 'base' ? 'border-blue-300 text-blue-700 bg-blue-50'
                              : item.tipo === 'exploracao' ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                            )}
                          >
                            {item.tipo === 'base' ? 'Base' : item.tipo === 'exploracao' ? 'Exploração' : 'Educativo'}
                          </Badge>
                          <span className="font-bold text-lg ml-auto" style={{ color: PALETTE[i % PALETTE.length] }}>
                            {item.percentual}%
                          </span>
                        </div>
                        {/* Allocation bar */}
                        <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${item.percentual}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3 pt-2 bg-muted/20 grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Racional</p>
                        <p className="text-xs leading-relaxed">{item.rationale}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Comportamento</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{item.comportamento}</p>
                        {item.exemplos?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.exemplos.map((ex, j) => (
                              <span key={j} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{ex}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Map className="h-4 w-4 text-primary" /> Próximos passos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {strategy.proximosPassos.map((passo, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed pt-0.5">{passo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Learning roadmap — only Case C */}
          {strategy.roadmapAprendizado && strategy.roadmapAprendizado.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-800">
                  <BookOpen className="h-4 w-4" /> Roteiro de Aprendizado
                </CardTitle>
                <CardDescription className="text-xs text-emerald-700">
                  O que estudar para evoluir sua estratégia com o tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-emerald-200" />
                  <div className="space-y-3">
                    {strategy.roadmapAprendizado.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 pl-2 relative">
                        <div className="h-6 w-6 rounded-full border-2 border-emerald-400 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 z-10">
                          {i + 1}
                        </div>
                        <p className="text-sm leading-relaxed pt-0.5 text-emerald-900">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={restart} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refazer quiz
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setStep('goals')}>
              <ChevronLeft className="h-4 w-4" /> Ajustar respostas
            </Button>
          </div>

          <Disclaimer
            variant="compact"
            text="Esta estratégia é gerada por IA com fins exclusivamente educativos e analíticos. Não constitui recomendação de investimento, aconselhamento financeiro ou tributário individualizado. Consulte um assessor habilitado pela CVM antes de tomar decisões de investimento."
          />
        </div>
      )}
    </div>
  )
}
