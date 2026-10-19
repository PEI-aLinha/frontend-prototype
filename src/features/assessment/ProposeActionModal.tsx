import { useState } from 'react'
import { useProposeAction } from '../../api/queries'
import { useTenant } from '../../core/tenant'
import { Button, Chip, DateInput, Field, Modal, TextArea, TextInput, useToast } from '../../ui'

const MIN_LENGTH = 5

/** RF14: the consultant adjusts the plan by adding an action, which lands last until reprioritised. */
export function ProposeActionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const propose = useProposeAction(org.id)
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState('')
  const [obligation, setObligation] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string>()

  const reset = () => { setDescription(''); setEvidence(''); setObligation(''); setDue(''); setError(undefined) }

  const submit = () => {
    if (description.trim().length < MIN_LENGTH) { setError('Descreva a ação em pelo menos 5 caracteres.'); return }
    propose.mutate({
      description: description.trim(),
      requiredEvidence: evidence.trim() || 'A definir pela consultora',
      legalObligation: obligation.trim() || 'A definir pela consultora',
      dueDate: due || null,
      findingTitle: 'Proposta da consultora ao validar o plano',
    }, {
      onSuccess: () => { reset(); onClose(); toast.show('Ação proposta para o roadmap') },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} chip={<Chip>Ajuste do plano</Chip>} title="Propor uma ação"
      description="A ação entra no fim da lista, com a prioridade mais baixa, e o cliente passa a vê-la."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} loading={propose.isPending}>Propor ação</Button></>}>
      <Field label="O que fazer" error={error}>{(p) => <TextArea id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} value={description} onChange={(e) => { setDescription(e.target.value); setError(undefined) }} placeholder="Ex.: Rever com a direção a política de acessos ao ERP" />}</Field>
      <Field label="Prova necessária" optional hint="O documento que mostra que ficou feito.">{(p) => <TextInput id={p.id} aria-describedby={p.describedBy} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Ex.: Política aprovada pela administração" />}</Field>
      <Field label="Obrigação legal" optional hint="Deixa em branco se ainda não a identificou.">{(p) => <TextInput id={p.id} aria-describedby={p.describedBy} value={obligation} onChange={(e) => setObligation(e.target.value)} placeholder="Ex.: NIS2, art. 21.º" />}</Field>
      <Field label="Prazo" optional>{(p) => <DateInput id={p.id} aria-describedby={p.describedBy} value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
    </Modal>
  )
}