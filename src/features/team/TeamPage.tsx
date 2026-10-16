import { useState } from 'react'
import { Link } from 'react-router'
import { BellRing, CalendarClock, Mail, UserPlus, XCircle } from 'lucide-react'
import type { Task } from '../../api/contracts'
import { useRemindTask, useTasks, useToday, useUpdateTask, useUsers } from '../../api/queries'
import { dueStatus, longDay, ROLE_LABEL, shortDay } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import {
  Avatar, Button, Card, Chip, ErrorState, Explainer, Eyebrow, Field, Modal, PageHeader, Select, SkeletonRows, TextInput, cn, useToast,
} from '../../ui'

const ROLE_HINT: Record<string, string> = {
  responsavel: 'Vê tudo da empresa, atribui tarefas e aceita as decisões.',
  analista: 'Só vê as tarefas que lhe forem atribuídas e o que registar.',
  consultor: 'Valida resultados, roadmap e riscos. Pertence à aLinha.',
}

const TONE_CLASS = { late: 'bg-risk-high text-risk-high-ink', soon: 'bg-risk-medium text-risk-medium-ink', ok: 'bg-signal-soft text-brand' }

/** Equipa: quem tem acesso e as tarefas que o Responsável designado atribuiu (RF06, US14). */
export function TeamPage() {
  const org = useTenant()
  const users = useUsers(org.id)
  const tasks = useTasks(org.id)
  const today = useToday()
  const [invite, setInvite] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  if (users.isError || tasks.isError) return <ErrorState error={users.error ?? tasks.error} onRetry={() => { users.refetch(); tasks.refetch() }} />
  const list = tasks.data ?? []
  const pending = list.filter((t) => t.status === 'pendente')
  const closed = list.filter((t) => t.status !== 'pendente')

  return (
    <>
      <PageHeader eyebrow={org.name} title="Equipa" subtitle="Quem trabalha consigo no aLinha e o que pediu a cada pessoa." actions={<Button variant="secondary" icon={<UserPlus className="size-4" aria-hidden />} onClick={() => setInvite(true)}>Convidar analista</Button>} />
      <Explainer id="team" intro="Cada pessoa vê só o que precisa. Pode pedir trabalho técnico a um analista sem lhe dar acesso ao resto da empresa."
        steps={[
          { title: 'Convide', text: 'O analista recebe um email, cria a conta e ativa a autenticação em dois passos.' },
          { title: 'Atribua tarefas', text: 'Perguntas técnicas da avaliação ou o registo de ativos, sempre com prazo.' },
          { title: 'Acompanhe', text: 'Aqui vê o estado de cada tarefa, pode enviar um lembrete ou mudar o prazo.' },
        ]} />

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="text-[18px] font-extrabold">Pessoas</h2>
        {!users.data ? <SkeletonRows rows={3} /> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {users.data.map((u) => (
              <Card key={u.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar initials={u.initials} size={40} tone={u.role === 'consultor' ? 'dark' : 'soft'} />
                  <div className="min-w-0"><p className="truncate font-bold">{u.name}</p><p className="truncate text-[12px] text-muted">{u.email}</p></div>
                </div>
                <div><Chip tone={u.role === 'responsavel' ? 'dark' : u.role === 'analista' ? 'signal' : 'outline'}>{ROLE_LABEL[u.role]}</Chip></div>
                <p className="text-[13px] text-ink-soft">{ROLE_HINT[u.role]}</p>
              </Card>
            ))}
            <Card soft className="flex flex-col gap-3 border-dashed">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full border border-dashed border-line text-muted"><Mail className="size-4" aria-hidden /></span>
                <div className="min-w-0"><p className="truncate font-bold">ana.costa@compagueda.pt</p><p className="text-[12px] text-muted">Convite enviado a 12 out.</p></div>
              </div>
              <div><Chip tone="neutral">Convite pendente</Chip></div>
              <p className="text-[13px] text-ink-soft">Ainda não aceitou. O convite expira em 7 dias.</p>
            </Card>
          </div>
        )}
      </section>

      <section aria-labelledby="assigned" className="flex flex-col gap-3">
        <h2 id="assigned" className="text-[18px] font-extrabold">Tarefas atribuídas</h2>
        {!tasks.data || !today.data ? <SkeletonRows rows={3} /> : pending.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line px-5 py-6 text-[14px] text-ink-soft">Não há tarefas por fazer. Atribua o registo de ativos em <Link className="font-bold text-brand hover:underline" to={`/org/${org.slug}/ativos?atribuir=1`}>Ativos</Link>.</p>
        ) : pending.map((t) => <TaskRow key={t.id} task={t} today={today.data} assignee={users.data?.find((u) => u.id === t.assigneeId)?.name ?? '—'} onEdit={() => setEditing(t)} />)}
        {closed.length > 0 && (
          <>
            <Eyebrow className="mt-2">Concluídas ou canceladas</Eyebrow>
            {closed.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-[14px] bg-paper-soft px-5 py-3 text-[14px]">
                <span className="flex-1 text-ink-soft">{t.title}</span>
                <span className="text-[13px] text-muted">{users.data?.find((u) => u.id === t.assigneeId)?.name}</span>
                <Chip tone="neutral">{t.status === 'concluida' ? 'Concluída' : 'Cancelada'}</Chip>
              </div>
            ))}
          </>
        )}
      </section>

      {invite && <InviteModal onClose={() => setInvite(false)} />}
      {editing && today.data && <DueModal task={editing} today={today.data} onClose={() => setEditing(null)} />}
    </>
  )
}

