import { useState } from 'react'
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
  Avatar, Button, Chip, ErrorState, Explainer, Eyebrow, Field, Modal, PageHeader, Select, SkeletonRows, TextInput, Tooltip, cn, useToast,
} from '../../ui'

const initialsOf = (name: string) => {
  const p = name.trim().split(/\s+/)
  return (p[0][0] + (p.length > 1 ? p.at(-1)![0] : '')).toUpperCase()
}

/** One member or pending invitation (US12): name, email, role and status. */
interface TaskCount { open: number; late: number; done: number }

/** Tasks of one analyst (US14): to do, of which late, and done. */
function TaskCountCell({ c }: { c?: TaskCount }) {
  if (!c) return <span className="text-[14px] text-muted max-md:hidden">—</span>
  if (c.open === 0 && c.done === 0) return <span className="text-[14px] text-ink-soft">Sem tarefas</span>
  return (
    <span className="flex flex-col text-[14px] leading-snug">
      <span className="font-bold text-ink">{c.open === 0 ? 'Nada por fazer' : `${c.open} por fazer`}</span>
      <span className="text-[12px] text-muted">
        {c.late > 0 && <span className="font-bold text-risk-high-ink">{c.late} {c.late === 1 ? 'atrasada' : 'atrasadas'} · </span>}
        {c.done} {c.done === 1 ? 'concluída' : 'concluídas'}
      </span>
    </span>
  )
}

