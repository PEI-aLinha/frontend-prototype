import { Link } from 'react-router'
import { useAssets, useRisks, useRoadmapStatus, useServices } from '../../api/queries'
import { dateTime } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { Button, Chip, HighlightCard, PageHeader, StatCard } from '../../ui'

/** Visão geral do cliente (consultora). Ponto de entrada do cenário 2. */
export function ClientOverviewPage() {
  const org = useTenant()
  const roadmap = useRoadmapStatus(org.id)
  const assets = useAssets(org.id)
  const services = useServices(org.id)
  const risks = useRisks(org.id)
  const base = `/clientes/${org.slug}`
  const validated = roadmap.data?.validated

  return (
    <>
      <PageHeader eyebrow="Carteira de clientes" title={org.name} subtitle={`${org.description} · ${org.classification}`} actions={<div className="flex gap-2">{org.frameworks.map((f) => <Chip key={f} tone="neutral">{f}</Chip>)}</div>} />
      <HighlightCard
        eyebrow={validated ? 'Roadmap validado' : 'Avaliação concluída'}
        title={validated ? 'Acompanhe as ações de risco alto' : 'Registe os riscos e valide o roadmap'}
        action={<Link to={`${base}/riscos`}><Button variant="inverse" tabIndex={-1}>Abrir Riscos →</Button></Link>}
      >
        {roadmap.data?.assessmentCompletedAt ? `Avaliação submetida pelo Rui Santos a ${dateTime(roadmap.data.assessmentCompletedAt)} · inventário de ativos completo` : 'A avaliação ainda está em curso.'}
      </HighlightCard>
      <div className="grid gap-4 md:grid-cols-3">
        <Link to={`${base}/ativos`} className="contents"><StatCard label="Ativos" value={assets.data ? `${assets.data.length} ativos` : '…'} caption={`${services.data?.length ?? '…'} serviços críticos · preenchido pelo Rui e pelo Pedro`} /></Link>
        <Link to={`${base}/riscos`} className="contents"><StatCard label="Riscos" value={risks.data ? `${risks.data.length} registados` : '…'} caption="Registo segundo a ISO/IEC 27005" /></Link>
        <Link to={`${base}/roadmap`} className="contents"><StatCard label="Roadmap" value={validated ? 'Validado' : 'Por validar'} caption={validated ? 'Visível para o cliente' : 'Proposto pela IA a partir das lacunas'} /></Link>
      </div>
    </>
  )
}
