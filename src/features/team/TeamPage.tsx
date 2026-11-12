import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { BellRing, CalendarClock, ClipboardPlus, ExternalLink, Send, UserMinus, UserPlus, XCircle } from 'lucide-react'
import type { Task, TeamMember } from '../../api/contracts'
import { useCancelInvite, useInviteAnalyst, useMembers, useRemindTask, useRemoveMember, useResendInvite, useTasks, useToday, useUpdateTask, useUsers } from '../../api/queries'
import { isValidEmail } from '../../config/email'
import { dueStatus, longDay, ROLE_LABEL, shortDate, shortDay } from '../../config/labels'
import { useSession } from '../../core/session'
import { AssignWorkModal } from '../organization/public'
import { useTenant } from '../../core/tenant'
import {
  Avatar, Button, Chip, DataTable, ErrorState, Eyebrow, Field, Modal, PageHeader, Select, SkeletonRows, TextInput, Tooltip, cn, useToast, type ColumnDef,
} from '../../ui'

const initialsOf = (name: string) => {
  const p = name.trim().split(/\s+/)
  return (p[0][0] + (p.length > 1 ? p.at(-1)![0] : '')).toUpperCase()
}

/** One member or pending invitation (US12): name, email, role and status. */
interface TaskCount { open: number; late: number; done: number }

/** Tasks of one analyst (US14): to do, of which late, and done. */
function TaskCountCell({ c }: { c?: TaskCount }) {
  if (!c) return <span className="text-[0.8125rem] text-muted">—</span>
  if (c.open === 0 && c.done === 0) return <span className="text-[0.8125rem] text-ink-soft">Sem tarefas</span>
  return (
    <span className="flex flex-col text-[0.8125rem] leading-snug">
      <span className="font-bold text-ink">{c.open === 0 ? 'Nada por fazer' : `${c.open} por fazer`}</span>
      <span className="text-[0.75rem] text-muted">
        {c.late > 0 && <span className="font-bold text-risk-high-ink">{c.late} {c.late === 1 ? 'atrasada' : 'atrasadas'} · </span>}
        {c.done} {c.done === 1 ? 'concluída' : 'concluídas'}
      </span>
    </span>
  )
}

function MemberName({ m, isMe }: { m: TeamMember; isMe: boolean }) {
  const pending = m.status === 'convite_pendente'
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar initials={initialsOf(m.name)} size={36} tone={pending ? 'soft' : 'dark'} />
      <span className="min-w-0">
        <span className={cn('block truncate font-bold', pending && 'text-ink-soft')}>{m.name}{isMe && <span className="font-normal text-muted"> (você)</span>}</span>
        <span className="block truncate text-[0.8125rem] text-ink-soft">{m.email}</span>
      </span>
    </span>
  )
}

function MemberStatus({ m }: { m: TeamMember }) {
  const pending = m.status === 'convite_pendente'
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {pending ? <Chip tone="neutral">Convite pendente</Chip> : <Chip tone="signal">Ativo</Chip>}
      {pending && m.invitedAt && <span className="text-[0.75rem] text-muted">enviado a <time dateTime={m.invitedAt}>{shortDate(m.invitedAt)}</time></span>}
    </span>
  )
}

function MemberActions({ m, onConfirm, onAssign, className }: { m: TeamMember; onConfirm: () => void; onAssign: () => void; className?: string }) {
  const org = useTenant()
  const toast = useToast()
  const resend = useResendInvite(org.id)
  const pending = m.status === 'convite_pendente'
  return (
    <span className={cn('flex flex-wrap justify-end gap-1', className)}>
      {pending && (
        <Button variant="ghost" size="sm" icon={<Send className="size-4" aria-hidden />} loading={resend.isPending}
          onClick={() => resend.mutate(m.id, { onSuccess: () => toast.show(`Convite reenviado para ${m.email}`), onError: (e) => toast.show(e.message, 'error') })}>Reenviar</Button>
      )}
      {pending && <Button variant="ghost" size="sm" icon={<XCircle className="size-4" aria-hidden />} onClick={onConfirm}>Cancelar convite</Button>}
      {pending && (
        <Tooltip content="Só no protótipo: abre o link que o analista recebe por email.">
          <Link to={`/convite/${m.id}`} className="inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[0.8125rem] font-bold text-brand hover:bg-paper-soft"><ExternalLink className="size-4" aria-hidden />Abrir convite</Link>
        </Tooltip>
      )}
      {!pending && m.role === 'analista' && <Button variant="ghost" size="sm" icon={<ClipboardPlus className="size-4" aria-hidden />} onClick={onAssign}>Atribuir</Button>}
      {!pending && m.role === 'analista' && <Button variant="ghost" size="sm" icon={<UserMinus className="size-4" aria-hidden />} onClick={onConfirm}>Remover</Button>}
    </span>
  )
}

