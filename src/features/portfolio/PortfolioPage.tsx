import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import { usePortfolio } from '../../api/queries'
import { dateTime } from '../../config/labels'
import { useSession } from '../../core/session'
import { Chip, ErrorState, PageHeader, Skeleton, Tooltip, cn } from '../../ui'
import { sectorById } from '../organization/public'

/** Consultant's client portfolio. Only organizations registered in the prototype (with registration data) can be opened. */
export function PortfolioPage() {
  const navigate = useNavigate()
  const { persona } = useSession()
  const portfolio = usePortfolio()
  const all = portfolio.data ?? []
  const [filter, setFilter] = useState<'todos' | 'espera' | 'roadmap'>('todos')
  const FILTERS = [
    { value: 'todos' as const, label: 'Todos', test: () => true },
    { value: 'espera' as const, label: 'À espera de si', test: (c: (typeof all)[number]) => c.stageTone === 'signal' },
    { value: 'roadmap' as const, label: 'Roadmap em curso', test: (c: (typeof all)[number]) => /Roadmap/.test(c.stage) },
  ]
  // Attention first: an open incident, then clients waiting on the consultant, then the rest by last update.
  const urgency = (c: (typeof all)[number]) => (/Incidente/.test(c.stage) ? 0 : c.stageTone === 'signal' ? 1 : 2)
  const list = all.filter(FILTERS.find((f) => f.value === filter)!.test).sort((a, b) => urgency(a) - urgency(b) || b.updatedAt.localeCompare(a.updatedAt))

  return (
    <>
      <PageHeader eyebrow={`${persona.name} · ${persona.subtitle}`} title="Carteira de clientes" subtitle={`${all.length || 12} PME atribuídas. Comece pelas que esperam por si.`} />
      <div role="group" aria-label="Filtrar clientes" className="-mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = all.filter(f.test).length
          const on = filter === f.value
          return (
            <button key={f.value} type="button" aria-pressed={on} onClick={() => setFilter(f.value)}
              className={cn('inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] font-bold transition-colors', on ? 'border-brand bg-brand text-white' : 'border-line-soft bg-paper text-ink-soft hover:border-line hover:text-ink')}>
              {f.label}<span className={cn('num rounded-full px-1.5 text-[0.75rem]', on ? 'bg-white/20' : f.value === 'espera' && n > 0 ? 'bg-signal-soft text-brand' : 'bg-paper-soft')}>{n}</span>
            </button>
          )
        })}
      </div>
      {portfolio.isError ? <ErrorState error={portfolio.error} onRetry={() => portfolio.refetch()} /> : !portfolio.data ? <PortfolioSkeleton /> : (
        <ul className="overflow-hidden rounded-[16px] border border-line-soft bg-paper" aria-label="Clientes">
          <li aria-hidden className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_120px] gap-4 border-b border-line-soft bg-paper-soft px-5 py-3 max-md:hidden">
            {['Cliente', 'Fase', 'Próximo passo', 'Atualizado'].map((h) => <span key={h} className="eyebrow text-[0.6875rem] text-muted">{h}</span>)}
          </li>
          {list.map((c) => {
            // Only organizations with registration data exist in this prototype; the others are illustrative.
            const active = !!c.organization.profile
            const sector = c.sector || sectorById(c.organization.profile?.sector ?? '')?.label || '—'
            const row = (
              <div className={cn('grid w-full grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_120px] items-center gap-4 px-5 py-3.5 text-left max-md:grid-cols-1 max-md:gap-1.5', active ? 'hover:bg-paper-soft' : 'bg-paper-soft text-ink-soft')}>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-bold">{c.organization.name}</span>
                    {c.isNew && <Chip tone="signal" className="shrink-0">Novo cliente</Chip>}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-ink-soft">{sector} · {c.employees} trabalhadores</span>
                </span>
                <span>{/Incidente/.test(c.stage) ? <Chip tone="neutral" className="bg-risk-high text-risk-high-ink" icon={<TriangleAlert className="size-3.5" aria-hidden />}>{c.stage}</Chip> : <Chip tone={c.stageTone}>{c.stage}</Chip>}</span>
                <span className="flex items-center gap-2 text-[0.8125rem] text-ink-soft">{c.nextStep}{active && <ArrowRight className="size-4 text-brand" aria-hidden />}</span>
                <span className="num text-[0.75rem] text-muted">{dateTime(c.updatedAt)}</span>
              </div>
            )
            return (
              // Clients waiting on the consultant keep a signal tint even when dimmed as out of the prototype.
              <li key={c.organization.id} className={cn('border-b border-line-soft last:border-b-0', c.stageTone === 'signal' && 'bg-signal-soft/40')}>
                {active ? (
                  <button type="button" className="block w-full" onClick={() => navigate(`/clientes/${c.organization.slug}/visao-geral`)}>{row}</button>
                ) : (
                  <Tooltip content="Cliente de exemplo, sem dados nesta demonstração"><button type="button" disabled className="block w-full cursor-default" aria-disabled>{row}</button></Tooltip>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

const COLS = 'grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_120px] gap-4'
/** Same grid, header and row height as the loaded list, so nothing jumps when the data arrives. */
function PortfolioSkeleton() {
  const widths = [['62%', '84%', 120, '70%'], ['48%', '70%', 104, '52%'], ['70%', '60%', 132, '64%'], ['54%', '78%', 96, '58%'], ['66%', '64%', 116, '48%'], ['44%', '72%', 124, '66%']]
  return (
    <div role="status" aria-label="A carregar clientes…" className="overflow-hidden rounded-[16px] border border-line-soft bg-paper">
      <div aria-hidden className={cn(COLS, 'border-b border-line-soft bg-paper-soft px-5 py-3')}>
        {['Cliente', 'Fase', 'Próximo passo', 'Atualizado'].map((h) => <span key={h} className="eyebrow text-[0.6875rem] text-muted">{h}</span>)}
      </div>
      {widths.map(([a, b, chip, d], i) => (
        <div key={i} className={cn(COLS, 'items-center border-b border-line-soft px-5 py-3.5 last:border-b-0')} style={{ opacity: 1 - i * 0.12 }}>
          <span className="flex flex-col gap-2"><Skeleton className="h-4" style={{ width: a }} /><Skeleton className="h-3" style={{ width: b }} /></span>
          <Skeleton className="h-6 rounded-full" style={{ width: chip }} />
          <Skeleton className="h-3.5" style={{ width: d }} />
          <Skeleton className="h-3 w-[84px]" />
        </div>
      ))}
    </div>
  )
}
