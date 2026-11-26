import { useState } from 'react'
import { ALL_SERVICES, type Asset, type CriticalService, type DiscoveredAsset, type Level } from '../../api/contracts'
import { useDecideDiscovery } from '../../api/queries'
import { ASSET_TYPE_LABEL } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { Button, Card, Chip, CriticalityChip, Eyebrow, Segmented, Select, useToast } from '../../ui'

interface Props { items: DiscoveredAsset[]; assets: Asset[]; services: CriticalService[]; providerName: (id: DiscoveredAsset['provider']) => string; canDecide: boolean }

function Suggestion({ d, assets, services, providerName, canDecide }: Omit<Props, 'items'> & { d: DiscoveredAsset }) {
  const org = useTenant()
  const toast = useToast()
  const decide = useDecideDiscovery(org.id)
  const [criticality, setCriticality] = useState<Level>(d.suggestedCriticality)
  const [service, setService] = useState<string>(d.suggestedServiceId ?? 'nenhum')
  const match = assets.find((a) => a.id === d.possibleMatchId)
  // mutateAsync, not mutate: a decided suggestion leaves the pending list and unmounts, which drops mutate's callbacks.
  const run = (decision: Parameters<typeof decide.mutate>[0]['decision'], msg: string) =>
    decide.mutateAsync({ id: d.id, decision }).then(() => toast.show(msg), (e: Error) => toast.show(e.message, 'error'))

  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Eyebrow>{providerName(d.provider)} · {ASSET_TYPE_LABEL[d.type]}</Eyebrow>
            <p className="mt-1 text-[0.9375rem] font-bold">{d.name}</p>
            <p className="text-[0.8125rem] text-ink-soft">{d.details}</p>
          </div>
          <CriticalityChip level={d.suggestedCriticality} />
        </div>
        {match && <p className="rounded-[10px] bg-signal-soft/60 px-3 py-2 text-[0.8125rem]">Parece ser o ativo <strong>{match.name}</strong> que já está no inventário.</p>}
        {canDecide && (
          <div className="flex flex-col gap-3 border-t border-line-soft pt-3">
            {!match && (
              <div className="flex flex-wrap items-center gap-3">
                <Segmented ariaLabel={`Criticidade de ${d.name}`} value={criticality} onChange={setCriticality} options={[{ value: 'alto', label: 'Alta' }, { value: 'medio', label: 'Média' }, { value: 'baixo', label: 'Baixa' }]} />
                <div className="w-[230px]">
                  <Select size="sm" ariaLabel={`Serviço crítico de ${d.name}`} value={service} onChange={setService}
                    options={[...services.map((s) => ({ value: s.id, label: s.name })), { value: ALL_SERVICES, label: 'Todos os serviços' }, { value: 'nenhum', label: 'Nenhum em particular' }]} />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {match
                ? <Button size="sm" loading={decide.isPending} onClick={() => run({ decision: 'associar', assetId: match.id }, `Associado a "${match.name}"`)}>É o mesmo: associar</Button>
                : <Button size="sm" loading={decide.isPending} onClick={() => run({ decision: 'aceitar', criticality, criticalServiceId: service === 'nenhum' ? null : service }, `"${d.name}" acrescentado ao inventário`)}>Acrescentar ao inventário</Button>}
              {match && <Button size="sm" variant="secondary" onClick={() => run({ decision: 'aceitar', criticality, criticalServiceId: d.suggestedServiceId }, `"${d.name}" acrescentado ao inventário`)}>É outro: acrescentar</Button>}
              <Button size="sm" variant="ghost" onClick={() => run({ decision: 'ignorar' }, 'Sugestão ignorada')}>Ignorar</Button>
            </div>
          </div>
        )}
      </Card>
    </li>
  )
}

/** Queue of assets found by integrations. Nothing enters the inventory without a human decision. */
export function DiscoveryList(props: Props) {
  const pending = props.items.filter((d) => d.status === 'proposto')
  const done = props.items.filter((d) => d.status !== 'proposto')
  return (
    <div className="flex flex-col gap-3">
      {pending.length === 0
        ? <p className="rounded-[14px] bg-paper-soft px-4 py-5 text-center text-[0.8125rem] text-ink-soft">Não há sugestões por rever.</p>
        : <ul className="flex flex-col gap-3">{pending.map((d) => <Suggestion key={d.id} d={d} {...props} />)}</ul>}
      {done.length > 0 && (
        <details className="text-[0.8125rem]">
          <summary className="cursor-pointer font-bold text-ink-soft">Já decididas ({done.length})</summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {done.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-[8px] bg-paper-soft px-3 py-2">
                <span>{d.name}</span>
                <Chip tone="neutral">{{ aceite: 'Acrescentado', associado: 'Associado', ignorado: 'Ignorado', proposto: '' }[d.status]}</Chip>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