function TaskRow({ task, today, assignee, onEdit }: { task: Task; today: string; assignee: string; onEdit: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const remind = useRemindTask(org.id)
  const update = useUpdateTask(org.id)
  const due = dueStatus(task.dueDate, today)
  return (
    <article className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line-soft bg-paper px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{task.kind === 'ativos' ? 'Ativos' : 'Pergunta técnica'}</Chip>
          <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold', TONE_CLASS[due.tone])}>{due.label}</span>
        </div>
        <h3 className="mt-2 text-[16px] font-bold">{task.title}</h3>
        <p className="text-[13px] text-muted">Para {assignee} · até {shortDay(task.dueDate)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<BellRing className="size-4" aria-hidden />} loading={remind.isPending} onClick={() => remind.mutate(task.id, { onSuccess: () => toast.show(`Lembrete enviado a ${assignee}`), onError: (e) => toast.show(e.message, 'error') })}>Lembrar</Button>
        <Button variant="secondary" size="sm" icon={<CalendarClock className="size-4" aria-hidden />} onClick={onEdit}>Mudar prazo</Button>
        <Button variant="ghost" size="sm" icon={<XCircle className="size-4" aria-hidden />} loading={update.isPending} onClick={() => update.mutate({ id: task.id, change: { status: 'cancelada' } }, { onSuccess: () => toast.show('Tarefa cancelada'), onError: (e) => toast.show(e.message, 'error') })}>Cancelar</Button>
      </div>
    </article>
  )
}

const DUE_OPTIONS = ['2026-10-15', '2026-10-16', '2026-10-20', '2026-10-23', '2026-10-30']

function DueModal({ task, today, onClose }: { task: Task; today: string; onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const update = useUpdateTask(org.id)
  const [due, setDue] = useState(DUE_OPTIONS.find((d) => d >= today && d !== task.dueDate) ?? DUE_OPTIONS.at(-1)!)
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} chip={<Chip>Tarefa</Chip>} title="Mudar o prazo" description={`${task.title}. O analista é avisado do novo prazo.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={update.isPending} onClick={() => update.mutate({ id: task.id, change: { dueDate: due } }, { onSuccess: () => { toast.show('Prazo alterado'); onClose() }, onError: (e) => toast.show(e.message, 'error') })}>Guardar prazo</Button></>}>
      <Field label="Novo prazo">{(p) => <Select id={p.id} value={due} onChange={setDue} options={DUE_OPTIONS.filter((d) => d >= today).map((d) => ({ value: d, label: longDay(d) }))} />}</Field>
    </Modal>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const submit = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Indique um email válido.'); return }
    toast.show(`Convite enviado para ${email.trim()} (simulado)`)
    onClose()
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} chip={<Chip>Equipa</Chip>} title="Convidar analista" description="O analista só vê as tarefas que lhe atribuir. Pode ser um técnico externo."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit}>Enviar convite</Button></>}>
      <Field label="Email" error={error}>{(p) => <TextInput id={p.id} type="email" invalid={p.invalid} aria-describedby={p.describedBy} value={email} onChange={(e) => { setEmail(e.target.value); setError(undefined) }} placeholder="nome@empresa.pt" autoFocus />}</Field>
      <p className="text-[13px] text-muted">Neste protótipo o convite não é enviado. No produto, o email leva a um registo com autenticação em dois passos.</p>
    </Modal>
  )
}
