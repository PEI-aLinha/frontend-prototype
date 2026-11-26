import { Link, useNavigate } from 'react-router'
import { useAssessment, useAssets, useConsultant, useRisks, useRoadmapStatus, useTasks, useUsers } from '../../api/queries'
import { dateTime, RISK_LEVEL_LABEL, shortDate } from '../../config/labels'
import { useSession } from '../../core/session'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import { PageTour } from '../../core/onboarding/PageTour'
import { computeRiskLevel } from '../assets/risk/computeRiskLevel'
import { Button, buttonClass, ErrorState, HighlightCard, NextSteps, Note, PageHeader, ProgressBar } from '../../ui'
import type { Level } from '../../api/contracts'
import { ConsultantCard, nis2Status } from '../organization/public'

/** Designated manager home (06 / 14), with the "Risks" card after validation (scenario 3). */
export function HomePage() {
  const org = useTenant()
  const { persona } = useSession()
  const can = useCan()
  const navigate = useNavigate()
  const assets = useAssets(org.id)
  const tasks = useTasks(org.id)
  const roadmap = useRoadmapStatus(org.id)
  const assessment = useAssessment(org.id)
  const users = useUsers(org.id)
  const seeRisks = can('view', 'risk')
  const risks = useRisks(org.id, seeRisks)
  // RF04: the consultant is picked at registration, so it is not always Marta.
  const consultant = useConsultant(org.id).data?.name ?? 'A equipa aLinha'

  const assetTask = tasks.data?.find((t) => t.kind === 'ativos')
  const analyst = users.data?.find((u) => u.role === 'analista')
  const inventoryDone = assetTask?.status === 'concluida'
  const validated = roadmap.data?.validated
  const submitted = !!roadmap.data?.assessmentCompletedAt
  // Just registered (US10): nothing answered, assigned or registered yet.
  const fresh = !submitted && tasks.data?.length === 0 && assets.data?.length === 0

  const levels = (risks.data ?? []).map((r) => ({ level: computeRiskLevel(r.probability, r.impact).level, status: r.status }))
  const top: Level | null = levels.some((l) => l.level === 'alto') ? 'alto' : levels.some((l) => l.level === 'medio') ? 'medio' : levels.length ? 'baixo' : null
  const topCount = levels.filter((l) => l.level === top).length
  const openCount = levels.filter((l) => l.status === 'por_tratar' || l.status === 'em_tratamento').length
  const topTreating = levels.filter((l) => l.level === top).every((l) => l.status === 'em_tratamento' || l.status === 'aceite')

  const base = `/org/${org.slug}`
  // US13: real questionnaire progress and the questions waiting for an analyst.
  const sections = assessment.data?.sections ?? []
  const total = sections.reduce((n, sec) => n + sec.total, 0)
  const answered = sections.reduce((n, sec) => n + sec.answered, 0)
  const notStarted = !submitted && !!assessment.data && answered === 0
  const waiting = sections.flatMap((sec) => sec.delegated.filter((d) => d.status === 'pendente').map((d) => d.assigneeId))
  const pending = [...new Set(waiting)].map((userId) => {
    const n = waiting.filter((id) => id === userId).length
    return `${n} ${n === 1 ? 'pergunta atribuída' : 'perguntas atribuídas'} a ${users.data?.find((u) => u.id === userId)?.name ?? 'um analista'}`
  })
  const next = assessment.data?.nextQuestion
  const assessmentPath = validated ? `${base}/roadmap` : next && !submitted ? `${base}/avaliacao/${next.sectionId}/${next.questionId}` : `${base}/avaliacao`
  const nis2 = nis2Status(org)
  // Assessment not submitted yet: invite to start or to finish it. Once submitted, only the status remains.
  const subtitle = validated ? `${consultant} validou os resultados e o roadmap.` : submitted ? 'A avaliação foi submetida. Avisamos quando os resultados estiverem validados.' : fresh ? 'Pode começar pela avaliação quando quiser.' : 'Pode terminar a avaliação quando quiser.'

  const failed = [assessment, roadmap, tasks, assets].find((q) => q.isError)
  const steps = [
    { label: 'Registar os ativos que conhece', hint: 'Programas e serviços do dia a dia: ERP, email, portáteis.', done: (assets.data?.length ?? 0) > 0, to: `${base}/ativos?novo=1`, cta: 'Adicionar ativo' },
    ...(analyst || assetTask ? [] : [{ label: 'Convidar o técnico de informática', hint: 'Quem trata dos servidores e da rede. Recebe um convite por email e só vê o que lhe pedir.', done: false, to: `${base}/equipa?convidar=1`, cta: 'Convidar' }]),
    { label: 'Pedir ao técnico o registo dos sistemas', hint: `Servidores, rede e máquinas da fábrica.${analyst ? ` ${analyst.name} recebe uma tarefa.` : ''}`, done: !!assetTask, to: `${base}/ativos?atribuir=1`, cta: 'Atribuir' },
    { label: 'Esperar que o técnico conclua o registo', hint: assetTask ? `${assetTask.dueDate ? `Prazo: ${assetTask.dueDate.split('-').reverse().slice(0, 2).join('/')}. ` : ''}Recebe uma notificação quando o registo estiver concluído.` : undefined, done: inventoryDone, to: `${base}/ativos`, cta: 'Ver inventário' },
    { label: 'Terminar e submeter a avaliação', hint: 'O questionário de maturidade NIS2 + RGPD.', done: submitted, to: `${base}/avaliacao`, cta: 'Continuar' },
    { label: 'A consultora valida resultados, roadmap e riscos', hint: 'Não precisa de fazer nada: é avisado quando terminar.', done: !!validated },
    { label: 'Acompanhar os riscos e o plano de ação', hint: seeRisks && top ? `${topCount} ${topCount === 1 ? 'risco' : 'riscos'} ${RISK_LEVEL_LABEL[top].toLowerCase()}${topCount === 1 ? '' : 's'} ${topTreating ? 'em tratamento' : 'por tratar'} · ${levels.length} riscos, ${openCount} em aberto. Comece por ${topCount === 1 ? 'esse' : 'esses'}.` : 'Comece pelos riscos altos.', done: false, to: validated ? `${base}/riscos` : undefined, cta: 'Ver riscos' },
  ]
  const current = steps.find((st) => !st.done)
  // The hero only carries a button when the current step is the assessment itself; otherwise the checklist owns the primary action.
  const heroOwnsAction = !!validated || current?.label === 'Terminar e submeter a avaliação'

  if (failed) {
    return (
      <>
        <PageHeader eyebrow={org.name} title={`Olá, ${persona.firstName}`} />
        <ErrorState error={failed.error} onRetry={() => { assessment.refetch(); roadmap.refetch(); tasks.refetch(); assets.refetch() }} />
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow={org.name} title={`Olá, ${persona.firstName}`} subtitle={subtitle} help={<PageTour id="inicio" ready={!!assets.data && !!tasks.data} />} />

      {!org.scope && (
        <Note>
          Responda a três perguntas para saber que leis se aplicam à empresa.{' '}
          <Link to={`${base}/ambito/perguntas`} className="underline underline-offset-2">Responder agora</Link>
        </Note>
      )}

      <HighlightCard
        eyebrow="Avaliação de maturidade · NIS2 + RGPD"
        title={validated ? 'Resultados e roadmap validados' : submitted ? 'Submetida para validação' : notStarted ? 'Avaliação por começar' : assessment.data ? `${answered} de ${total} perguntas respondidas` : '…'}
        action={validated ? (
          <Link to={`${base}/roadmap`} className={buttonClass({ variant: 'inverse' })}>Ver roadmap</Link>
        ) : heroOwnsAction ? (
          <Button variant="inverse" disabled={!assessment.data} onClick={() => navigate(assessmentPath)}>{submitted ? 'Ver avaliação' : notStarted ? 'Começar avaliação' : 'Continuar avaliação'}</Button>
        ) : (
          // Until the assessment loads the next question is unknown: no link yet, so it never lands on the overview by mistake.
          assessment.data
            ? <Link to={assessmentPath} className="text-[0.9375rem] font-bold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">{submitted ? 'Ver avaliação' : notStarted ? 'Ver a avaliação' : 'Continuar avaliação'}</Link>
            : <span className="text-[0.9375rem] font-bold text-white/60">A carregar…</span>
        )}
      >
        {/* Only while answering: once submitted the bar is always full and says nothing. */}
        {!submitted && !validated && <ProgressBar value={answered} max={total || 1} label="Progresso da avaliação" track="dark" className="mb-3 max-w-[420px]" />}
        {validated && roadmap.data?.validatedAt ? `Validado a ${dateTime(roadmap.data.validatedAt)} por ${consultant}` : submitted ? `Submetida${roadmap.data?.assessmentCompletedAt ? ` a ${dateTime(roadmap.data.assessmentCompletedAt)}` : ''} · ${consultant} está a rever` : notStarted ? 'Ainda sem respostas · o progresso fica guardado' : [...pending, 'o progresso fica guardado'].join(' · ')}
      </HighlightCard>

      <div data-tour="home-steps">
        <NextSteps steps={steps} />
      </div>

      <section aria-label="Contexto" className="grid gap-x-10 gap-y-4 border-t border-line-soft pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" data-tour="home-summary">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-ink-soft">Enquadramento NIS2</h2>
          <p><Link to={`${base}/enquadramento`} className="font-bold text-ink underline decoration-line-soft underline-offset-4 hover:decoration-brand">{nis2?.label ?? '—'}</Link></p>
          <p className="text-sm text-ink-soft">{nis2?.official ? `Oficial · CNCS · Ato de ${shortDate(nis2.date!)}` : 'Sugestão indicativa · aguarda o CNCS'}</p>
        </div>
        <ConsultantCard orgId={org.id} inline />
      </section>
    </>
  )
}
