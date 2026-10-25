import { Link, useParams } from 'react-router'
import { ArrowLeft, CheckCircle2, Clock, UserRound } from 'lucide-react'
import type { AssessmentQuestion, Task, User } from '../../api/contracts'
import { useAssessment, useAssessmentQuestions, useTasks, useUsers } from '../../api/queries'
import { useTenant } from '../../core/tenant'
import { Card, Chip, EmptyState, ErrorState, Note, PageHeader, ProgressBar, SkeletonRows } from '../../ui'
import { CHOICE_LABEL } from './choices'

/** Questions of one assessment section, with the state of each one. */
export function SectionPage() {
  const { sectionId = '' } = useParams()
  const org = useTenant()
  const assessment = useAssessment(org.id)
  const questions = useAssessmentQuestions(org.id, sectionId)
  const tasks = useTasks(org.id)
  const users = useUsers(org.id)
  const back = <Link to={`/org/${org.slug}/avaliacao`} className="-mb-4 inline-flex items-center gap-1.5 text-[0.875rem] font-bold text-brand hover:underline"><ArrowLeft className="size-4" aria-hidden /><span className="sr-only">Voltar à </span>Avaliação</Link>

  const error = assessment.error ?? questions.error
  if (error) return <>{back}<ErrorState error={error} onRetry={() => { assessment.refetch(); questions.refetch() }} /></>
  if (!assessment.data || !questions.data) return <SkeletonRows rows={6} />
  const section = assessment.data.sections.find((s) => s.id === sectionId)
  if (!section) return <>{back}<EmptyState headingLevel={1} title="Secção não encontrada">Volte à avaliação e escolha uma secção.</EmptyState></>

  return (
    <>
      {back}
      <PageHeader eyebrow="Avaliação de maturidade" title={section.name} subtitle={`${section.answered} de ${section.total} perguntas respondidas`} />
      <div className="flex max-w-[760px] flex-col gap-4">
        <ProgressBar value={section.answered} max={section.total} label={`Progresso de ${section.name}`} />
        {assessment.data.status !== 'em_curso' && <Note>A avaliação já foi submetida. As respostas já não podem ser alteradas.</Note>}
        <ol className="flex flex-col gap-3" aria-label={`Perguntas de ${section.name}`}>
          {questions.data.map((q, i) => {
            const task = tasks.data?.find((t) => t.id === q.delegatedTaskId)
            return (
              <li key={q.id}>
                <Card className="flex items-start gap-4">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-paper-soft text-[0.8125rem] font-bold text-ink-soft" aria-hidden>{i + 1}</span>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Link to={q.id} className="text-[0.9375rem] font-bold leading-snug hover:text-brand hover:underline">{q.text}</Link>
                    <QuestionState question={q} task={task} assignee={users.data?.find((u) => u.id === task?.assigneeId)} />
                  </div>
                </Card>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}

function QuestionState({ question, task, assignee }: { question: AssessmentQuestion; task?: Task; assignee?: User }) {
  if (question.answer) {
    const byAnalyst = task?.status === 'concluida' && task.answer?.choice === question.answer.choice && task.answer?.note === question.answer.note
    return (
      <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-soft">
        <CheckCircle2 className="size-4 text-brand" aria-hidden />
        <span>Respondida{byAnalyst && assignee ? ` por ${assignee.name}` : ''}:</span>
        <Chip>{CHOICE_LABEL[question.answer.choice]}</Chip>
      </p>
    )
  }
  if (question.delegatedTaskId) {
    return (
      <p className="flex items-center gap-2 text-[0.8125rem] text-ink-soft">
        <UserRound className="size-4" aria-hidden />
        <span>Delegada{assignee ? ` a ${assignee.name}` : ''}: <strong className="text-ink">à espera de resposta</strong></span>
      </p>
    )
  }
  return (
    <p className="flex items-center gap-2 text-[0.8125rem] text-muted">
      <Clock className="size-4" aria-hidden />
      Por responder
    </p>
  )
}
