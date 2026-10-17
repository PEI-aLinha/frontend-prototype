import { useNavigate } from 'react-router'
import { Check, Inbox, Minus } from 'lucide-react'
import { useAssets, useTasks, useToday } from '../../api/queries'
import { dueStatus, shortDay } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { Button, Card, EmptyState, ErrorState, Explainer, Eyebrow, PageHeader, SkeletonRows, TaskCard, cn } from '../../ui'
import { useSession } from '../../core/session'

const VISIBILITY: Array<[string, boolean]> = [['Só as tarefas que lhe foram atribuídas', true], ['Os ativos que registar', true]]

/** 09 / 09b / 09c — As minhas tarefas (analista). */
export function TasksPage() {
  const org = useTenant()
  const { persona } = useSession()
  const navigate = useNavigate()
  const tasks = useTasks(org.id)
  const today = useToday()
  const assets = useAssets(org.id)

  const list = (tasks.data ?? []).filter((t) => t.status !== 'cancelada')
  const open = list.filter((t) => t.status === 'pendente')
  const done = list.filter((t) => t.status === 'concluida')
  const registered = (taskId: string) => (assets.data ?? []).filter((a) => a.taskId === taskId).length
  const subtitle = !tasks.data ? ' ' : list.length === 0 ? 'Boas-vindas ao aLinha.' : open.length === 0 ? 'Não tem tarefas pendentes. O Rui Santos foi notificado.' : `Tem ${open.length} ${open.length === 1 ? 'tarefa atribuída' : 'tarefas atribuídas'} pelo Rui Santos.`

  const card = (t: (typeof list)[number]) => (
    <TaskCard
      key={t.id}
      type={t.kind === 'ativos' ? 'Ativos' : t.kind === 'integracao' ? 'Integração' : 'Pergunta técnica'}
      due={t.dueDate ? `Até ${shortDay(t.dueDate)}${today.data ? ` · ${dueStatus(t.dueDate, today.data).label}` : ''}` : 'Sem prazo'}
      title={t.title}
      meta={t.kind === 'ativos' ? `${t.context} · ${registered(t.id)} de ${t.expectedCount ?? 4} registados` : t.context}
      done={t.status === 'concluida'}
      action={<Button onClick={() => navigate(t.kind === 'ativos' ? `/org/${org.slug}/tarefas/${t.id}/ativos` : t.kind === 'integracao' ? `/org/${org.slug}/integracoes` : `/org/${org.slug}/tarefas/${t.id}/pergunta`)}>{t.kind === 'integracao' ? 'Ligar' : t.kind === 'pergunta' ? (t.status === 'concluida' ? 'Ver resposta' : 'Responder') : 'Registar'}</Button>}
    />
  )

  return (
    <>
      <PageHeader eyebrow={org.name} title={`Olá, ${persona.firstName}`} subtitle={subtitle} />
      <Explainer id="tasks-analyst"
        steps={[
          { title: 'Escolha a tarefa', text: 'As mais urgentes aparecem primeiro, com o prazo a verde.' },
          { title: 'Faça o pedido', text: 'Responder a uma pergunta técnica ou registar os ativos que conhece.' },
          { title: 'Conclua', text: 'Ao concluir, o Rui é notificado e a tarefa passa para "Concluídas".' },
        ]} />
      <div className="flex gap-7 max-lg:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {tasks.isError ? <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} /> : !tasks.data ? <SkeletonRows rows={3} /> : (
            <>
              {list.length === 0 && (
                <EmptyState icon={<Inbox className="size-5" aria-hidden />} title="Ainda não tem tarefas">
                  Quando o Responsável designado lhe atribuir uma pergunta técnica, uma evidência ou outra tarefa, aparece aqui com o prazo. Também recebe um email.
                </EmptyState>
              )}
              {open.length > 0 && <h2 className="text-[16px] font-bold">Para esta semana</h2>}
              {open.map(card)}
              {done.length > 0 && <h2 className={cn('text-[16px] font-bold', open.length > 0 && 'mt-3')}>Concluídas</h2>}
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
              <span className={cn('text-[13px]', on ? 'text-ink' : 'text-ink-soft')}>{s}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
