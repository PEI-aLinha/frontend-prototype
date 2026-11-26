import { Link } from 'react-router'
import { Clock } from 'lucide-react'
import { useRoadmapStatus } from '../api/queries'
import { useSession } from '../core/session'
import { useTenant } from '../core/tenant'
import { RoadmapPage } from '../features/assessment/public'
import { useRiskSignals } from '../features/assets/public'
import { applicableFrameworks } from '../features/organization/public'
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from '../ui'

/** Composition: the roadmap (Assessment) receives the risk signals (Risks and Assets) only through the contract. */
export function ConsultantRoadmap() {
  const signals = useRiskSignals()
  const org = useTenant()
  const frameworks = applicableFrameworks(org) ?? org.frameworks
  const { persona } = useSession()
  const status = useRoadmapStatus(org.id)
  if (status.isPending) {
    return (
      <>
        <PageHeader eyebrow={org.name} title="Resultados e roadmap" />
        <SkeletonRows rows={6} />
      </>
    )
  }
  if (status.isError) {
    return (
      <>
        <PageHeader eyebrow={org.name} title="Resultados e roadmap" />
        <ErrorState error={status.error} onRetry={() => status.refetch()} />
      </>
    )
  }
  if (persona.role !== 'consultor' && !status.data?.validated) {
    return (
      <>
        <PageHeader eyebrow={org.name} title="Resultados e roadmap" />
        <EmptyState icon={<Clock className="size-5" aria-hidden />} title="Disponível após validação">
          O nível de maturidade, as lacunas e o plano de ação ficam visíveis depois de a consultora os validar. Entretanto, acompanhe o progresso em <Link to={`/org/${org.slug}/avaliacao`} className="font-bold text-brand hover:underline">Avaliação</Link>.
        </EmptyState>
      </>
    )
  }
  return <RoadmapPage signals={signals} frameworks={frameworks} />
}
