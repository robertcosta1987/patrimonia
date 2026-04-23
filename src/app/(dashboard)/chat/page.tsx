'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Disclaimer } from '@/components/common/disclaimer'
import { MessageSquare, Send, Loader2, Bot, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Explique o que é IPCA+ de forma simples',
  'Qual a diferença entre CDB e LCI?',
  'Como funciona um FII de papel?',
  'Simule investir R$ 1.000/mês por 10 anos',
  'Explique marcação a mercado',
  'Quais os riscos de debêntures?',
]

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
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-muted text-foreground rounded-tl-sm'
      )}>
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>
            {line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}
            {i < msg.content.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o PatrimonIA, seu copiloto educacional de investimentos no mercado brasileiro. Como posso ajudar hoje?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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
        <div className="h-[480px] overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
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
