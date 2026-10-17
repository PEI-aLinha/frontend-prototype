import { Link } from 'react-router'
import { useAssets, useRiskLinks, useRisks, useRoadmapStatus, useServices } from '../../api/queries'
import { computeRiskLevel } from '../assets/risk/computeRiskLevel'
import { dateTime } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { nis2Status } from '../organization/public'
import { Button, Chip, HighlightCard, NextSteps, PageHeader, StatCard } from '../../ui'

/** Client overview (consultant). Entry point for scenario 2. */
export function ClientOverviewPage() {
  const org = useTenant()
  const nis2 = nis2Status(org)
  const roadmap = useRoadmapStatus(org.id)
  const assets = useAssets(org.id)
  const services = useServices(org.id)
  const risks = useRisks(org.id)
  const base = `/clientes/${org.slug}`
  const validated = roadmap.data?.validated
  const links = useRiskLinks(org.id)
  const highRisks = (risks.data ?? []).filter((r) => computeRiskLevel(r.probability, r.impact).level === 'alto')
  const criticalAssets = (assets.data ?? []).filter((a) => a.criticality === 'alto')
  const covered = criticalAssets.filter((a) => risks.data?.some((r) => r.assetId === a.id)).length
  // New client (US01): registration done, nothing else yet.
  const justRegistered = !!roadmap.data && !roadmap.data.assessmentCompletedAt && assets.data?.length === 0

  return (
    <>
      <PageHeader eyebrow="Carteira de clientes" title={org.name} subtitle={`${org.description} · ${nis2 ? `${nis2.label} (${nis2.official ? 'oficial · CNCS' : 'sugestão indicativa'})` : org.classification}`} actions={<div className="flex gap-2">{org.frameworks.map((f) => <Chip key={f} tone="neutral">{f}</Chip>)}</div>} />
      {justRegistered ? (
        <>
          <HighlightCard eyebrow="Registo concluído" title="Novo cliente: ainda sem avaliação">
            {org.registeredAt ? `Registado a ${dateTime(org.registeredAt)}.` : 'Registo concluído.'}
          </HighlightCard>
          <NextSteps title="Passos deste cliente" steps={[
            { label: 'Registar a organização', hint: 'Dados da empresa, NIF, setor e dimensão.', done: true },
            { label: 'Responder às perguntas sobre dados pessoais e IA', hint: 'Define que leis se aplicam: NIS2, RGPD e AI Act.', done: !!org.scope },
            { label: 'Registar os ativos e responder à avaliação', hint: 'O cliente avisa quando submeter. Depois, é a sua vez.', done: false },
          ]} />
        </>
      ) : (<>
      <HighlightCard
        eyebrow={validated ? 'Roadmap validado' : 'Avaliação concluída'}
        title={validated ? 'Acompanhe as ações de risco alto' : 'Registe os riscos e valide o roadmap'}
        action={<Link to={`${base}/riscos`}><Button variant="inverse" tabIndex={-1}>Abrir Riscos →</Button></Link>}
      >
        {roadmap.data?.assessmentCompletedAt ? `Avaliação submetida pelo Rui Santos a ${dateTime(roadmap.data.assessmentCompletedAt)} · inventário de ativos completo` : 'A avaliação ainda está em curso.'}
      </HighlightCard>
      <NextSteps title="Passos para este cliente" steps={[
        { label: 'Rever o inventário de ativos', hint: 'Confirme que estão lá os sistemas críticos. Pode deixar comentários.', done: true, to: `${base}/ativos`, cta: 'Ver ativos' },
        { label: 'Registar riscos sobre os ativos críticos', hint: `${covered} de ${criticalAssets.length} ativos de criticidade alta já têm riscos.`, done: highRisks.length > 0, to: `${base}/riscos?novo=1&ativo=ast-servidor`, cta: 'Registar risco' },
        { label: 'Ligar os riscos altos a ações do roadmap', hint: 'As ações ligadas sobem de prioridade.', done: highRisks.length > 0 && highRisks.every((r) => links.data?.some((l) => l.riskId === r.id)), to: `${base}/riscos`, cta: 'Abrir riscos' },
        { label: 'Validar o roadmap', hint: 'Depois disto o Rui vê o plano e os riscos em só leitura.', done: !!validated, to: `${base}/roadmap`, cta: 'Rever roadmap' },
      ]} />
      </>)}

      <div className="grid gap-4 md:grid-cols-3">
        <Link to={`${base}/ativos`} className="contents"><StatCard label="Ativos" value={assets.data ? `${assets.data.length} ativos` : '…'} caption={`${services.data?.length ?? '…'} serviços críticos · preenchido pelo Rui e pelo Pedro`} /></Link>
        <Link to={`${base}/riscos`} className="contents"><StatCard label="Riscos" value={risks.data ? `${risks.data.length} registados` : '…'} caption="Registo segundo a ISO/IEC 27005" /></Link>
        <Link to={`${base}/roadmap`} className="contents"><StatCard label="Roadmap" value={validated ? 'Validado' : 'Por validar'} caption={validated ? 'Visível para o cliente' : 'Proposto pela IA a partir das lacunas'} /></Link>
      </div>
    </>
  )
}
