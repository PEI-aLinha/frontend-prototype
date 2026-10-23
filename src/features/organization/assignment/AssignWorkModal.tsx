import { useState } from 'react'
import type { TeamMember, WorkAssignmentInput } from '../../../api/contracts'
import { useAssignWork, useDelegateQuestion, useToday } from '../../../api/queries'
import { useTenant } from '../../../core/tenant'
import { Button, Chip, DateInput, Field, Modal, OptionGroup, Select, TextArea, useToast, type OptionItem } from '../../../ui'
import { ASSET_TASK, EVIDENCE, TECHNICAL_QUESTIONS } from './catalog'

type Kind = 'pergunta' | 'evidencia' | 'tarefa'
type Errors = Partial<Record<'assignee' | 'kind' | 'item' | 'other' | 'due', string>>

const KINDS: OptionItem<Kind>[] = [
  { value: 'pergunta', label: 'Pergunta técnica', hint: 'Uma pergunta da avaliação que o analista sabe responder.' },
  { value: 'evidencia', label: 'Evidência', hint: 'Um documento ou registo que prova o cumprimento.' },
  { value: 'tarefa', label: 'Tarefa', hint: 'Por exemplo, registar os ativos técnicos.' },
]
const OTHER = 'outra'

/** US14 — assign a technical question, an evidence or a task to an analyst, with an optional deadline (RF06). */
export function AssignWorkModal({ analysts, assigneeId, onClose }: { analysts: TeamMember[]; assigneeId?: string; onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const today = useToday()
  const assign = useAssignWork(org.id)
  // A technical question is delegated through the Assessment plugin, so it stays linked to the questionnaire.
  const delegate = useDelegateQuestion(org.id)
  const [assignee, setAssignee] = useState(assigneeId ?? (analysts.length === 1 ? analysts[0].userId! : ''))
  const [kind, setKind] = useState<Kind | null>(null)
  const [item, setItem] = useState('')
  const [other, setOther] = useState('')
  const [due, setDue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const items = kind === 'pergunta' ? TECHNICAL_QUESTIONS : kind === 'evidencia' ? EVIDENCE : [ASSET_TASK]
  const itemOptions = [...items.map((i) => ({ value: i.id, label: i.title })), ...(kind === 'tarefa' ? [{ value: OTHER, label: 'Outra tarefa' }] : [])]

  const validate = (): Errors => {
    const e: Errors = {}
    if (!assignee) e.assignee = 'Escolha o analista.'
    if (!kind) e.kind = 'Escolha o que quer atribuir.'
    else if (!item) e.item = kind === 'pergunta' ? 'Escolha a pergunta.' : kind === 'evidencia' ? 'Escolha a evidência.' : 'Escolha a tarefa.'
    else if (item === OTHER && other.trim().length < 3) e.other = 'Descreva a tarefa em poucas palavras.'
    if (due && today.data && due < today.data) e.due = 'O prazo não pode ser no passado.'
    return e
  }
  const errors = submitted ? validate() : {}

  const submit = () => {
    setSubmitted(true)
    if (Object.keys(validate()).length > 0) return
    const done = {
      onSuccess: () => {
        toast.show(`Tarefa enviada a ${analysts.find((a) => a.userId === assignee)?.name}`)
        onClose()
      },
    }
    if (kind === 'pergunta') {
      delegate.mutate({ questionId: item, input: { assigneeId: assignee, dueDate: due || null } }, done)
      return
    }
    const chosen = items.find((i) => i.id === item)
    const input: WorkAssignmentInput = item === OTHER
      ? { assigneeId: assignee, kind: 'tarefa', title: other.trim(), context: 'Pedido do Responsável designado', dueDate: due || null }
      : { assigneeId: assignee, kind: chosen === ASSET_TASK ? 'ativos' : kind!, title: chosen!.title, context: chosen!.context, dueDate: due || null }
    assign.mutate(input, done)
  }
  const failure = assign.error ?? delegate.error

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} width={640} chip={<Chip>Tarefa para analista</Chip>} title="Atribuir tarefa"
      description="O analista recebe um email e vê a tarefa na sua lista."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} loading={assign.isPending || delegate.isPending}>Atribuir</Button></>}>
      <Field label="Analista" error={errors.assignee}>
        {(p) => <Select id={p.id} describedBy={p.describedBy} invalid={p.invalid} value={assignee} placeholder="Escolher o analista…" onChange={setAssignee} options={analysts.map((a) => ({ value: a.userId!, label: a.name, hint: a.email }))} />}
      </Field>

      <OptionGroup name="kind" legend="O que quer atribuir?" columns={3} value={kind} onChange={(k) => { setKind(k); setItem(''); setOther('') }} options={KINDS} error={errors.kind} />

      {kind && (
        <Field label={kind === 'pergunta' ? 'Pergunta' : kind === 'evidencia' ? 'Evidência' : 'Tarefa'} error={errors.item}>
          {(p) => <Select id={p.id} describedBy={p.describedBy} invalid={p.invalid} value={item} placeholder="Escolher…" onChange={setItem} options={itemOptions} />}
        </Field>
      )}
      {item === OTHER && (
        <Field label="Descreva a tarefa" error={errors.other}>
          {(p) => <TextArea id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} rows={2} value={other} onChange={(e) => setOther(e.target.value)} placeholder="Ex.: Verificar se o antivírus está ativo em todos os portáteis." />}
        </Field>
      )}

      <Field label="Prazo" optional hint="Sem prazo, a tarefa fica sem data limite." error={errors.due} className="max-w-[260px]">
        {(p) => <DateInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} min={today.data} value={due} onChange={(e) => setDue(e.target.value)} />}
      </Field>

      {failure && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[0.8125rem] font-semibold text-risk-high-ink">{failure.message}</p>}
    </Modal>
  )
}
