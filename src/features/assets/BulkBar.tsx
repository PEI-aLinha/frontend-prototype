import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import type { Level } from '../../api/contracts'
import { useBulkDeleteAssets, useBulkUpdateAssets } from '../../api/queries'
import { useTenant } from '../../core/tenant'
import { Button, Select, useToast } from '../../ui'
import type { Inventory } from './useInventory'

/** Bulk action bar for the selected assets. */
export function BulkBar({ ids, inventory, onDone }: { ids: string[]; inventory: Inventory; onDone: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const update = useBulkUpdateAssets(org.id)
  const remove = useBulkDeleteAssets(org.id)
  const [confirm, setConfirm] = useState(false)
  const n = ids.length
  const done = (msg: string) => { toast.show(msg); onDone() }
  const fail = (e: Error) => toast.show(e.message, 'error')

  return (
    <div role="region" aria-label="Ações em massa" className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-[14px] bg-brand-deep px-4 py-3 text-white shadow-[0_12px_32px_rgb(var(--shadow-rgb)/0.25)] animate-pop-in max-md:top-16">
      <span className="text-[0.9375rem] font-bold">{n} {n === 1 ? 'ativo selecionado' : 'ativos selecionados'}</span>
      <div className="w-[170px]">
        <Select size="sm" ariaLabel="Mudar criticidade" value="" placeholder="Mudar criticidade" onChange={(v) => update.mutate({ ids, change: { criticality: v as Level } }, { onSuccess: () => done(`Criticidade alterada em ${n} ativos`), onError: fail })}
          options={[{ value: 'alto', label: 'Alta' }, { value: 'medio', label: 'Média' }, { value: 'baixo', label: 'Baixa' }]} />
      </div>
      <div className="w-[180px]">
        <Select size="sm" ariaLabel="Mudar responsável" value="" placeholder="Mudar responsável" onChange={(v) => update.mutate({ ids, change: { ownerId: v } }, { onSuccess: () => done(`Responsável alterado em ${n} ativos`), onError: fail })}
          options={inventory.users.filter((u) => u.role !== 'consultor').map((u) => ({ value: u.id, label: u.name }))} />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {confirm
          ? <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(ids, { onSuccess: () => done(`${n} ativos removidos`), onError: fail })}>Confirmar remoção</Button>
          : <Button size="sm" variant="inverse" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirm(true)}>Remover</Button>}
        <button type="button" onClick={onDone} aria-label="Limpar seleção" className="rounded-full p-1.5 text-brand-soft hover:bg-brand"><X className="size-4" aria-hidden /></button>
      </div>
    </div>
  )
}
