import { useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { usePortfolio } from '../../api/queries'
import { dateTime } from '../../config/labels'
import { Chip, ErrorState, PageHeader, SkeletonRows, StatCard, Tooltip, cn } from '../../ui'

/** Carteira de clientes da consultora. Só a Componentes Águeda está ativa neste protótipo. */
export function PortfolioPage() {
  const navigate = useNavigate()
  const portfolio = usePortfolio()
  const list = portfolio.data ?? []
  const pending = list.filter((c) => c.stageTone === 'signal').length

  return (
    <>
      <PageHeader eyebrow="Marta Ferreira · consultora aLinha" title="Carteira de clientes" subtitle={`${list.length || 12} PME atribuídas. Comece pelas que esperam por si.`} />
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
          {list.map((c, i) => {
            const active = i === 0
            const row = (
              <div className={cn('grid w-full grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_120px] items-center gap-4 px-5 py-3.5 text-left max-md:grid-cols-1 max-md:gap-1.5', active ? 'hover:bg-paper-soft' : 'opacity-70')}>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{c.organization.name}</span>
                  <span className="block truncate text-[13px] text-ink-soft">{c.sector} · {c.employees} trabalhadores</span>
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
                  <Tooltip content="Fora deste protótipo"><div tabIndex={0} aria-disabled>{row}</div></Tooltip>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
