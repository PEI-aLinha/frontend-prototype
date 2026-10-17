import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { CriticalService, Level } from '../../api/contracts'
import { useDeleteService, useSaveService } from '../../api/queries'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import { Button, CriticalityChip, Drawer, Field, Note, Person, Segmented, Select, TextInput, useToast } from '../../ui'
import type { Inventory } from './useInventory'

/** Manage critical services (RF35). */
export function ServicesDrawer({ open, onClose, inventory }: { open: boolean; onClose: () => void; inventory: Inventory }) {
  const org = useTenant()
  const can = useCan()
  const toast = useToast()
  const save = useSaveService(org.id)
  const remove = useDeleteService(org.id)
  const [editing, setEditing] = useState<CriticalService | 'new' | null>(null)
  const [name, setName] = useState('')
  const [crit, setCrit] = useState<Level>('alto')
  const [ownerId, setOwnerId] = useState('')
  const [errors, setErrors] = useState<{ name?: string; ownerId?: string }>({})
  const editable = can('edit', 'critical_service')
  const owners = inventory.users.filter((u) => u.role !== 'consultor')

  const start = (s: CriticalService | 'new') => {
    setEditing(s)
    setName(s === 'new' ? '' : s.name)
    setCrit(s === 'new' ? 'alto' : s.criticality)
    setOwnerId(s === 'new' ? '' : s.ownerId ?? '')
    setErrors({})
  }

  const submit = () => {
    const next = {
      name: name.trim().length < 3 ? 'Indique o nome do serviço.' : undefined,
      ownerId: ownerId ? undefined : 'Indique quem responde por este serviço.',
    }
    setErrors(next)
    if (next.name || next.ownerId) return
    save.mutate({ input: { name: name.trim(), criticality: crit, ownerId }, id: editing === 'new' || !editing ? undefined : editing.id }, {
      onSuccess: () => { toast.show('Serviço crítico guardado'); setEditing(null) },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  const count = (id: string) => inventory.assets.filter((a) => a.criticalServiceId === id).length
  const ownerOf = (s: CriticalService) => inventory.user(s.ownerId)

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} eyebrow="Inventário de ativos" title="Serviços críticos"
      description="Os serviços sem os quais a empresa não funciona. Cada ativo indica que serviço suporta.">
      <div className="flex flex-col gap-3">
        {inventory.services.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-[14px] border border-line-soft px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{s.name}</p>
              <p className="text-[13px] text-ink-soft">{count(s.id)} {count(s.id) === 1 ? 'ativo' : 'ativos'}</p>
              <div className="mt-1.5">{ownerOf(s) ? <Person initials={ownerOf(s)!.initials} name={ownerOf(s)!.name} /> : <span className="text-[13px] font-semibold text-danger">Sem responsável</span>}</div>
            </div>
            <CriticalityChip level={s.criticality} />
            {editable && (
              <>
                <Button variant="ghost" size="sm" aria-label={`Editar ${s.name}`} onClick={() => start(s)}><Pencil className="size-4" aria-hidden /></Button>
                <Button variant="ghost" size="sm" aria-label={`Remover ${s.name}`} onClick={() => remove.mutate(s.id, { onSuccess: () => toast.show('Serviço removido'), onError: (e) => toast.show(e.message, 'error') })}><Trash2 className="size-4" aria-hidden /></Button>
              </>
            )}
          </div>
        ))}
        {editable && !editing && <Button variant="secondary" className="self-start" onClick={() => start('new')}>+ Novo serviço crítico</Button>}
        {editing && (
          <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="mt-2 flex flex-col gap-4 rounded-[14px] bg-paper-soft p-4">
            <Field label="Nome do serviço" error={errors.name}>{(p) => <TextInput id={p.id} invalid={p.invalid} aria-describedby={p.describedBy} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}</Field>
            <Field label="Responsável" error={errors.ownerId} hint="Quem responde pelo serviço na empresa.">
              {(p) => <Select id={p.id} describedBy={p.describedBy} invalid={p.invalid} value={ownerId} onChange={setOwnerId} options={owners.map((u) => ({ value: u.id, label: u.name }))} />}
            </Field>
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-ink-soft">Criticidade</p>
              <Segmented ariaLabel="Criticidade do serviço" value={crit} onChange={setCrit} options={[{ value: 'alto', label: 'Alta' }, { value: 'medio', label: 'Média' }, { value: 'baixo', label: 'Baixa' }]} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" loading={save.isPending}>Guardar serviço</Button>
            </div>
          </form>
        )}
        {!editable && <Note>Só o Responsável designado altera os serviços críticos.</Note>}
      </div>
    </Drawer>
  )
}
