import { useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, Clock } from 'lucide-react'
import { useAssessment, useSubmitAssessment, useUsers } from '../../api/queries'
import { MATURITY_LABEL } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { PageTour } from '../../core/onboarding/PageTour'
import { Avatar, Button, Card, Chip, ErrorState, Eyebrow, Modal, NextSteps, PageHeader, ProgressBar, SkeletonRows, Term, cn, useToast } from '../../ui'

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
      <PageHeader eyebrow={org.name} title="Avaliação" subtitle="Questionário de maturidade em cibersegurança, alinhado com o Decreto-Lei 125/2025 (NIS2)." help={<PageTour id="avaliacao" ready={!!a} />} />
      {!a ? <SkeletonRows rows={6} /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4">
            <Card as="section" aria-labelledby="assessment-progress-title" className="flex flex-col gap-3" data-tour="assessment-progress">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Eyebrow as="h2"><span id="assessment-progress-title">Progresso</span></Eyebrow>
                <Chip tone={a.status === 'em_curso' ? 'signal' : 'neutral'}>{STATUS[a.status]}</Chip>
              </div>
              <p className="text-[1.75rem] font-extrabold">{answered} <span className="text-[1rem] font-semibold text-ink-soft">de {total} perguntas respondidas</span></p>
              <ProgressBar value={answered} max={total} label="Progresso da avaliação" />
              {a.maturity && <p className="text-[0.875rem]"><Term k="maturidade">Nível de maturidade</Term>: <strong>{a.maturity} de 5</strong> · {MATURITY_LABEL[a.maturity]}</p>}
            </Card>
            {a.status === 'em_curso' && total > 0 && answered === total && (
              <Card className="flex flex-col items-start gap-3 border-brand">
                <h2 className="section-title">Avaliação completa</h2>
                <p className="text-[0.875rem] text-ink-soft">Respondeu a todas as perguntas. Quando submeter, a consultora revê as respostas e valida o roadmap.</p>
                <Button onClick={() => setConfirming(true)}>Submeter avaliação</Button>
              </Card>
            )}
            <ul className="flex flex-col gap-3" aria-label="Secções da avaliação" data-tour="assessment-sections">
              {a.sections.map((s) => {
                const complete = s.answered === s.total
                return (
                  <li key={s.id}>
                    {/* Finished sections step back (soft, no bar) so the eye lands on what is still open. */}
                    <Card soft={complete} className={cn('flex flex-col gap-2.5', complete && 'py-3.5')}>
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold">
                          {complete ? <CheckCircle2 className="size-4 text-brand" role="img" aria-label="Completa" /> : <Clock className="size-4 text-muted" role="img" aria-label="Por completar" />}
                          {s.name}
                        </h2>
                        <span className="shrink-0 text-[0.8125rem] text-ink-soft">{s.answered}/{s.total}</span>
                      </div>
                      {!complete && <ProgressBar value={s.answered} max={s.total} label={`Progresso de ${s.name}`} />}
                      {s.delegated.map((d) => {
                        const u = name(d.assigneeId)
                        return (
                          <p key={d.taskId} className="flex items-center gap-2 text-[0.8125rem] text-ink-soft">
                            {u && <Avatar initials={u.initials} size={24} />}
                            <span>1 pergunta delegada {u ? `ao ${u.name}` : ''}: <strong className={d.status === 'concluida' ? 'text-brand' : 'text-ink'}>{d.status === 'concluida' ? 'respondida' : 'à espera de resposta'}</strong></span>
                          </p>
                        )
                      })}
                      <Link to={s.id} className={cn('self-start text-[0.875rem] font-bold hover:underline', complete ? 'text-ink-soft' : 'text-brand')}>{complete ? 'Rever respostas' : 'Ver perguntas'}<span className="sr-only"> de {s.name}</span> <span aria-hidden>→</span></Link>
                    </Card>
                  </li>
                )
              })}
            </ul>
          </div>
          <aside aria-label="Próximos passos da avaliação" className="flex flex-col gap-4" data-tour="assessment-next">
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
      {submit.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[0.8125rem] font-semibold text-risk-high-ink">{submit.error.message}</p>}
    </Modal>
  )
}
