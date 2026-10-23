import { Link, useNavigate } from 'react-router'
import { useAssessment, useAssets, useConsultant, useRisks, useRoadmapStatus, useServices, useTasks, useUsers } from '../../api/queries'
import { dateTime, RISK_LEVEL_LABEL, shortDate } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import { computeRiskLevel } from '../assets/risk/computeRiskLevel'
import { Button, Eyebrow, HighlightCard, NextSteps, Note, ProgressBar, RiskLevelBadge, StatCard } from '../../ui'
import type { Level } from '../../api/contracts'
import { ConsultantCard, nis2Status } from '../organization/public'

/** Designated manager home (06 / 14), with the "Risks" card after validation (scenario 3). */
export function HomePage() {
  const org = useTenant()
  const can = useCan()
  const navigate = useNavigate()
  const assets = useAssets(org.id)
  const services = useServices(org.id)
  const tasks = useTasks(org.id)
  const roadmap = useRoadmapStatus(org.id)
  const assessment = useAssessment(org.id)
  const users = useUsers(org.id)
  const seeRisks = can('view', 'risk')
  const risks = useRisks(org.id, seeRisks)
  // RF04: the consultant is picked at registration, so it is not always Marta.
  const consultant = useConsultant(org.id).data?.name ?? 'A equipa aLinha'

  const assetTask = tasks.data?.find((t) => t.kind === 'ativos')
  const inventoryDone = assetTask?.status === 'concluida'
  const validated = roadmap.data?.validated
  const submitted = !!roadmap.data?.assessmentCompletedAt
  // Just registered (US10): nothing answered, assigned or registered yet.
  const fresh = !submitted && tasks.data?.length === 0 && assets.data?.length === 0

  const levels = (risks.data ?? []).map((r) => ({ level: computeRiskLevel(r.probability, r.impact).level, status: r.status }))
  const top: Level | null = levels.some((l) => l.level === 'alto') ? 'alto' : levels.some((l) => l.level === 'medio') ? 'medio' : levels.length ? 'baixo' : null
  const topCount = levels.filter((l) => l.level === top).length
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

  return (
    <>
      <header className="flex flex-col gap-2">
        <Eyebrow className="text-[12px]">{org.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold title-tight">Olá, Rui</h1>
        <p className="text-[16px] text-ink-soft">{subtitle}</p>
      </header>

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
          <Link to={`${base}/roadmap`}><Button variant="inverse" tabIndex={-1}>Ver roadmap →</Button></Link>
        ) : (
          <Button variant="inverse" disabled={!assessment.data} onClick={() => navigate(assessmentPath)}>{submitted ? 'Ver avaliação →' : notStarted ? 'Começar avaliação →' : 'Continuar avaliação →'}</Button>
        )}
      >
        <ProgressBar value={answered} max={total || 1} label="Progresso da avaliação" track="dark" className="mb-3 max-w-[420px]" />
        {validated && roadmap.data?.validatedAt ? `Validado a ${dateTime(roadmap.data.validatedAt)} por ${consultant}` : submitted ? `Submetida qua., 14 out. às 10:12 · ${consultant} está a rever` : notStarted ? 'Ainda sem respostas · o progresso fica guardado' : [...pending, 'o progresso fica guardado'].join(' · ')}
      </HighlightCard>

      <NextSteps steps={[
        { label: 'Registar os ativos que conhece', hint: 'Programas e serviços do dia a dia: ERP, email, portáteis.', done: (assets.data?.length ?? 0) > 0, to: `${base}/ativos?novo=1`, cta: 'Adicionar ativo' },
        { label: 'Pedir ao Pedro o registo técnico', hint: 'Servidores, rede e máquinas da fábrica. Ele recebe uma tarefa.', done: !!assetTask, to: `${base}/ativos?atribuir=1`, cta: 'Atribuir' },
        { label: 'Esperar que o Pedro conclua o registo', hint: assetTask ? `${assetTask.dueDate ? `Prazo: ${assetTask.dueDate.split('-').reverse().slice(0, 2).join('/')}. ` : ''}Recebe uma notificação quando ele terminar.` : undefined, done: inventoryDone, to: `${base}/ativos`, cta: 'Ver inventário' },
        { label: 'Terminar e submeter a avaliação', hint: 'O questionário de maturidade NIS2 + RGPD.', done: submitted, to: `${base}/avaliacao`, cta: 'Continuar' },
        { label: 'A consultora valida resultados, roadmap e riscos', hint: 'Não precisa de fazer nada: é avisado quando terminar.', done: !!validated },
        { label: 'Acompanhar os riscos e o plano de ação', hint: 'Comece pelos riscos altos.', done: false, to: validated ? `${base}/riscos` : undefined, cta: 'Ver riscos' },
      ]} />

      <div className="grid gap-4 md:grid-cols-3">
        {seeRisks && risks.data && top ? (
          <Link to={`${base}/riscos`} className="flex flex-col rounded-[14px] border border-line-soft bg-paper px-5 py-[18px] transition-[border-color,box-shadow] hover:border-line hover:shadow-[0_2px_10px_rgba(32,33,36,0.06)]">
            <div className="flex items-start justify-between"><Eyebrow>Riscos</Eyebrow><RiskLevelBadge level={top} /></div>
            <p className="mt-1.5 text-[18px] font-extrabold">{topCount} {topCount === 1 ? 'risco' : 'riscos'} {RISK_LEVEL_LABEL[top].toLowerCase()}{topCount === 1 ? '' : 's'} · {topTreating ? 'em tratamento' : 'por tratar'}</p>
            <p className="mt-1.5 text-[13px] text-ink-soft">{levels.length} riscos registados pela consultora</p>
          </Link>
        ) : (
          <Link to={`${base}/enquadramento`} className="contents">
            <StatCard label="Enquadramento" value={nis2?.label ?? '—'} caption={nis2?.official ? `Oficial · CNCS · Ato de ${shortDate(nis2.date!)}` : 'Sugestão indicativa · aguarda o CNCS'} />
          </Link>
        )}
        <Link to={`${base}/ativos`} className="contents">
          <StatCard label="Ativos" value={assets.data ? `${assets.data.length} ativos` : '…'} caption={`${services.data?.length ?? 2} serviços críticos · ${inventoryDone ? 'completo' : assetTask ? 'registo técnico atribuído' : 'falta o registo técnico'}`} />
        </Link>
        <ConsultantCard orgId={org.id} />
      </div>
    </>
  )
}
