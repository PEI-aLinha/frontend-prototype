import { Link } from 'react-router'
import { Lock } from 'lucide-react'
import { useRoadmapStatus } from '../api/queries'
import { useSession } from '../core/session'
import { useTenant } from '../core/tenant'
import { RoadmapPage } from '../features/assessment/public'
import { useRiskSignals } from '../features/assets/public'
import { EmptyState, PageHeader } from '../ui'

/** Composição: o roadmap (Avaliação) recebe os sinais de risco (Riscos e Ativos) só por contrato. */
export function ConsultantRoadmap() {
  const signals = useRiskSignals()
  const org = useTenant()
  const { persona } = useSession()
  const status = useRoadmapStatus(org.id)
  if (persona.role !== 'consultor' && !status.data?.validated) {
    return (
      <>
        <PageHeader eyebrow={org.name} title="Resultados e roadmap" />
        <EmptyState icon={<Lock className="size-5" aria-hidden />} title="Disponível após validação">
          O nível de maturidade, as lacunas e o plano de ação ficam visíveis depois de a consultora os validar. Entretanto, acompanhe o progresso em <Link to={`/org/${org.slug}/avaliacao`} className="font-bold text-brand hover:underline">Avaliação</Link>.
        </EmptyState>
      </>
    )
  }
  return <RoadmapPage signals={signals} />
}
