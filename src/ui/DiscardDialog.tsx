import { Button } from './Button'
import { Modal } from './Dialogs'

/** Asks before closing a form with unsaved input. */
export function DiscardDialog({ open, isNew, what, onKeep, onDiscard }: { open: boolean; isNew: boolean; what: string; onKeep: () => void; onDiscard: () => void }) {
  return (
    <Modal open={open} onOpenChange={(o) => !o && onKeep()} width={440} title={isNew ? `Descartar ${what}?` : 'Descartar as alterações?'}
      description="O que preencheu ainda não foi guardado e perde-se ao fechar."
      footer={<>
        <Button variant="secondary" onClick={onKeep}>Continuar a editar</Button>
        <Button variant="danger" onClick={onDiscard}>Descartar</Button>
      </>} />
  )
}
