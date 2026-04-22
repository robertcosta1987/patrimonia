'use client'

import { useState, useMemo } from 'react'
import { GLOSSARY_TERMS } from '@/lib/data/glossary'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { BookOpen, Search, Lightbulb, HelpCircle } from 'lucide-react'

const CATEGORIES = Array.from(new Set(GLOSSARY_TERMS.map(t => t.category)))

export default function GlossarioPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return GLOSSARY_TERMS.filter(term => {
      const matchesSearch = !search || [term.term, term.definition, ...term.tags]
        .some(f => f.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory = !selectedCategory || term.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [search, selectedCategory])

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Glossário de Investimentos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Entenda os principais termos do mercado financeiro brasileiro, com exemplos práticos.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar termos (ex: CDI, P/L, FGC…)"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!selectedCategory ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedCategory === cat ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terms count */}
      <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'termo encontrado' : 'termos encontrados'}</p>

      {/* Terms */}
      <Accordion multiple className="space-y-2">
        {filtered.map(term => (
          <AccordionItem key={term.id} value={term.id} className="border rounded-xl overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 text-left">
              <div className="flex items-start gap-3 w-full">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{term.term}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{term.definition}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{term.category}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-0">
              <div className="space-y-3 border-t pt-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{term.definition}</p>
                </div>
                {term.example && (
                  <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
                    <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 mb-0.5">Exemplo prático</p>
                      <p className="text-xs text-blue-800">{term.example}</p>
                    </div>
                  </div>
                )}
                {term.why_it_matters && (
                  <div className="flex gap-2 p-3 bg-amber-50 rounded-lg">
                    <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Por que isso importa</p>
                      <p className="text-xs text-amber-800">{term.why_it_matters}</p>
                    </div>
                  </div>
                )}
                {term.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {term.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSearch(tag)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted" />
          <p className="font-medium">Nenhum termo encontrado</p>
          <p className="text-sm mt-1">Tente outras palavras-chave</p>
        </div>
      )}
    </div>
  )
}
