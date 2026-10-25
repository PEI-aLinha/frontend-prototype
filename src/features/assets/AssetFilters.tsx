import { Search, X } from 'lucide-react'
import type { Level } from '../../api/contracts'
import { ASSET_TYPE_LABEL, CRITICALITY_LABEL } from '../../config/labels'
import { Button, Select, controlClass, cn } from '../../ui'
import { ALL, isFiltering, type AssetFilterState } from './filterState'
import type { Inventory } from './useInventory'

interface Props {
  value: AssetFilterState
  onChange: (next: Partial<AssetFilterState>) => void
  onClear: () => void
  inventory: Inventory
  shown: number
  total: number
}

export function AssetFilters({ value, onChange, onClear, inventory, shown, total }: Props) {
  const types = [...new Set(inventory.assets.map((a) => a.type))]
  const owners = inventory.users.filter((u) => inventory.assets.some((a) => a.ownerId === u.id))
  return (
    <div className="flex flex-wrap items-center gap-2.5" role="search" aria-label="Filtrar ativos">
      <label className="relative min-w-[220px] flex-1 max-md:basis-full">
        <span className="sr-only">Pesquisar ativos</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input type="search" value={value.q} onChange={(e) => onChange({ q: e.target.value })} placeholder="Pesquisar por nome, tipo ou localização" className={cn(controlClass(false, 'sm'), '!pl-9 font-normal')} />
      </label>
      <div className="w-[150px] max-md:flex-1"><Select size="sm" ariaLabel="Tipo" value={value.type} onChange={(v) => onChange({ type: v })} options={[{ value: ALL, label: 'Todos os tipos' }, ...types.map((t) => ({ value: t, label: ASSET_TYPE_LABEL[t] }))]} /></div>
      <div className="w-[175px] max-md:flex-1"><Select size="sm" ariaLabel="Serviço crítico" value={value.service} onChange={(v) => onChange({ service: v })} options={[{ value: ALL, label: 'Todos os serviços' }, ...inventory.services.map((s) => ({ value: s.id, label: s.name })), { value: 'todos', label: 'Suporta todos' }]} /></div>
      <div className="w-[160px] max-md:flex-1"><Select size="sm" ariaLabel="Criticidade" value={value.crit} onChange={(v) => onChange({ crit: v })} options={[{ value: ALL, label: 'Qualquer criticidade' }, ...(['alto', 'medio', 'baixo'] as Level[]).map((l) => ({ value: l, label: CRITICALITY_LABEL[l] }))]} /></div>
      <div className="w-[150px] max-md:flex-1"><Select size="sm" ariaLabel="Responsável" value={value.owner} onChange={(v) => onChange({ owner: v })} options={[{ value: ALL, label: 'Todos os responsáveis' }, ...owners.map((u) => ({ value: u.id, label: u.name }))]} /></div>
      {isFiltering(value) && (
        <div className="flex items-center gap-2 text-[0.8125rem] text-ink-soft" aria-live="polite">
          {shown} de {total}
          <Button variant="ghost" size="sm" onClick={onClear} icon={<X className="size-3.5" aria-hidden />}>Limpar</Button>
        </div>
      )}
    </div>
  )
}
