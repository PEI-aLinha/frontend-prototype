import { useState } from 'react'
import { Archive, CheckCircle2, RotateCcw } from 'lucide-react'
import type { Risk } from '../../../api/contracts'
import { useSetRiskStatus } from '../../../api/queries'
import { useTenant } from '../../../core/tenant'
import { Button, Field, TextInput, useToast } from '../../../ui'

/** Closing the risk lifecycle: treated (actions are done), archived (no longer exists) or reopened. */
export function RiskStatusActions({ risk, onDone }: { risk: Risk; onDone: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const set = useSetRiskStatus(org.id)
  const [archiving, setArchiving] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()

  const run = (change: Parameters<typeof set.mutate>[0]['change'], msg: string) =>
    set.mutate({ id: risk.id, change }, { onSuccess: () => { toast.show(msg); onDone() }, onError: (e) => toast.show(e.message, 'error') })

  if (risk.status === 'tratado' || risk.status === 'arquivado') {
    return (
      <div className="flex flex-col gap-2 rounded-[14px] bg-paper-soft p-4">
        <p className="text-[14px] font-bold">{risk.status === 'tratado' ? 'Este risco está tratado.' : `Arquivado: ${risk.archivedReason ?? ''}`}</p>
        <p className="text-[13px] text-ink-soft">Se a situação mudou, reabra-o para voltar a avaliar.</p>
        <Button size="sm" variant="secondary" className="self-start" icon={<RotateCcw className="size-4" aria-hidden />} loading={set.isPending} onClick={() => run({ status: 'reaberto' }, 'Risco reaberto')}>Reabrir risco</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-paper-soft p-4">
      <p className="text-[14px] font-bold">Fechar o risco</p>
      <p className="text-[13px] text-ink-soft">Marque como tratado quando as ações ligadas estiverem feitas. Arquive se o risco deixou de existir (ex.: o equipamento foi abatido).</p>
      {archiving ? (
        <form noValidate className="flex flex-col gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (reason.trim().length < 5) { setError('Explique em poucas palavras porque arquiva.'); return }
          run({ status: 'arquivado', reason }, 'Risco arquivado')
        }}>
          <Field label="Motivo do arquivo" error={error}>{(p) => <TextInput id={p.id} invalid={p.invalid} aria-describedby={p.describedBy} value={reason} onChange={(e) => { setReason(e.target.value); setError(undefined) }} placeholder="Ex.: servidor desativado em novembro" autoFocus />}</Field>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setArchiving(false)}>Cancelar</Button>
            <Button size="sm" type="submit" loading={set.isPending}>Arquivar</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={!risk.treatment} icon={<CheckCircle2 className="size-4" aria-hidden />} loading={set.isPending} onClick={() => run({ status: 'tratado' }, 'Risco marcado como tratado')}>Marcar como tratado</Button>
          <Button size="sm" variant="ghost" icon={<Archive className="size-4" aria-hidden />} onClick={() => setArchiving(true)}>Arquivar</Button>
        </div>
      )}
    </div>
  )
}
