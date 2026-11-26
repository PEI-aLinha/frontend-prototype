import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router'
import { Boxes, Building2, ClipboardList, CornerDownLeft, ListChecks, MessageCircleQuestion, Plus, Search, ShieldAlert } from 'lucide-react'
import { api } from '../api/client'
import { useActions, useAssessment, useAssets, usePortfolio, useRisks, useRoadmapStatus } from '../api/queries'
import { useOptionalTenant } from '../core/tenant'
import { useCan } from '../core/useCan'
import { useSession } from '../core/session'
import { cn } from '../ui'
import type { NavSection } from './AppShell'
import { matchesQuery } from './commandSearch'
import { MOD_KEY } from './useCommandMenu'

/** `content` entries (assets, risks, sections) only appear once something is typed: the empty list stays a short menu. */
interface Entry { id: string; label: string; hint?: string; group: string; icon: React.ReactNode; to: string; content?: boolean }


export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn('num inline-grid h-5 min-w-5 place-items-center rounded-[5px] border border-line-soft bg-paper px-1 font-sans text-[0.6875rem] font-bold text-muted', className)}>{children}</kbd>
}

export function CommandMenu({ open, onOpenChange, sections }: { open: boolean; onOpenChange: (o: boolean) => void; sections: NavSection[] }) {
  const navigate = useNavigate()
  const { persona } = useSession()
  const portfolio = usePortfolio()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const content = useContentEntries(open, sections)

  const entries = useMemo<Entry[]>(() => {
    const pages = sections.flatMap((s) => s.items).map((i) => ({ id: i.to, label: i.label, group: 'Ir para', icon: <i.icon className="size-4" aria-hidden />, to: i.to }))
    const all = persona.role === 'consultor' ? (portfolio.data ?? []) : []
    const active = all.filter((c) => c.organization.profile)
    // Demo clients without data cannot be opened: they are still found, and lead to the portfolio row.
    const samples = all.filter((c) => !c.organization.profile).map((c) => ({ id: c.organization.id, label: c.organization.name, hint: 'Cliente de exemplo', group: 'Clientes', icon: <Building2 className="size-4" aria-hidden />, to: '/carteira' }))
    const CLIENT_PAGES: Array<[string, string]> = [['visao-geral', 'Visão geral'], ['roadmap', 'Resultados e roadmap'], ['ativos', 'Ativos'], ['riscos', 'Riscos'], ['integracoes', 'Integrações'], ['historico', 'Histórico']]
    const clients = active.flatMap((c) => {
      const base = `/clientes/${c.organization.slug}`
      const name = c.organization.name.replace(/,? (Lda|S\.A)\.?$/, '')
      return [
        { id: c.organization.id, label: c.organization.name, hint: c.stage, group: 'Clientes', icon: <Building2 className="size-4" aria-hidden />, to: `${base}/visao-geral` },
        ...CLIENT_PAGES.slice(1).map(([path, label]) => ({ id: `${c.organization.id}-${path}`, label: `${label} · ${name}`, group: 'Clientes', icon: <Building2 className="size-4" aria-hidden />, to: `${base}/${path}` })),
        { id: `${c.organization.id}-novo-risco`, label: `Registar risco · ${name}`, group: 'Ações', icon: <Plus className="size-4" aria-hidden />, to: `${base}/riscos?novo=1` },
      ]
    })
    const org = sections.flatMap((x) => x.items).find((i) => i.to.startsWith('/org/'))?.to.split('/').slice(0, 3).join('/')
    const actions = persona.role === 'responsavel' && org ? [
      { id: 'novo-ativo', label: 'Adicionar ativo', group: 'Ações', icon: <Plus className="size-4" aria-hidden />, to: `${org}/ativos?novo=1` },
      { id: 'convidar', label: 'Convidar analista', group: 'Ações', icon: <Plus className="size-4" aria-hidden />, to: `${org}/equipa?convidar=1` },
    ] : []
    return [...pages, ...clients, ...samples, ...actions, ...content]
  }, [sections, portfolio.data, persona.role, content])

  // Every word must match somewhere, in any order: "agueda riscos" finds "Riscos · Componentes Águeda".
  const results = useMemo(() => {
    if (!q.trim()) return entries.filter((e) => !e.content && (e.group !== 'Clientes' || !e.id.includes('-')))
    return entries.filter((e) => matchesQuery(`${e.label} ${e.hint ?? ''}`, q))
  }, [entries, q])
  const groups = [...new Set(results.map((r) => r.group))]

  const go = (e: Entry | undefined) => { if (!e) return; onOpenChange(false); setQ(''); navigate(e.to) }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ('') }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[95] bg-ink/30 animate-fade-in" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-[14vh] z-[96] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-[16px] border border-line-soft bg-paper shadow-[0_24px_60px_rgb(var(--shadow-rgb)/0.22)] animate-pop-in">
          <Dialog.Title className="sr-only">Procurar</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line-soft px-4">
            <Search className="size-4 text-muted" aria-hidden />
            <input
              value={q} placeholder={persona.role === 'consultor' ? 'Procurar páginas, clientes, ativos e riscos…' : 'Procurar páginas, ativos, riscos e ações…'} aria-label="Procurar"
              role="combobox" aria-expanded aria-controls="cmd-list" aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
              onChange={(e) => { setQ(e.target.value); setActive(0) }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
                if (e.key === 'Enter') go(results[active])
              }}
              className="h-14 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-muted"
            />
            <Kbd>esc</Kbd>
          </div>
          <div id="cmd-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-soft">Nada encontrado para “{q}”.</p>}
            {groups.map((g) => (
              <div key={g} role="group" aria-label={g} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[0.75rem] font-bold text-muted">{g}</p>
                {results.filter((r) => r.group === g).map((r) => {
                  const i = results.indexOf(r)
                  return (
                    <div key={r.id} id={`cmd-${r.id}`} role="option" tabIndex={-1} aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => go(r)}
                      className={cn('flex h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[0.9375rem]', i === active ? 'bg-brand-soft text-brand' : 'text-ink')}>
                      <span className={i === active ? 'text-brand' : 'text-muted'}>{r.icon}</span>
                      <span className="flex-1 truncate font-semibold">{r.label}</span>
                      {r.hint && <span className="truncate text-sm text-ink-soft">{r.hint}</span>}
                      {i === active && <CornerDownLeft className="size-4" aria-hidden />}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 border-t border-line-soft bg-paper-soft px-4 py-2.5 text-[0.75rem] text-muted">
            <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
            <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> abrir</span>
            <span className="ml-auto flex items-center gap-1.5"><Kbd>{MOD_KEY}</Kbd><Kbd>K</Kbd> abrir em qualquer ecrã</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Assets, risks and assessment sections of the organization on screen, loaded only while the menu is open. */
function useContentEntries(open: boolean, sections: NavSection[]): Entry[] {
  const org = useOptionalTenant()
  const can = useCan()
  const { persona } = useSession()
  const base = sections.flatMap((s) => s.items).map((i) => i.to.match(/^\/(org|clientes)\/[^/]+/)?.[0]).find(Boolean)
  const on = open && !!org && !!base
  const status = useRoadmapStatus(on && persona.role !== 'analista' ? org?.id : undefined)
  const assets = useAssets(on && can('view', 'asset') ? org?.id : undefined)
  const risksOn = on && can('view', 'risk') && (persona.role === 'consultor' || !!status.data?.validated)
  const risks = useRisks(org?.id, risksOn)
  const assessment = useAssessment(on && persona.role !== 'analista' ? org?.id : undefined)
  const asks = persona.role === 'responsavel'
  // Same keys as the section pages, so these are usually already cached.
  const questions = useQueries({
    queries: (asks && on ? assessment.data?.sections ?? [] : []).map((sec) => ({
      queryKey: ['assessment', org?.id, 'questions', sec.id],
      queryFn: () => api.assessment.listQuestions(org!.id, sec.id),
    })),
  })
  const roadmapOn = on && can('view', 'roadmap') && (persona.role === 'consultor' || !!status.data?.validated)
  const actions = useActions(org?.id, roadmapOn)
  const questionList = questions.flatMap((q) => q.data ?? [])
  return useMemo(() => {
    if (!base) return []
    return [
      ...(assets.data ?? []).map((a) => ({ id: `a-${a.id}`, label: a.name, hint: 'Ativo', group: 'Ativos', icon: <Boxes className="size-4" aria-hidden />, to: `${base}/ativos?ativo=${a.id}`, content: true })),
      ...(risksOn ? risks.data ?? [] : []).map((r) => ({ id: `r-${r.id}`, label: r.plainLanguage ?? r.threat, hint: r.plainLanguage ? r.threat : 'Risco', group: 'Riscos', icon: <ShieldAlert className="size-4" aria-hidden />, to: `${base}/riscos?risco=${r.id}`, content: true })),
      ...(persona.role === 'responsavel' ? assessment.data?.sections ?? [] : []).map((sec) => ({ id: `s-${sec.id}`, label: sec.name, hint: `${sec.answered} de ${sec.total} respondidas`, group: 'Avaliação', icon: <ClipboardList className="size-4" aria-hidden />, to: `${base}/avaliacao/${sec.id}`, content: true })),
      ...questionList.map((qn) => ({ id: `q-${qn.id}`, label: qn.text, hint: assessment.data?.sections.find((sec) => sec.id === qn.sectionId)?.name, group: 'Perguntas', icon: <MessageCircleQuestion className="size-4" aria-hidden />, to: `${base}/avaliacao/${qn.sectionId}/${qn.id}`, content: true })),
      ...(roadmapOn ? actions.data ?? [] : []).map((ac) => ({ id: `ac-${ac.id}`, label: ac.description, hint: 'Ação do roadmap', group: 'Roadmap', icon: <ListChecks className="size-4" aria-hidden />, to: `${base}/roadmap`, content: true })),
    ]
  }, [base, assets.data, risks.data, risksOn, assessment.data, persona.role, questionList, roadmapOn, actions.data])
}
