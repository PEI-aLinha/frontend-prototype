import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CheckCircle2, ChevronDown, Clock } from 'lucide-react'
import type { AssessmentSection } from '../../api/contracts'
import { useAssessment, useSubmitAssessment, useUsers } from '../../api/queries'
import { MATURITY_LABEL } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { Avatar, Button, Card, Chip, ErrorState, Eyebrow, Modal, NextSteps, PageHeader, ProgressBar, SkeletonRows, cn, useToast } from '../../ui'

const STATUS = { em_curso: 'Em curso', submetida: 'Concluída · a aguardar validação', validada: 'Validada pela consultora' } as const

/** Rui's maturity assessment: summary per section and delegated questions. The questionnaire is another plugin. */
export function AssessmentPage() {
  const org = useTenant()
  const assessment = useAssessment(org.id)
  const users = useUsers(org.id)
  const [confirming, setConfirming] = useState(false)
  if (assessment.error) return <ErrorState error={assessment.error} onRetry={assessment.refetch} />
  const a = assessment.data
  const answered = a?.sections.reduce((n, s) => n + s.answered, 0) ?? 0
  const total = a?.sections.reduce((n, s) => n + s.total, 0) ?? 0
  const name = (id: string) => users.data?.find((u) => u.id === id)

  return (
    <>
      <PageHeader eyebrow={org.name} title="Avaliação" subtitle="Questionário de maturidade em cibersegurança, alinhado com o Decreto-Lei 125/2025 (NIS2)." />
      {!a ? <SkeletonRows rows={6} /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4">
            <ProgressCard to={a.nextQuestion ? `${a.nextQuestion.sectionId}/${a.nextQuestion.questionId}` : undefined}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Eyebrow>Progresso</Eyebrow>
                <Chip tone={a.status === 'em_curso' ? 'signal' : 'neutral'}>{STATUS[a.status]}</Chip>
              </div>
              <p className="text-3xl font-extrabold">{answered} <span className="text-base font-semibold text-ink-soft">de {total} perguntas respondidas</span></p>
              <ProgressBar value={answered} max={total} label="Progresso da avaliação" />
              {a.maturity && <p className="text-sm">Nível de maturidade: <strong>{a.maturity} de 5</strong> · {MATURITY_LABEL[a.maturity]}</p>}
            </ProgressCard>
            {a.status === 'em_curso' && total > 0 && answered === total && (
              <Card className="flex flex-col items-start gap-3 border-brand">
                <h2 className="text-base font-extrabold">Avaliação completa</h2>
                <p className="text-sm text-ink-soft">Respondeu a todas as perguntas. Quando submeter, a consultora revê as respostas e valida o roadmap.</p>
                <Button onClick={() => setConfirming(true)}>Submeter avaliação</Button>
              </Card>
            )}
            <SectionsTable sections={a.sections} userName={(id) => name(id)?.name} initials={(id) => name(id)?.initials} />
          </div>
          <aside className="flex flex-col gap-4">
            <NextSteps steps={[
              { label: 'Responder a todas as secções', done: a.status !== 'em_curso', hint: a.status === 'em_curso' ? `Faltam ${total - answered} perguntas.` : undefined },
              { label: 'Receber as respostas do Pedro', done: a.sections.every((s) => s.delegated.every((d) => d.status === 'concluida')) },
              { label: 'Validação pela consultora', done: a.status === 'validada', hint: 'A Marta revê as respostas e valida o roadmap.' },
              { label: 'Ver resultados e roadmap', done: false, to: a.status === 'validada' ? `/org/${org.slug}/roadmap` : undefined, cta: 'Abrir' },
            ]} />
          </aside>
        </div>
      )}
      {confirming && <SubmitModal onClose={() => setConfirming(false)} />}
    </>
  )
}

