import { ArrowDownRight, ArrowUpRight, Zap } from 'lucide-react'
import type { Asset } from '../../api/contracts'
import { CriticalityChip, Note } from '../../ui'
import { affectedBy } from './dependencies'
import type { Inventory } from './useInventory'

function List({ items, inv, empty }: { items: Asset[]; inv: Inventory; empty: string }) {
  if (!items.length) return <p className="text-[0.8125rem] text-muted">{empty}</p>
  return (
    <ul className="flex flex-col gap-2">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-3 rounded-[10px] border border-line-soft px-3 py-2">
          <span className="min-w-0 flex-1"><span className="block truncate text-[0.9375rem] font-semibold">{a.name}</span><span className="block text-[0.75rem] text-muted">{inv.serviceName(a.criticalServiceId)}</span></span>
          <CriticalityChip level={a.criticality} />
        </li>
      ))}
    </ul>
  )
}

/** "Dependencies" tab: what this asset needs and what stops if it fails. */
export function AssetDependencies({ asset, inventory }: { asset: Asset; inventory: Inventory }) {
  const deps = inventory.assets.filter((a) => asset.dependsOn?.includes(a.id))
  const direct = inventory.assets.filter((a) => a.dependsOn?.includes(asset.id))
  const chain = affectedBy(asset.id, inventory.assets)
  const services = [...new Set(chain.concat(asset).map((a) => inventory.serviceName(a.criticalServiceId)).filter((s) => s !== '—'))]
  return (
    <div className="flex flex-col gap-5">
      {chain.length > 0 && (
        <div className="flex gap-3 rounded-[14px] bg-risk-medium/60 px-4 py-3 text-risk-medium-ink">
          <Zap className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-[0.8125rem] font-semibold">Se este ativo falhar, {chain.length === 1 ? 'outro ativo é afetado' : `${chain.length} outros ativos são afetados`} e {services.length === 1 ? 'o serviço' : 'os serviços'} {services.join(' e ')} {services.length === 1 ? 'pode parar' : 'podem parar'}.</p>
        </div>
      )}
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-[0.9375rem] font-bold"><ArrowDownRight className="size-4 text-brand" aria-hidden />Depende de</h3>
        <List items={deps} inv={inventory} empty="Não indicou dependências. Edite o ativo para as acrescentar." />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-[0.9375rem] font-bold"><ArrowUpRight className="size-4 text-brand" aria-hidden />Precisam dele</h3>
        <List items={direct} inv={inventory} empty="Nenhum outro ativo depende deste." />
      </section>
      <Note>As dependências ajudam a consultora a avaliar o impacto real de um risco: uma falha na rede afeta tudo o que depende dela.</Note>
    </div>
  )
}
