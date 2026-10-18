import { useNavigate } from 'react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { usePortfolio } from '../../api/queries'
import { dateTime } from '../../config/labels'
import { useSession } from '../../core/session'
import { Chip, ErrorState, PageHeader, SkeletonRows, StatCard, Tooltip, cn } from '../../ui'
import { sectorById } from '../organization/public'

/** Consultant's client portfolio. Only organizations registered in the prototype (with registration data) can be opened. */
export function PortfolioPage() {
  const navigate = useNavigate()
  const { persona } = useSession()
  const portfolio = usePortfolio()
  const list = portfolio.data ?? []
  const pending = list.filter((c) => c.stageTone === 'signal').length

  return (
    <>
      <PageHeader eyebrow={`${persona.name} · ${persona.subtitle}`} title="Carteira de clientes" subtitle={`${list.length || 12} PME atribuídas. Comece pelas que esperam por si.`} />
      <div className="flex gap-4 max-md:flex-col">
        <StatCard label="À espera da consultora" value={pending} caption="Avaliações por validar" />
        <StatCard label="Roadmaps em curso" value={list.filter((c) => /Roadmap/.test(c.stage)).length} caption="Ações a acompanhar" />
        <StatCard label="Incidentes abertos" value={list.filter((c) => c.stageTone === 'dark').length} caption="Fora deste protótipo" />
      </div>
      {portfolio.isError ? <ErrorState error={portfolio.error} onRetry={() => portfolio.refetch()} /> : !portfolio.data ? <SkeletonRows rows={8} /> : (
        <ul className="overflow-hidden rounded-[16px] border border-line-soft bg-paper" aria-label="Clientes">
          <li aria-hidden className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_120px] gap-4 border-b border-line-soft bg-paper-soft px-5 py-3 max-md:hidden">
            {['Cliente', 'Fase', 'Próximo passo', 'Atualizado'].map((h) => <span key={h} className="eyebrow text-[11px] text-muted">{h}</span>)}
          </li>
          {list.map((c) => {
            // Only organizations with registration data exist in this prototype; the others are illustrative.
            const active = !!c.organization.profile
            const sector = c.sector || sectorById(c.organization.profile?.sector ?? '')?.label || '—'
            const row = (
              <div className={cn('grid w-full grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_120px] items-center gap-4 px-5 py-3.5 text-left max-md:grid-cols-1 max-md:gap-1.5', active ? 'hover:bg-paper-soft' : 'opacity-70')}>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-bold">{c.organization.name}</span>
                    {c.isNew && <Chip tone="signal" icon={<Sparkles className="size-3.5" aria-hidden />} className="shrink-0">Novo cliente</Chip>}
                  </span>
                  <span className="block truncate text-[13px] text-ink-soft">{sector} · {c.employees} trabalhadores</span>
                </span>
                <span><Chip tone={c.stageTone}>{c.stage}</Chip></span>
                <span className="flex items-center gap-2 text-[13px] text-ink-soft">{c.nextStep}{active && <ArrowRight className="size-4 text-brand" aria-hidden />}</span>
                <span className="text-[12px] text-muted">{dateTime(c.updatedAt)}</span>
              </div>
            )
            return (
              <li key={c.organization.id} className="border-b border-line-soft last:border-b-0">
                {active ? (
                  <button type="button" className="block w-full" onClick={() => navigate(`/clientes/${c.organization.slug}/visao-geral`)} aria-label={`Abrir ${c.organization.name}`}>{row}</button>
                ) : (
                  <Tooltip content="Fora deste protótipo"><button type="button" className="block w-full cursor-default" aria-disabled>{row}</button></Tooltip>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