/** Confirms the submission: afterwards the answers are read-only. */
function SubmitModal({ onClose }: { onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const submit = useSubmitAssessment(org.id)
  const confirm = () => {
    submit.mutateAsync()
      .then(() => { toast.show('Avaliação submetida. A consultora vai rever as respostas.'); onClose() })
      .catch(() => {}) // The error is shown in the dialog (submit.isError).
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Submeter a avaliação?"
      description="Depois de submeter, as respostas deixam de poder ser alteradas. A consultora vai revê-las e validar o roadmap."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={confirm} loading={submit.isPending}>Submeter</Button></>}>
       {submit.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-sm font-semibold text-risk-high-ink">{submit.error.message}</p>}
    </Modal>
  )
}

/** Progress summary; while there is a question to answer, the whole card opens it. */
function ProgressCard({ to, children }: { to?: string; children: ReactNode }) {
  if (!to) return <Card className="flex flex-col gap-3">{children}</Card>
  return (
    <Link to={to} aria-label="Responder à próxima pergunta" className="group flex items-center gap-4 rounded-[14px] border border-line-soft bg-paper px-5 py-[18px] transition-[border-color,box-shadow] hover:border-brand hover:shadow-[0_2px_10px_rgb(var(--shadow-rgb)/0.06)]">
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white transition-transform group-hover:translate-x-0.5"><ArrowRight className="size-5" aria-hidden /></span>
    </Link>
  )
}

/** Questions grouped by topic: collapsed by default; each topic expands to its progress, delegations and link. */
function SectionsTable({ sections, userName, initials }: { sections: AssessmentSection[]; userName: (id: string) => string | undefined; initials: (id: string) => string | undefined }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const total = sections.reduce((n, s) => n + s.total, 0)
  return (
    <section aria-labelledby="sections-title" className="rounded-[14px] border border-line-soft bg-paper">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sections-list" className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
        <span className="min-w-0 flex-1">
          <span id="sections-title" className="block text-sm font-bold">Perguntas por tópico</span>
          <span className="block text-[0.8125rem] text-ink-soft">{sections.length} tópicos · {total} perguntas</span>
        </span>
        <ChevronDown className={cn('size-4 text-ink-soft transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul id="sections-list" className="border-t border-line-soft" aria-label="Secções da avaliação">
          {sections.map((s) => {
            const complete = s.answered === s.total
            const isOpen = expanded === s.id
            const panel = `section-${s.id}`
            return (
              <li key={s.id} className="border-b border-line-soft last:border-b-0">
                <button type="button" onClick={() => setExpanded(isOpen ? null : s.id)} aria-expanded={isOpen} aria-controls={panel} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-paper-soft">
                  {complete ? <CheckCircle2 className="size-4 shrink-0 text-brand" role="img" aria-label="Completa" /> : <Clock className="size-4 shrink-0 text-muted" role="img" aria-label="Por completar" />}
                  <span className="min-w-0 flex-1 text-sm font-bold">{s.name}</span>
                  <span className="hidden shrink-0 text-sm text-ink-soft sm:inline">{s.total} perguntas</span>
                  <span className="w-12 shrink-0 text-right text-sm font-semibold">{s.answered}/{s.total}</span>
                  <ChevronDown className={cn('size-4 shrink-0 text-ink-soft transition-transform', isOpen && 'rotate-180')} aria-hidden />
                </button>
                {isOpen && (
                  <div id={panel} className="flex flex-col gap-2.5 px-5 pb-4">
                    <ProgressBar value={s.answered} max={s.total} label={`Progresso de ${s.name}`} />
                    {s.delegated.map((d) => {
                      const n = userName(d.assigneeId)
                      const i = initials(d.assigneeId)
                      return (
                        <p key={d.taskId} className="flex items-center gap-2 text-sm text-ink-soft">
                          {i && <Avatar initials={i} size={24} />}
                          <span>1 pergunta delegada {n ? `ao ${n}` : ''}: <strong className={d.status === 'concluida' ? 'text-brand' : 'text-ink'}>{d.status === 'concluida' ? 'respondida' : 'à espera de resposta'}</strong></span>
                        </p>
                      )
                    })}
                    <Link to={s.id} className="self-start text-sm font-bold text-brand hover:underline">Ver perguntas<span className="sr-only"> de {s.name}</span> <span aria-hidden>→</span></Link>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
