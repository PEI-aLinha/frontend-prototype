import { useNavigate } from 'react-router'
import { Check, Inbox, Minus } from 'lucide-react'
import type { Task } from '../../api/contracts'
import { useAssets, useCompleteTask, useTasks, useToday, useUsers } from '../../api/queries'
import { dueStatus, shortDay } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { Button, Card, Chip, EmptyState, ErrorState, Eyebrow, PageHeader, SkeletonRows, TaskCard, Tooltip, cn, useToast } from '../../ui'
import { useSession } from '../../core/session'

const KIND_LABEL: Record<Task['kind'], string> = { ativos: 'Ativos', pergunta: 'Pergunta técnica', evidencia: 'Evidência', tarefa: 'Tarefa', integracao: 'Integração' }

const VISIBILITY: Array<[string, boolean]> = [['Só as tarefas que lhe foram atribuídas', true], ['Os ativos que registar', true], ['Resultados, roadmap e riscos', false]]

/** 09 / 09b / 09c — As minhas tarefas (analista). */
export function TasksPage() {
  const org = useTenant()
  const { persona } = useSession()
  const navigate = useNavigate()
  const tasks = useTasks(org.id)
  const today = useToday()
  const assets = useAssets(org.id)
  const complete = useCompleteTask(org.id)
  const users = useUsers(org.id)
  const toast = useToast()

  const list = (tasks.data ?? []).filter((t) => t.status !== 'cancelada')
  // Earliest deadline first; tasks without a deadline at the end.
  const open = list.filter((t) => t.status === 'pendente').sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  const done = list.filter((t) => t.status === 'concluida')
  const registered = (taskId: string) => (assets.data ?? []).filter((a) => a.taskId === taskId).length
  // Who assigned the tasks: their name when it is a single person, otherwise the role.
  const assigners = [...new Set(list.map((t) => t.assignedBy))]
  const assigner = (assigners.length === 1 && users.data?.find((u) => u.id === assigners[0])?.name) || 'o Responsável designado'
  const subtitle = !tasks.data ? ' ' : list.length === 0 ? 'Boas-vindas ao aLinha.' : open.length === 0 ? `Não tem tarefas pendentes. Avisámos ${assigner}.` : `Tem ${open.length} ${open.length === 1 ? 'tarefa atribuída' : 'tarefas atribuídas'} por ${assigner}.`

  // One primary per view: the most urgent open task leads, the rest step back.
  const lead = open[0]?.id
  const card = (t: (typeof list)[number]) => {
    const due = t.dueDate && today.data ? dueStatus(t.dueDate, today.data) : null
    const late = due?.tone === 'late'
    let action
    if (t.kind === 'evidencia') {
      action = <Tooltip content="A submissão de evidências ainda não está disponível nesta versão."><Button variant="secondary" aria-disabled className="aria-disabled:cursor-not-allowed aria-disabled:bg-paper-soft aria-disabled:text-muted">Submeter</Button></Tooltip>
    } else if (t.kind === 'tarefa') {
      action = t.status === 'pendente' && <Button variant="secondary" loading={complete.isPending && complete.variables === t.id} onClick={() => complete.mutate(t.id, { onSuccess: () => toast.show('Tarefa concluída. O Responsável designado foi avisado.'), onError: (e) => toast.show(e.message, 'error') })}>Marcar como feita</Button>
    } else {
      action = <Button variant={t.id === lead ? 'primary' : 'secondary'} onClick={() => navigate(t.kind === 'ativos' ? `/org/${org.slug}/tarefas/${t.id}/ativos` : t.kind === 'integracao' ? `/org/${org.slug}/integracoes` : `/org/${org.slug}/tarefas/${t.id}/pergunta`)}>{t.kind === 'integracao' ? 'Ligar' : t.kind === 'pergunta' ? (t.status === 'concluida' ? 'Ver resposta' : 'Responder') : 'Registar'}</Button>
    }
    return (
      <TaskCard
        key={t.id}
        type={KIND_LABEL[t.kind]}
        state={late ? <Chip className="bg-risk-high text-risk-high-ink">Atrasada</Chip> : <Chip tone="outline">Por fazer</Chip>}
        late={late}
        due={t.dueDate ? `Até ${shortDay(t.dueDate)}${due && !late ? ` · ${due.label}` : ''}` : 'Sem prazo'}
        title={t.title}
        meta={t.kind === 'ativos' ? `${t.context} · ${registered(t.id)} de ${t.expectedCount ?? 4} registados` : t.context}
        done={t.status === 'concluida'}
        action={action}
      />
    )
  }

  return (
    <>
      <PageHeader eyebrow={org.name} title={`Olá, ${persona.firstName}`} subtitle={subtitle} />
      <div className="flex gap-7 max-lg:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {tasks.isError ? <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} /> : !tasks.data ? <SkeletonRows rows={3} /> : (
            <>
              {list.length === 0 && (
                <EmptyState icon={<Inbox className="size-5" aria-hidden />} title="Ainda não tem tarefas">
                  Quando o Responsável designado lhe atribuir uma pergunta técnica, uma evidência ou outra tarefa, aparece aqui com o prazo. Também recebe um email.
                </EmptyState>
              )}
              {open.length > 0 && <h2 className="section-title">Por fazer</h2>}
              {open.map(card)}
              {done.length > 0 && <h2 className={cn('section-title', open.length > 0 && 'mt-3')}>Concluídas</h2>}
              {done.map(card)}
            </>
          )}
        </div>
        <Card soft className="flex w-[340px] shrink-0 flex-col gap-2.5 self-start rounded-[16px] p-[22px] max-lg:w-full">
          <Eyebrow>O que vê aqui</Eyebrow>
          {VISIBILITY.map(([s, on]) => (
            <div key={s} className="flex items-start gap-2.5">
              <span className={cn('mt-px grid size-5 shrink-0 place-items-center rounded-full', on ? 'bg-signal-soft text-brand' : 'bg-paper-deep text-ink-soft')}>
                {on ? <Check className="size-3" strokeWidth={3} aria-label="Sim" /> : <Minus className="size-3" strokeWidth={3} aria-label="Não" />}
              </span>
              <span className={cn('text-[0.8125rem]', on ? 'text-ink' : 'text-ink-soft')}>{s}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
