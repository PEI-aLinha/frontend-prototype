import { MATURITY_LABEL, shortDate } from '../../config/labels'
import { Card, Eyebrow, ProgressBar, StatCard } from '../../ui'
import type { PlanSummary } from './planSummary'

export interface PlanSummaryBandProps {
  summary: PlanSummary
}

/** Level, coverage, gaps and next deadlines (RF10/US15, RF27/US25). Nothing is hidden from the consultant. */
export function PlanSummaryBand({ summary }: PlanSummaryBandProps) {
  const { maturity, targetMaturity, sections, actionsOpen, risksUnlinked, deadlines } = summary
  // Before the assessment resolves there is no level, no target and no coverage to show.
  if (targetMaturity === null) return null
  const target = `${targetMaturity} de 5`
  return (
    <section aria-label="Estado do plano" className="grid items-start gap-4 md:grid-cols-2">
      <StatCard
        label="Nível de maturidade"
        value={maturity === null ? `Objetivo ${target}` : `${maturity} de 5`}
        caption={maturity === null ? `Nível esperado: ${MATURITY_LABEL[targetMaturity]}` : `Objetivo ${target} · ${MATURITY_LABEL[targetMaturity]}`}
      />
      <Card className="flex flex-col gap-2.5">
        <Eyebrow>Cobertura da avaliação</Eyebrow>
        <ul className="flex flex-col gap-2">
          {sections.map((s) => (
            <li key={s.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-ink-soft">{s.name}</span>
                <span className="shrink-0 font-semibold">{s.answered}/{s.total}</span>
              </div>
              <ProgressBar value={s.answered} max={s.total} label={`Cobertura de ${s.name}`} />
            </li>
          ))}
        </ul>
      </Card>
      <StatCard
        label="Por resolver"
        value={`${actionsOpen} ${actionsOpen === 1 ? 'ação aberta' : 'ações abertas'}`}
        caption={risksUnlinked === 0 ? 'Todos os riscos têm uma ação ligada' : `${risksUnlinked} ${risksUnlinked === 1 ? 'risco sem' : 'riscos sem'} ação ligada`}
      />
      <Card className="flex flex-col gap-2.5">
        <Eyebrow>Próximos prazos</Eyebrow>
        {deadlines.length === 0
          ? <p className="text-[13px] text-ink-soft">Nenhuma ação com prazo por resolver.</p>
          : (
            <ul className="flex flex-col gap-1.5">
              {deadlines.slice(0, 3).map((d) => (
                <li key={d.actionId} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 text-ink-soft">{d.description}</span>
                  <span className="shrink-0 font-semibold text-muted">{shortDate(d.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </section>
  )
}