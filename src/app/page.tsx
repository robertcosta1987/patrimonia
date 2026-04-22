import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp, BarChart3, Calculator, MessageSquare, BookOpen,
  Shield, Bell, LineChart, ChevronRight, Activity, Briefcase
} from 'lucide-react'

const FEATURES = [
  { icon: TrendingUp, title: 'Rankings Completos', desc: 'Ações, FIIs, Tesouro Direto, Renda Fixa e Debêntures com scores analíticos.' },
  { icon: BarChart3, title: 'Perfil do Investidor', desc: 'Classificação por perfil com sugestão de alocação educativa.' },
  { icon: Calculator, title: 'Simulador de Aportes', desc: 'Projete seu patrimônio em 3 cenários: conservador, base e otimista.' },
  { icon: Briefcase, title: 'Carteira-Modelo', desc: 'Carteiras educativas compatíveis com seu perfil de investidor.' },
  { icon: MessageSquare, title: 'Chat IA', desc: 'Pergunte sobre investimentos em português e receba análises educativas.' },
  { icon: BookOpen, title: 'Glossário Completo', desc: '20+ termos do mercado com definições, exemplos e por que importam.' },
  { icon: Bell, title: 'Alertas Analíticos', desc: 'Configure alertas para preço, DY, P/VP e taxas de ativos.' },
  { icon: LineChart, title: 'Estimativas', desc: 'Projeções de renda passiva, sensibilidade a juros e crescimento patrimonial.' },
]

const ASSET_CLASSES = [
  { label: 'Ações', count: '15+', color: 'bg-blue-100 text-blue-700' },
  { label: 'FIIs', count: '12+', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'Tesouro Direto', count: '6 títulos', color: 'bg-amber-100 text-amber-700' },
  { label: 'CDB/LCI/LCA', count: '10+', color: 'bg-purple-100 text-purple-700' },
  { label: 'Debêntures', count: '8+', color: 'bg-rose-100 text-rose-700' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">PatrimonIA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button>Criar conta</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 max-w-5xl mx-auto text-center">
        <Badge className="mb-6 bg-primary/20 text-primary border-primary/30">
          <Activity className="h-3 w-3 mr-1" />
          Plataforma educacional e analítica · Mercado Brasileiro
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
          Inteligência de<br />
          <span className="text-primary">Investimentos</span> para o<br />
          mercado brasileiro
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          Análise, comparação, simulação e organização de investimentos no Brasil —
          com IA, dados de mercado e ferramentas educativas de ponta.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link href="/register">
            <Button size="lg" className="px-8">
              Começar gratuitamente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-white/5">
              Já tenho conta
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-10">
          {ASSET_CLASSES.map(ac => (
            <Badge key={ac.label} className={`${ac.color} border-0`}>
              {ac.label} · {ac.count}
            </Badge>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 pb-16 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white">8 módulos completos em uma plataforma premium</h2>
          <p className="text-slate-400 mt-2 text-sm">Tudo que você precisa para entender e organizar seus investimentos</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(feat => (
            <div key={feat.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 mb-3">
                <feat.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-white text-sm">{feat.title}</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 pb-16 max-w-4xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Shield className="h-8 w-8 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">Educacional por natureza, analítico por essência</h3>
          <p className="text-slate-400 mt-3 text-sm max-w-2xl mx-auto">
            PatrimonIA é uma plataforma de educação e análise financeira. Todas as informações, scores, simulações e
            carteiras têm caráter educativo e analítico.{' '}
            <strong className="text-white">Não somos corretora, assessoria ou consultoria regulamentada.</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-400">
            {[
              '✓ Análise baseada em dados públicos',
              '✓ Simulações e estimativas com transparência',
              '✓ Carteiras educativas, não recomendações',
              '✓ Disclaimers em toda a plataforma',
            ].map(item => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Comece a analisar seus investimentos hoje</h2>
        <p className="text-slate-400 text-sm mb-6">Gratuito. Sem cartão de crédito.</p>
        <Link href="/register">
          <Button size="lg" className="px-10">Criar conta gratuita <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 text-center">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} PatrimonIA · Plataforma educacional e analítica ·
          As informações têm caráter educativo e não constituem recomendação individual de investimento.
        </p>
      </footer>
    </div>
  )
}
