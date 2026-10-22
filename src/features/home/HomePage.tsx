import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useAssessment, useAssets, useRisks, useRoadmapStatus, useServices, useTasks } from '../../api/queries'
import { dateTime, RISK_LEVEL_LABEL } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import { computeRiskLevel } from '../assets/risk/computeRiskLevel'
import { HighlightCard, NextSteps, PageHeader, ProgressBar, RiskLevelBadge, StatCard } from '../../ui'
import type { Level } from '../../api/contracts'

const CTA_CLASS = 'inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-paper px-6 py-[13px] text-[15px] font-bold text-ink hover:bg-brand-soft focus-visible:outline-paper max-md:w-full'

/** Designated manager home (06 / 14), with the "Risks" card after validation (scenario 3). */
export function HomePage() {
  const org = useTenant()
  const can = useCan()
  const assets = useAssets(org.id)
  const services = useServices(org.id)
  const tasks = useTasks(org.id)
  const roadmap = useRoadmapStatus(org.id)
  const assessment = useAssessment(org.id)
  const seeRisks = can('view', 'risk')
  const risks = useRisks(org.id, seeRisks)

  const assetTask = tasks.data?.find((t) => t.kind === 'ativos')
  const inventoryDone = assetTask?.status === 'concluida'
  const validated = roadmap.data?.validated
  const submitted = !!roadmap.data?.assessmentCompletedAt

  const levels = (risks.data ?? []).map((r) => ({ level: computeRiskLevel(r.probability, r.impact).level, status: r.status }))
  const top: Level | null = levels.some((l) => l.level === 'alto') ? 'alto' : levels.some((l) => l.level === 'medio') ? 'medio' : levels.length ? 'baixo' : null
  const topCount = levels.filter((l) => l.level === top).length
  const topTreating = levels.filter((l) => l.level === top).every((l) => l.status === 'em_tratamento' || l.status === 'aceite')

  const answered = assessment.data?.sections.reduce((n, sec) => n + sec.answered, 0) ?? 0
  const total = assessment.data?.sections.reduce((n, sec) => n + sec.total, 0) ?? 0
  const delegated = assessment.data?.sections.flatMap((sec) => sec.delegated).filter((d) => d.status !== 'concluida').length ?? 0
  const delegatedText = delegated ? `${delegated} ${delegated === 1 ? 'pergunta delegada à espera de resposta' : 'perguntas delegadas à espera de resposta'}` : 'O progresso fica guardado'

  const base = `/org/${org.slug}`
  const subtitle = validated ? 'A Marta Ferreira validou os resultados e o roadmap.' : submitted ? 'A avaliação foi submetida. Avisamos quando os resultados estiverem validados.' : 'O questionário fica guardado. Pode continuar quando quiser.'

  return (
    <>
      <PageHeader eyebrow={org.name} title="Olá, Rui" subtitle={subtitle} />

      <HighlightCard
        eyebrow="Avaliação de maturidade · NIS2 + RGPD"
        title={validated ? 'Resultados e roadmap validados' : submitted ? 'Submetida para validação' : assessment.data ? `${answered} de ${total} perguntas respondidas` : 'A carregar a avaliação…'}
        action={
          <Link to={validated ? `${base}/roadmap` : `${base}/avaliacao`} className={CTA_CLASS}>
            {validated ? 'Ver roadmap' : 'Ver avaliação'} <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      >
        {/* Always rendered (empty while loading) so the card does not grow and push the page down. */}
        <ProgressBar value={answered} max={total || 1} label="Progresso da avaliação" track="dark" className="mb-3 max-w-[420px]" />
        {validated && roadmap.data?.validatedAt ? `Validado a ${dateTime(roadmap.data.validatedAt)} pela Marta Ferreira` : submitted ? 'Submetida qua., 14 out. às 10:12 · a Marta Ferreira está a rever' : delegatedText}
      </HighlightCard>

      <NextSteps steps={[
        { label: 'Registar os ativos que conhece', hint: 'Programas e serviços do dia a dia: ERP, email, portáteis.', done: (assets.data?.length ?? 0) > 0, to: `${base}/ativos?novo=1`, cta: 'Adicionar ativo' },
        { label: 'Pedir ao Pedro o registo técnico', hint: 'Servidores, rede e máquinas da fábrica. Ele recebe uma tarefa.', done: !!assetTask, to: `${base}/ativos?atribuir=1`, cta: 'Atribuir' },
        { label: 'Esperar que o Pedro conclua o registo', hint: assetTask ? `Prazo: ${assetTask.dueDate.split('-').reverse().slice(0, 2).join('/')}. Recebe uma notificação quando ele terminar.` : undefined, done: inventoryDone, to: `${base}/ativos`, cta: 'Ver inventário' },
        { label: 'Terminar e submeter a avaliação', hint: 'O questionário de maturidade NIS2 + RGPD.', done: submitted, to: `${base}/avaliacao`, cta: 'Continuar' },
        { label: 'A consultora valida resultados, roadmap e riscos', hint: 'Não precisa de fazer nada: é avisado quando terminar.', done: !!validated },
        { label: 'Acompanhar os riscos e o plano de ação', hint: 'Comece pelos riscos altos.', done: false, to: validated ? `${base}/riscos` : undefined, cta: 'Ver riscos' },
      ]} />

      <section aria-labelledby="home-summary-title" className="grid gap-4 md:grid-cols-3">
        <h2 id="home-summary-title" className="sr-only">Resumo</h2>
        {seeRisks && risks.data && top ? (
          <StatCard to={`${base}/riscos`} label="Riscos" accent={<RiskLevelBadge level={top} />}
            value={`${topCount} ${topCount === 1 ? 'risco' : 'riscos'} ${RISK_LEVEL_LABEL[top].toLowerCase()}${topCount === 1 ? '' : 's'} · ${topTreating ? 'em tratamento' : 'por tratar'}`}
            caption={`${levels.length} riscos registados pela consultora`} />
        ) : (
          <StatCard label="Enquadramento" value="Entidade importante" caption="Sugestão indicativa · aguarda o CNCS" />
        )}
        <StatCard to={`${base}/ativos`} label="Ativos" value={assets.data ? `${assets.data.length} ativos` : '…'} caption={`${services.data?.length ?? 2} serviços críticos · ${inventoryDone ? 'completo' : assetTask ? 'registo técnico atribuído' : 'falta o registo técnico'}`} />
        <StatCard label="Consultora" value="Marta Ferreira" caption={validated ? 'Acompanha as ações de risco alto' : 'Valida os resultados quando terminar'} />
      </section>
    </>
  )
}