const KIND_LABEL: Record<Task['kind'], string> = { ativos: 'Ativos', pergunta: 'Pergunta técnica', evidencia: 'Evidência', tarefa: 'Tarefa', integracao: 'Integração' }

const TONE_CLASS = { late: 'bg-risk-high text-risk-high-ink', soon: 'bg-risk-medium text-risk-medium-ink', ok: 'bg-signal-soft text-brand' }

/** Team: who has access and the tasks the designated manager assigned (RF06, US14). */
export function TeamPage() {
  const org = useTenant()
  const { persona } = useSession()
  const users = useUsers(org.id)
  const members = useMembers(org.id)
  const tasks = useTasks(org.id)
  const today = useToday()
  const [invite, setInvite] = useState(false)
  const [confirming, setConfirming] = useState<TeamMember | null>(null)
  const [assigning, setAssigning] = useState<{ to?: string } | null>(null)
  const analysts = (members.data ?? []).filter((m) => m.role === 'analista' && m.status === 'ativo')
  const countFor = (userId: string): TaskCount => {
    const mine = (tasks.data ?? []).filter((t) => t.assigneeId === userId)
    const open = mine.filter((t) => t.status === 'pendente')
    return { open: open.length, late: open.filter((t) => t.dueDate && today.data && t.dueDate < today.data).length, done: mine.filter((t) => t.status === 'concluida').length }
  }
  const [editing, setEditing] = useState<Task | null>(null)
  const isMe = (m: TeamMember) => m.userId === persona.userId
  const tasksOf = (m: TeamMember) => (m.role === 'analista' && m.status === 'ativo' ? countFor(m.userId!) : undefined)
  const actions = (m: TeamMember, className?: string) => <MemberActions m={m} className={className} onConfirm={() => setConfirming(m)} onAssign={() => setAssigning({ to: m.userId! })} />
  const columns: ColumnDef<TeamMember, unknown>[] = [
    // The member column takes the width left over, so the email is never squeezed out.
    { id: 'membro', header: 'Membro', enableSorting: false, cell: ({ row }) => <MemberName m={row.original} isMe={isMe(row.original)} /> },
    { id: 'papel', header: 'Papel', enableSorting: false, meta: { width: 185 }, cell: ({ row }) => <Chip tone={row.original.role === 'responsavel' ? 'dark' : 'outline'}>{ROLE_LABEL[row.original.role]}</Chip> },
    { id: 'estado', header: 'Estado', enableSorting: false, meta: { width: 160 }, cell: ({ row }) => <MemberStatus m={row.original} /> },
    { id: 'tarefas', header: 'Tarefas', enableSorting: false, meta: { width: 120 }, cell: ({ row }) => <TaskCountCell c={tasksOf(row.original)} /> },
    { id: 'acoes', header: () => <span className="sr-only">Ações</span>, enableSorting: false, meta: { width: 220, align: 'right' }, cell: ({ row }) => actions(row.original) },
  ]

  if (users.isError || tasks.isError) return <ErrorState error={users.error ?? tasks.error} onRetry={() => { users.refetch(); tasks.refetch() }} />
  const list = tasks.data ?? []
  const pending = list.filter((t) => t.status === 'pendente')
  const closed = list.filter((t) => t.status !== 'pendente')

  return (
    <>
      <PageHeader eyebrow={org.name} title="Equipa" subtitle="Quem trabalha consigo no aLinha e o que pediu a cada pessoa." actions={<><Button variant="secondary" icon={<UserPlus className="size-4" aria-hidden />} onClick={() => setInvite(true)}>Convidar analista</Button><Button icon={<ClipboardPlus className="size-4" aria-hidden />} disabled={analysts.length === 0} title={analysts.length === 0 ? 'Convide primeiro um analista' : undefined} onClick={() => setAssigning({})}>Atribuir tarefa</Button></>} />

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="section-title">Membros{members.data ? ` (${members.data.length})` : ''}</h2>
        {members.isError ? <ErrorState error={members.error} onRetry={() => members.refetch()} /> : !members.data ? <SkeletonRows rows={3} /> : (
          <DataTable caption="Membros da organização" data={members.data} columns={columns} getRowId={(m) => m.id} cardsBelow="xl"
            renderCard={(m) => (
              <div className="flex flex-col gap-1.5">
                <MemberName m={m} isMe={isMe(m)} />
                <span><Chip tone={m.role === 'responsavel' ? 'dark' : 'outline'}>{ROLE_LABEL[m.role]}</Chip></span>
                <MemberStatus m={m} />
                {tasksOf(m) && <TaskCountCell c={tasksOf(m)} />}
                {actions(m, 'justify-start')}
              </div>
            )} />
        )}
      </section>

      <section aria-labelledby="assigned" className="flex flex-col gap-3">
        <h2 id="assigned" className="section-title">Tarefas atribuídas</h2>
        {!tasks.data || !today.data ? <SkeletonRows rows={3} /> : pending.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line px-5 py-6 text-[0.9375rem] text-ink-soft">Não há tarefas por fazer. Atribua o registo de ativos em <Link className="font-bold text-brand hover:underline" to={`/org/${org.slug}/ativos?atribuir=1`}>Ativos</Link>.</p>
        ) : (
          <ul role="list" aria-label="Tarefas por fazer" className="flex flex-col gap-3">
            {pending.map((t) => <li key={t.id}><TaskRow task={t} today={today.data} assignee={users.data?.find((u) => u.id === t.assigneeId)?.name ?? '—'} onEdit={() => setEditing(t)} /></li>)}
          </ul>
        )}
        {closed.length > 0 && (
          <section aria-labelledby="closed" className="mt-2 flex flex-col gap-3">
            <Eyebrow as="h3"><span id="closed">Concluídas ou canceladas</span></Eyebrow>
            <ul role="list" className="flex flex-col gap-3">
              {closed.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-[14px] bg-paper-soft px-5 py-3 text-[0.8125rem]">
                  <span className="flex-1 text-ink-soft">{t.title}</span>
                  <span className="text-[0.8125rem] text-muted">{users.data?.find((u) => u.id === t.assigneeId)?.name}</span>
                  <Chip tone="neutral">{t.status === 'concluida' ? 'Concluída' : 'Cancelada'}</Chip>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      {invite && <InviteModal onClose={() => setInvite(false)} />}
      {confirming && <ConfirmMemberModal m={confirming} onClose={() => setConfirming(null)} />}
      {assigning && <AssignWorkModal analysts={analysts} assigneeId={assigning.to} onClose={() => setAssigning(null)} />}
      {editing && today.data && <DueModal task={editing} today={today.data} onClose={() => setEditing(null)} />}
    </>
  )
}

function TaskRow({ task, today, assignee, onEdit }: { task: Task; today: string; assignee: string; onEdit: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const remind = useRemindTask(org.id)
  const update = useUpdateTask(org.id)
  const due = task.dueDate ? dueStatus(task.dueDate, today) : null
  return (
    <article aria-labelledby={`tarefa-${task.id}`} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line-soft bg-paper px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{KIND_LABEL[task.kind]}</Chip>
          {due ? <span className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-bold', TONE_CLASS[due.tone])}>{due.label}</span> : <Chip tone="neutral">Sem prazo</Chip>}
        </div>
        <h3 id={`tarefa-${task.id}`} className="mt-2 text-[1rem] font-bold">{task.title}</h3>
        <p className="text-[0.8125rem] text-muted">Para {assignee} · {task.dueDate ? <>até <time dateTime={task.dueDate}>{shortDay(task.dueDate)}</time></> : 'sem prazo'}</p>
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
  const formId = useId()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    update.mutate({ id: task.id, change: { dueDate: due } }, { onSuccess: () => { toast.show('Prazo alterado'); onClose() }, onError: (e) => toast.show(e.message, 'error') })
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} chip={<Chip>Tarefa</Chip>} title="Mudar o prazo" description={`${task.title}. O analista é avisado do novo prazo.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} loading={update.isPending}>Guardar prazo</Button></>}>
      <form id={formId} onSubmit={submit}>
        <Field label="Novo prazo">{(p) => <Select id={p.id} value={due} onChange={setDue} options={DUE_OPTIONS.filter((d) => d >= today).map((d) => ({ value: d, label: longDay(d) }))} />}</Field>
      </form>
    </Modal>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const invite = useInviteAnalyst(org.id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const errors = {
    name: submitted && !name.trim() ? 'Indique o nome do analista.' : undefined,
    email: !submitted ? undefined : !email.trim() ? 'Indique o email do analista.' : !isValidEmail(email.trim()) ? 'Este email não parece válido. Exemplo: nome@empresa.pt' : undefined,
  }
  const formId = useId()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!name.trim() || !isValidEmail(email.trim())) return
    invite.mutate({ name: name.trim(), email: email.trim() }, {
      onSuccess: (m) => { toast.show(`Convite enviado para ${m.email}`); onClose() },
    })
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} chip={<Chip>Equipa</Chip>} title="Convidar analista" description="O analista só vê as tarefas que lhe atribuir. Pode ser um técnico externo."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} loading={invite.isPending}>Enviar convite</Button></>}>
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-[18px]">
        <Field label="Nome" error={errors.name}>{(p) => <TextInput id={p.id} invalid={p.invalid} aria-describedby={p.describedBy} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pedro Almeida" autoFocus />}</Field>
        <Field label="Email" error={errors.email}>{(p) => <TextInput id={p.id} type="email" invalid={p.invalid} aria-describedby={p.describedBy} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.pt" />}</Field>
        {invite.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[0.8125rem] font-semibold text-risk-high-ink">{invite.error.message}</p>}
        <p className="text-[0.8125rem] text-muted">O convite é válido durante 7 dias. Neste protótipo, o email não é enviado.</p>
      </form>
    </Modal>
  )
}

/** Confirmation before cancelling an invitation or removing an analyst. */
function ConfirmMemberModal({ m, onClose }: { m: TeamMember; onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const tasks = useTasks(org.id)
  const cancel = useCancelInvite(org.id)
  const remove = useRemoveMember(org.id)
  const pending = m.status === 'convite_pendente'
  const open = (tasks.data ?? []).filter((t) => t.assigneeId === m.userId && t.status === 'pendente').length
  const action = pending ? cancel : remove
  const confirm = () => action.mutate(m.id, {
    onSuccess: () => { toast.show(pending ? `Convite a ${m.name} cancelado` : `${m.name} foi removido da equipa`); onClose() },
  })
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} chip={<Chip tone="neutral">Equipa</Chip>}
      title={pending ? 'Cancelar o convite?' : `Remover ${m.name}?`}
      description={pending
        ? `O link enviado para ${m.email} deixa de funcionar. Pode voltar a convidar mais tarde.`
        : `${m.name} deixa de ter acesso à organização.${open ? ` ${open === 1 ? 'A tarefa por fazer fica cancelada' : `As ${open} tarefas por fazer ficam canceladas`}.` : ''} O que já registou fica guardado.`}
      footer={<><Button variant="secondary" onClick={onClose}>Voltar</Button><Button variant="danger" onClick={confirm} loading={action.isPending}>{pending ? 'Cancelar convite' : 'Remover da equipa'}</Button></>}>
      {action.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[0.8125rem] font-semibold text-risk-high-ink">{action.error.message}</p>}
    </Modal>
  )
}
