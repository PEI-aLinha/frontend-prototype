import { useRef, useState } from 'react'
import { useReopenRoadmap } from '../../api/queries'
import { Button, Chip, Field, Modal, TextArea, useToast } from '../../ui'

/** Consultant takes a validation back, with a reason the client reads in the notification and the history. */
export function ReopenRoadmapModal({ org, open, onClose, manager }: { org: string; open: boolean; onClose: () => void; manager?: string }) {
  const reopen = useReopenRoadmap(org)
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const input = useRef<HTMLTextAreaElement>(null)
  const close = () => { setReason(''); setError(undefined); onClose() }
  const submit = () => {
    if (!reason.trim()) { setError('Diga ao cliente porque reabre o roadmap.'); input.current?.focus(); return }
    reopen.mutate(reason, {
      onSuccess: () => { close(); toast.show(`Roadmap reaberto · notificação enviada a ${manager ?? 'o cliente'}`) },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }
  return (
    <Modal open={open} onOpenChange={(o) => !o && close()} chip={<Chip>Decisão da consultora</Chip>} title="Reabrir o roadmap?"
      description={`${manager ? `O ${manager}` : 'O cliente'} deixa de ver o roadmap e os riscos até os validar de novo. A validação anterior fica no histórico.`}
      footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={reopen.isPending} onClick={submit}>Reabrir roadmap</Button></>}>
      <Field label="Porque reabre" hint="O cliente lê esta frase na notificação. Ex.: falta ligar o risco do servidor a uma ação." error={error}>
        {(p) => <TextArea id={p.id} aria-describedby={p.describedBy} ref={input} invalid={!!error} aria-invalid={!!error} value={reason} onChange={(e) => { setReason(e.target.value); setError(undefined) }} maxLength={300} />}
      </Field>
    </Modal>
  )
}
