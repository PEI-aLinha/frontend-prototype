import { Link2 } from 'lucide-react'
import { ALL_SERVICES, type Asset } from '../../api/contracts'
import { ASSET_TYPE_LABEL } from '../../config/labels'
import { CriticalityChip, Eyebrow, RiskLevelBadge, Term } from '../../ui'
import type { Inventory } from './useInventory'

/** "By service" view: which assets keep each critical service running. */
export function ServiceMap({ assets, inventory, onOpen }: { assets: Asset[]; inventory: Inventory; onOpen: (a: Asset) => void }) {
  const groups = [
    ...inventory.services.map((s) => ({ id: s.id, name: s.name, criticality: s.criticality, items: assets.filter((a) => a.criticalServiceId === s.id) })),
    { id: ALL_SERVICES, name: 'Suportam todos os serviços', criticality: null, items: assets.filter((a) => a.criticalServiceId === ALL_SERVICES) },
    { id: 'none', name: 'Sem serviço crítico', criticality: null, items: assets.filter((a) => !a.criticalServiceId) },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.8125rem] text-ink-soft">Cada coluna é um <Term k="servicoCritico">serviço crítico</Term>. Os ativos ligados por <Link2 className="inline size-3.5" aria-label="dependência" /> dependem de outro ativo: se esse falhar, também param.</p>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => (
          <section key={g.id} aria-label={g.name} className="flex flex-col gap-2.5 rounded-[16px] border border-line-soft bg-paper-soft p-4">
            <header className="flex items-start justify-between gap-2">
              <div>
                <Eyebrow>{g.criticality ? 'Serviço crítico' : 'Outros'}</Eyebrow>
                <h3 className="mt-0.5 text-[0.9375rem] font-extrabold">{g.name}</h3>
              </div>
              {g.criticality && <CriticalityChip level={g.criticality} />}
            </header>
            <p className="text-[0.75rem] text-muted">{g.items.length} {g.items.length === 1 ? 'ativo' : 'ativos'}</p>
            <ul className="flex flex-col gap-2">
              {g.items.map((a) => {
                const deps = inventory.assets.filter((d) => a.dependsOn?.includes(d.id))
                const top = inventory.topRisk(a.id)
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => onOpen(a)} className="w-full rounded-[12px] border border-line-soft bg-paper px-3.5 py-2.5 text-left transition-colors hover:border-line">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[0.875rem] font-bold">{a.name}</span>
                        <CriticalityChip level={a.criticality} />
                      </span>
                      <span className="mt-0.5 block text-[0.75rem] text-ink-soft">{ASSET_TYPE_LABEL[a.type]}</span>
                      {deps.length > 0 && <span className="mt-1.5 block text-[0.75rem] text-muted"><Link2 className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />depende de {deps.map((d) => d.name).join(', ')}</span>}
                      {top && <span className="mt-1.5 block"><RiskLevelBadge level={top} prefix="Risco " /></span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
