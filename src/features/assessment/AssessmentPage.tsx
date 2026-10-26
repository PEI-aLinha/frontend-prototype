import { useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, Clock } from 'lucide-react'
import { useAssessment, useSubmitAssessment, useUsers } from '../../api/queries'
import { MATURITY_LABEL } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { Avatar, Button, Card, Chip, ErrorState, Eyebrow, Modal, NextSteps, PageHeader, ProgressBar, SkeletonRows, useToast } from '../../ui'

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
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Eyebrow>Progresso</Eyebrow>
                <Chip tone={a.status === 'em_curso' ? 'signal' : 'neutral'}>{STATUS[a.status]}</Chip>
              </div>
              <p className="text-3xl font-extrabold">{answered} <span className="text-base font-semibold text-ink-soft">de {total} perguntas respondidas</span></p>
              <ProgressBar value={answered} max={total} label="Progresso da avaliação" />
              {a.maturity && <p className="text-sm">Nível de maturidade: <strong>{a.maturity} de 5</strong> · {MATURITY_LABEL[a.maturity]}</p>}
            </Card>
            {a.status === 'em_curso' && total > 0 && answered === total && (
              <Card className="flex flex-col items-start gap-3 border-brand">
                <h2 className="text-base font-extrabold">Avaliação completa</h2>
                <p className="text-sm text-ink-soft">Respondeu a todas as perguntas. Quando submeter, a consultora revê as respostas e valida o roadmap.</p>
                <Button onClick={() => setConfirming(true)}>Submeter avaliação</Button>
              </Card>
            )}
            <ul className="flex flex-col gap-3" aria-label="Secções da avaliação">
              {a.sections.map((s) => {
                const complete = s.answered === s.total
                return (
                  <li key={s.id}>
                    <Card className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-sm font-bold">
                          {complete ? <CheckCircle2 className="size-4 text-brand" role="img" aria-label="Completa" /> : <Clock className="size-4 text-muted" role="img" aria-label="Por completar" />}
                          {s.name}
                        </h2>
                        <span className="shrink-0 text-sm text-ink-soft">{s.answered}/{s.total}</span>
                      </div>
                      <ProgressBar value={s.answered} max={s.total} label={`Progresso de ${s.name}`} />
                      {s.delegated.map((d) => {
                        const u = name(d.assigneeId)
                        return (
                          <p key={d.taskId} className="flex items-center gap-2 text-sm text-ink-soft">
                            {u && <Avatar initials={u.initials} size={24} />}
                            <span>1 pergunta delegada {u ? `ao ${u.name}` : ''}: <strong className={d.status === 'concluida' ? 'text-brand' : 'text-ink'}>{d.status === 'concluida' ? 'respondida' : 'à espera de resposta'}</strong></span>
                          </p>
                        )
                      })}
                      <Link to={s.id} className="self-start text-sm font-bold text-brand hover:underline">Ver perguntas<span className="sr-only"> de {s.name}</span> <span aria-hidden>→</span></Link>
                    </Card>
                  </li>
                )
              })}
            </ul>
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
