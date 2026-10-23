import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import type { AnswerChoice } from '../../api/contracts'
import { useAnswerQuestion, useTasks, useUsers } from '../../api/queries'
import { shortDay } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { AIBadge, Button, Card, EmptyState, Eyebrow, Field, Note, OptionGroup, PageHeader, SkeletonRows, TextArea, useToast } from '../../ui'

const CHOICES: Array<{ value: AnswerChoice; label: string; hint: string }> = [
  { value: 'sim', label: 'Sim', hint: 'Está implementado em todos os casos.' },
  { value: 'parcial', label: 'Em parte', hint: 'Só em alguns sistemas ou contas.' },
  { value: 'nao', label: 'Não', hint: 'Não está implementado.' },
  { value: 'nao_sei', label: 'Não sei', hint: 'Não tenho como confirmar. O Rui decide como responder.' },
]

/** Technical question delegated to the analyst (screen 10 / D10). */
export function QuestionPage() {
  const { taskId } = useParams()
  const org = useTenant()
  const navigate = useNavigate()
  const toast = useToast()
  const tasks = useTasks(org.id)
  const users = useUsers(org.id)
  const answer = useAnswerQuestion(org.id)
  const [choice, setChoice] = useState<AnswerChoice | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()

  if (!tasks.data) return <SkeletonRows rows={4} />
  const task = tasks.data.find((t) => t.id === taskId && t.kind === 'pergunta')
  if (!task) return <EmptyState title="Pergunta não encontrada">Volte às suas tarefas.</EmptyState>
  const from = users.data?.find((u) => u.id === task.assignedBy)?.name ?? 'Rui Santos'
  const answered = task.status === 'concluida'

  const submit = () => {
    if (!choice) { setError('Escolha uma resposta.'); return }
    answer.mutate({ taskId: task.id, answer: { choice, note } }, {
      onSuccess: () => { toast.show(`Resposta enviada ao ${from}`); navigate(`/org/${org.slug}/tarefas`) },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  return (
    <>
      <Link to={`/org/${org.slug}/tarefas`} className="-mb-4 inline-flex items-center gap-1.5 text-[0.875rem] font-bold text-brand hover:underline"><ArrowLeft className="size-4" aria-hidden />As minhas tarefas</Link>
      <PageHeader eyebrow={task.context} title="Pergunta técnica" subtitle={`Pedida por ${from} · ${task.dueDate ? `até ${shortDay(task.dueDate)}` : 'sem prazo'}`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col gap-5 px-7 py-6 max-md:px-5">
          <p className="text-[1.25rem] font-extrabold leading-snug">{task.title}</p>
          {answered ? (
            <div className="rounded-[14px] bg-paper-soft p-4">
              <Eyebrow>A sua resposta</Eyebrow>
              <p className="mt-1 text-[1rem] font-bold">{CHOICES.find((c) => c.value === task.answer?.choice)?.label ?? '—'}</p>
              {task.answer?.note && <p className="mt-1 text-[0.875rem] text-ink-soft">"{task.answer.note}"</p>}
            </div>
          ) : (
            <form noValidate className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
              <OptionGroup name="resposta" legend="A sua resposta" value={choice} onChange={(v) => { setChoice(v); setError(undefined) }} options={CHOICES} columns={2} error={error} />
              <Field label="Comentário" optional hint="Ajuda o Rui a perceber a resposta. Ex.: que contas não têm.">
                {(p) => <TextArea id={p.id} aria-describedby={p.describedBy} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => navigate(`/org/${org.slug}/tarefas`)}>Responder mais tarde</Button>
                <Button type="submit" loading={answer.isPending}>Enviar resposta</Button>
              </div>
            </form>
          )}
        </Card>
        <aside className="flex flex-col gap-3">
          {task.aiHelp && (
            <section aria-label="Ajuda" className="flex flex-col gap-2.5 rounded-[16px] border border-brand-soft bg-paper p-5">
              <AIBadge kind="info" />
              <h2 className="text-[0.9375rem] font-extrabold">O que esta pergunta quer saber</h2>
              <p className="text-[0.875rem] leading-relaxed text-ink-soft">{task.aiHelp}</p>
              <p className="text-[0.75rem] text-muted">Esta explicação não responde por si. A resposta é sua.</p>
            </section>
          )}
          <Note>Só vê esta pergunta. O resto da avaliação continua com o {from}.</Note>
        </aside>
      </div>
    </>
  )
}
