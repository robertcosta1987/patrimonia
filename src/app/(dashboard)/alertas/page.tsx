'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Bell, BellOff, Plus, Trash2, CheckCheck, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Alert, AlertEvent } from '@/types'

const ALERT_TYPE_LABELS: Record<string, string> = {
  preco: 'Variação de Preço',
  dividend_yield: 'Dividend Yield',
  pvp: 'P/VP',
  vencimento: 'Vencimento Próximo',
  taxa: 'Mudança de Taxa',
  ranking: 'Score no Ranking',
}

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ticker: '', alert_type: 'preco', condition: 'above', threshold: '' })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [alertsRes, eventsRes] = await Promise.all([
      supabase.from('alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('alert_events').select('*').order('triggered_at', { ascending: false }).limit(20),
    ])
    setAlerts((alertsRes.data ?? []) as Alert[])
    setEvents((eventsRes.data ?? []) as AlertEvent[])
    setLoading(false)
  }

  async function createAlert() {
    if (!form.ticker || !form.threshold) return toast.error('Preencha todos os campos')
    const { error } = await supabase.from('alerts').insert({
      ticker: form.ticker.toUpperCase(),
      alert_type: form.alert_type,
      condition: form.condition,
      threshold: parseFloat(form.threshold),
    })
    if (error) return toast.error('Erro ao criar alerta')
    toast.success('Alerta criado!')
    setForm({ ticker: '', alert_type: 'preco', condition: 'above', threshold: '' })
    setShowForm(false)
    loadData()
  }

  async function deleteAlert(id: string) {
    await supabase.from('alerts').update({ is_active: false }).eq('id', id)
    toast.success('Alerta removido')
    loadData()
  }

  async function markAllRead() {
    await supabase.from('alert_events').update({ is_read: true }).eq('is_read', false)
    toast.success('Notificações marcadas como lidas')
    loadData()
  }

  const unreadCount = events.filter(e => !e.is_read).length

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Alertas
            {unreadCount > 0 && (
              <Badge className="bg-primary text-white">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Configure alertas analíticos para seus ativos favoritos.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo Alerta
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurar novo alerta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ticker / Ativo</Label>
                <Input
                  placeholder="Ex: PETR4, MXRF11"
                  value={form.ticker}
                  onChange={e => setForm(p => ({ ...p, ticker: e.target.value }))}
                  className="uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de alerta</Label>
                <Select value={form.alert_type} onValueChange={v => setForm(p => ({ ...p, alert_type: v ?? 'preco' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALERT_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Condição</Label>
                <Select value={form.condition} onValueChange={v => setForm(p => ({ ...p, condition: v ?? 'above' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Acima de</SelectItem>
                    <SelectItem value="below">Abaixo de</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Limite</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 12.5"
                  value={form.threshold}
                  onChange={e => setForm(p => ({ ...p, threshold: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createAlert}>Criar alerta</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Active Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Alertas Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center gap-2 p-2.5 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{alert.ticker}</span>
                        <Badge variant="secondary" className="text-[10px]">{ALERT_TYPE_LABELS[alert.alert_type]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alert.condition === 'above' ? 'Acima de' : 'Abaixo de'} {alert.threshold}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <BellOff className="h-8 w-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta configurado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              Notificações
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar todas lidas
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map(event => (
                  <div key={event.id} className={`p-2.5 rounded-lg border ${!event.is_read ? 'bg-primary/5 border-primary/20' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className={`h-3.5 w-3.5 ${!event.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                      {event.ticker && <span className="font-bold text-xs">{event.ticker}</span>}
                      {!event.is_read && <Badge className="text-[10px] bg-primary/10 text-primary border-0">Novo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(new Date(event.triggered_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Bell className="h-8 w-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sem notificações recentes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground italic">
        ⚠️ Os alertas são educativos e analíticos. Não constituem recomendação de compra ou venda. A avaliação dos alertas depende da atualização dos dados de mercado.
      </p>
    </div>
  )
}
