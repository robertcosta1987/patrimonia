'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Disclaimer } from '@/components/common/disclaimer'
import { MessageSquare, Send, Loader2, Bot, User, Sparkles, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Monte uma carteira hipotética para meu perfil',
  'Quais FIIs têm DY acima de 10% e P/VP abaixo de 1?',
  'Compare CDB 120% CDI vs Tesouro IPCA+ 2035',
  'Simule investir R$ 1.000/mês por 10 anos',
  'Explique marcação a mercado com exemplos',
  'Quais os riscos de debêntures incentivadas?',
]

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="bg-black/10 px-1 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function isTableSeparator(line: string) {
  return /^\|[\s|:\-]+\|$/.test(line.trim())
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const cls =
        level === 1
          ? 'font-bold text-base mt-3 mb-1'
          : level === 2
          ? 'font-bold text-sm mt-2 mb-0.5'
          : 'font-semibold text-sm mt-1'
      elements.push(<div key={key++} className={cls}>{renderInline(text)}</div>)
      i++
      continue
    }

    // Table
    if (line.startsWith('|') && !isTableSeparator(line)) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!isTableSeparator(lines[i])) tableLines.push(lines[i])
        i++
      }
      if (tableLines.length > 0) {
        const parseRow = (row: string) =>
          row.split('|').slice(1, -1).map(c => c.trim())
        const headers = parseRow(tableLines[0])
        const rows = tableLines.slice(1).map(parseRow)
        elements.push(
          <div key={key++} className="overflow-x-auto my-2 rounded border border-current/15">
            <table className="text-xs w-full border-collapse min-w-[260px]">
              <thead>
                <tr className="bg-black/5">
                  {headers.map((h, j) => (
                    <th key={j} className="text-left py-1.5 px-2 font-semibold border-b border-current/15 whitespace-nowrap">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, j) => (
                  <tr key={j} className="border-b border-current/10 last:border-0 even:bg-black/[0.03]">
                    {row.map((cell, k) => (
                      <td key={k} className="py-1.5 px-2">{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Bullet list
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s/, ''))
        i++
      }
      elements.push(
        <ul key={key++} className="list-disc list-outside ml-4 space-y-0.5 my-1">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      )
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      elements.push(
        <ol key={key++} className="list-decimal list-outside ml-4 space-y-0.5 my-1">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ol>
      )
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="border-current/20 my-2" />)
      i++
      continue
    }

    // Empty line - small spacer
    if (!line.trim()) {
      i++
      continue
    }

    // Regular paragraph
    elements.push(<p key={key++} className="leading-relaxed">{renderInline(line)}</p>)
    i++
  }

  return <div className="space-y-1 text-sm">{elements}</div>
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary' : 'bg-muted'
      )}>
        {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className={cn(
        'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-muted text-foreground rounded-tl-sm'
      )}>
        <MarkdownContent content={msg.content} />
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o **PatrimonIA**, seu copiloto educacional de investimentos no mercado brasileiro. 📊\n\nPosso ajudar com:\n- Comparações entre ativos (com tabelas detalhadas)\n- Simulações e projeções de retorno\n- Análise de FIIs, ações, renda fixa e Tesouro Direto\n- Carteiras-modelo educativas por perfil\n\nComo posso ajudar hoje?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [sessionId, setSessionId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const message = text ?? input.trim()
    if (!message || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: message }])
    setLoading(true)
    const isPortfolioRequest = /carteira|portf|sugir|recomen|screener|invest|monte|montar|ativo|ação|fii|fi.infra/i.test(message)
    setLoadingMsg(isPortfolioRequest ? '🔍 Consultando base de dados e analisando ativos…' : '')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          messages: messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0),
        }),
      })

      const data = await res.json()
      if (data._mode) console.log('[chat] mode:', data._mode, data._error ?? '')
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      if (data.session_id && !sessionId) setSessionId(data.session_id)
    } catch (err) {
      console.error('[chat] fetch error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Falha na conexão. Verifique sua internet e tente novamente.' }])
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Chat PatrimonIA
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pergunte sobre investimentos, indicadores, estratégias e mais — em Português.
        </p>
      </div>

      <Card className="overflow-hidden">
        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                {loadingMsg ? (
                  <>
                    <Database className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
                    <span className="text-xs text-muted-foreground">{loadingMsg}</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </>
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Sugestões de perguntas
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-3 flex gap-2">
          <Textarea
            placeholder="Pergunte sobre investimentos, indicadores, FIIs, ações…"
            className="resize-none min-h-[44px] max-h-32"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button size="icon" onClick={() => sendMessage()} disabled={loading || !input.trim()} className="shrink-0 h-11 w-11">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>

      <Disclaimer variant="compact" text="As respostas do chat têm fins educativos e analíticos. Não constituem recomendação individual de investimento. Consulte um assessor de investimentos habilitado para decisões personalizadas." />
    </div>
  )
}
