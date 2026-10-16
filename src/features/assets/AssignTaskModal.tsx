import { useState } from 'react'
import { useAssignTask } from '../../api/queries'
import type { User } from '../../api/contracts'
import { longDay } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { Button, Chip, Field, Modal, Select, TextInput, useToast } from '../../ui'

const DEFAULT_SCOPE = 'Servidores, rede e sistemas de produção'
const DUE_OPTIONS = ['2026-10-15', '2026-10-20', '2026-10-23']

/** 07b — Atribuir registo de ativos a um analista. */
export function AssignTaskModal({ open, onClose, analysts }: { open: boolean; onClose: () => void; analysts: User[] }) {
  const org = useTenant()
  const toast = useToast()
  const assign = useAssignTask(org.id)
  const [assignee, setAssignee] = useState(analysts[0]?.id ?? '')
  const [scope, setScope] = useState(DEFAULT_SCOPE)
  const [due, setDue] = useState(DUE_OPTIONS[0])
  const [error, setError] = useState<string>()

  const submit = () => {
    if (scope.trim().length < 3) { setError('Diga ao analista o que deve registar.'); return }
    assign.mutate({ assigneeId: assignee, title: scope.trim(), dueDate: due }, {
      onSuccess: () => {
        const who = analysts.find((a) => a.id === assignee)?.name
        toast.show(`Tarefa enviada ao ${who}`)
        onClose()
      },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} chip={<Chip>Tarefa para analista</Chip>} title="Atribuir registo de ativos"
      description="O analista recebe a tarefa por email e na sua lista. Só vê os ativos que lhe atribuir."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} loading={assign.isPending}>Atribuir</Button></>}>
      <Field label="Analista">{(p) => <Select id={p.id} value={assignee} onChange={setAssignee} options={analysts.map((a) => ({ value: a.id, label: a.name, hint: 'Técnico de informática externo · terças e quintas' }))} />}</Field>
      <Field label="O que registar" error={error}>{(p) => <TextInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} value={scope} onChange={(e) => { setScope(e.target.value); setError(undefined) }} />}</Field>
      <Field label="Prazo">{(p) => <Select id={p.id} value={due} onChange={setDue} options={DUE_OPTIONS.map((d) => ({ value: d, label: longDay(d) }))} />}</Field>
    </Modal>
  )
}