function MemberRow({ m, isMe, tasks, onConfirm, onAssign }: { m: TeamMember; isMe: boolean; tasks?: TaskCount; onConfirm: () => void; onAssign: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const resend = useResendInvite(org.id)
  const pending = m.status === 'convite_pendente'
  return (
    <li className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] items-center gap-4 border-b border-line-soft px-5 py-3.5 last:border-b-0 max-md:grid-cols-1 max-md:gap-1.5">
      <span className="flex min-w-0 items-center gap-3">
        <Avatar initials={initialsOf(m.name)} size={36} tone={pending ? 'soft' : 'dark'} />
        <span className={cn('truncate font-bold', pending && 'text-ink-soft')}>{m.name}{isMe && <span className="font-normal text-muted"> (você)</span>}</span>
      </span>
      <span className="truncate text-[14px] text-ink-soft">{m.email}</span>
      <span><Chip tone={m.role === 'responsavel' ? 'dark' : 'outline'}>{ROLE_LABEL[m.role]}</Chip></span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {pending ? <Chip tone="neutral">Convite pendente</Chip> : <Chip tone="signal">Ativo</Chip>}
        {pending && m.invitedAt && <span className="text-[12px] text-muted">enviado a {shortDate(m.invitedAt)}</span>}
      </span>
      <TaskCountCell c={tasks} />
      <span className="flex flex-wrap justify-end gap-1 max-md:justify-start">
        {pending && (
          <Button variant="ghost" size="sm" icon={<Send className="size-4" aria-hidden />} loading={resend.isPending}
            onClick={() => resend.mutate(m.id, { onSuccess: () => toast.show(`Convite reenviado para ${m.email}`), onError: (e) => toast.show(e.message, 'error') })}>Reenviar</Button>
        )}
        {pending && <Button variant="ghost" size="sm" icon={<XCircle className="size-4" aria-hidden />} onClick={onConfirm}>Cancelar convite</Button>}
        {pending && (
          <Tooltip content="Só no protótipo: abre o link que o analista recebe por email.">
            <Link to={`/convite/${m.id}`} className="inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[13px] font-bold text-brand hover:bg-paper-soft"><ExternalLink className="size-4" aria-hidden />Abrir convite</Link>
          </Tooltip>
        )}
        {!pending && m.role === 'analista' && <Button variant="ghost" size="sm" icon={<ClipboardPlus className="size-4" aria-hidden />} onClick={onAssign}>Atribuir</Button>}
        {!pending && m.role === 'analista' && <Button variant="ghost" size="sm" icon={<UserMinus className="size-4" aria-hidden />} onClick={onConfirm}>Remover</Button>}
      </span>
    </li>
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

  if (users.isError || tasks.isError) return <ErrorState error={users.error ?? tasks.error} onRetry={() => { users.refetch(); tasks.refetch() }} />
  const list = tasks.data ?? []
  const pending = list.filter((t) => t.status === 'pendente')
  const closed = list.filter((t) => t.status !== 'pendente')

  return (
    <>
      <PageHeader eyebrow={org.name} title="Equipa" subtitle="Quem trabalha consigo no aLinha e o que pediu a cada pessoa." actions={<><Button variant="secondary" icon={<UserPlus className="size-4" aria-hidden />} onClick={() => setInvite(true)}>Convidar analista</Button><Button icon={<ClipboardPlus className="size-4" aria-hidden />} disabled={analysts.length === 0} title={analysts.length === 0 ? 'Convide primeiro um analista' : undefined} onClick={() => setAssigning({})}>Atribuir tarefa</Button></>} />
      <Explainer id="team"
        steps={[
          { title: 'Convide', text: 'O analista recebe um email, cria a conta e ativa a autenticação em dois passos.' },
          { title: 'Atribua tarefas', text: 'Perguntas técnicas, evidências ou o registo de ativos, com ou sem prazo.' },
          { title: 'Acompanhe', text: 'Aqui vê o estado de cada tarefa, pode enviar um lembrete ou mudar o prazo.' },
        ]} />

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="text-[18px] font-extrabold">Membros{members.data ? ` (${members.data.length})` : ''}</h2>
        {members.isError ? <ErrorState error={members.error} onRetry={() => members.refetch()} /> : !members.data ? <SkeletonRows rows={3} /> : (
          <ul className="overflow-hidden rounded-[16px] border border-line-soft bg-paper" aria-label="Membros da organização">
            <li aria-hidden className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] gap-4 border-b border-line-soft bg-paper-soft px-5 py-3 max-md:hidden">
              {['Nome', 'Email', 'Papel', 'Estado', 'Tarefas', ''].map((h, i) => <span key={i} className="eyebrow text-[11px] text-muted">{h}</span>)}
            </li>
            {members.data.map((m) => <MemberRow key={m.id} m={m} isMe={m.userId === persona.userId} tasks={m.role === 'analista' && m.status === 'ativo' ? countFor(m.userId!) : undefined} onConfirm={() => setConfirming(m)} onAssign={() => setAssigning({ to: m.userId! })} />)}
          </ul>
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
    <article className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line-soft bg-paper px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{KIND_LABEL[task.kind]}</Chip>
          {due ? <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold', TONE_CLASS[due.tone])}>{due.label}</span> : <Chip tone="neutral">Sem prazo</Chip>}
        </div>
        <h3 className="mt-2 text-[16px] font-bold">{task.title}</h3>
        <p className="text-[13px] text-muted">Para {assignee} · {task.dueDate ? `até ${shortDay(task.dueDate)}` : 'sem prazo'}</p>
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
  const submit = () => {
    setSubmitted(true)
    if (!name.trim() || !isValidEmail(email.trim())) return
    invite.mutate({ name: name.trim(), email: email.trim() }, {
      onSuccess: (m) => { toast.show(`Convite enviado para ${m.email}`); onClose() },
    })
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} chip={<Chip>Equipa</Chip>} title="Convidar analista" description="O analista só vê as tarefas que lhe atribuir. Pode ser um técnico externo."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} loading={invite.isPending}>Enviar convite</Button></>}>
      <Field label="Nome" error={errors.name}>{(p) => <TextInput id={p.id} invalid={p.invalid} aria-describedby={p.describedBy} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pedro Almeida" autoFocus />}</Field>
      <Field label="Email" error={errors.email}>{(p) => <TextInput id={p.id} type="email" invalid={p.invalid} aria-describedby={p.describedBy} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.pt" />}</Field>
      {invite.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[13px] font-semibold text-risk-high-ink">{invite.error.message}</p>}
      <p className="text-[13px] text-muted">O convite é válido durante 7 dias. Neste protótipo, o email não é enviado.</p>
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
      {action.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[13px] font-semibold text-risk-high-ink">{action.error.message}</p>}
    </Modal>
  )
}
