import { useState } from 'react'
import { Link } from 'react-router'
import { MessageSquare, ShieldPlus } from 'lucide-react'
import type { Asset } from '../../api/contracts'
import { useAddComment, useAudit, useComments, useDeleteAsset, useSaveAsset } from '../../api/queries'
import { ASSET_TYPE_LABEL, dateTime, RISK_STATUS_LABEL, TREATMENT_LABEL } from '../../config/labels'
import { useSession } from '../../core/session'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import {
  Avatar, Button, CriticalityChip, Drawer, Field, HistoryList, Note, RiskLevelBadge, Tabs, TextArea, useToast, type TabDef,
} from '../../ui'
import { AssetFields, FormShell } from './AssetForm'
import { emptyValues, toInput, valuesFromAsset } from './assetFormModel'
import { useAssetForm } from './useAssetForm'
import { computeRiskLevel } from './risk/computeRiskLevel'
import type { Inventory } from './useInventory'
import { toHistory } from './history'
import { AssetDependencies } from './AssetDependencies'

interface Props {
  inventory: Inventory
  asset: Asset | null
  mode: 'new' | 'view'
  open: boolean
  onClose: () => void
}

export function AssetDrawer({ inventory, asset, mode, open, onClose }: Props) {
  const org = useTenant()
  const can = useCan()
  const toast = useToast()
  const save = useSaveAsset(org.id)
  const remove = useDeleteAsset(org.id)
  const editable = mode === 'new' ? can('create', 'asset') : can('edit', 'asset')
  const form = useAssetForm(asset ? valuesFromAsset(asset) : emptyValues({ ownerId: 'u-rui' }))
  const owners = inventory.users.filter((u) => u.role !== 'consultor')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = () => {
    if (!form.check()) return
    save.mutate({ input: toInput(form.values, asset?.taskId), id: asset?.id }, {
      onSuccess: (a) => { toast.show(mode === 'new' ? `Ativo "${a.name}" registado` : 'Alterações guardadas'); onClose() },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  const doDelete = () => {
    if (!asset) return
    remove.mutate(asset.id, {
      onSuccess: () => { toast.show(`Ativo "${asset.name}" removido`); onClose() },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  const formBody = (
    <FormShell id="asset-form" onSubmit={submit}>
      <AssetFields id="asset" values={form.values} onChange={form.onChange} services={inventory.services} owners={owners} errors={form.errors} others={inventory.assets.filter((a) => a.id !== asset?.id).map((a) => ({ id: a.id, name: a.name }))} />
    </FormShell>
  )

  if (mode === 'new') {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()} eyebrow="Inventário de ativos" title="Adicionar ativo" description="Registe um sistema, equipamento ou serviço de que a empresa depende."
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="asset-form" loading={save.isPending}>Guardar ativo</Button></>}>
        {formBody}
      </Drawer>
    )
  }
  if (!asset) return null

  const tabs: TabDef[] = [
    { value: 'detalhe', label: 'Detalhe', content: editable ? formBody : <ReadOnlyDetail asset={asset} inventory={inventory} /> },
  ]
  tabs.push({ value: 'dependencias', label: 'Dependências', count: asset.dependsOn?.length ?? 0, content: <AssetDependencies asset={asset} inventory={inventory} /> })
  if (can('view', 'risk')) tabs.push({ value: 'riscos', label: 'Riscos', count: inventory.risksByAsset.get(asset.id)?.length ?? 0, content: <AssetRisks asset={asset} inventory={inventory} /> })
  if (can('view', 'asset_comment')) tabs.push({ value: 'comentarios', label: 'Comentários', content: <Comments asset={asset} inventory={inventory} /> })
  if (can('view', 'history')) tabs.push({ value: 'historico', label: 'Histórico', content: <AssetHistory asset={asset} inventory={inventory} /> })

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} eyebrow={`${ASSET_TYPE_LABEL[asset.type]} · ${inventory.serviceName(asset.criticalServiceId)}`} title={asset.name}
      chip={<><CriticalityChip level={asset.criticality} />{inventory.topRisk(asset.id) && <RiskLevelBadge level={inventory.topRisk(asset.id)!} prefix="Risco " />}</>}
      footer={editable ? (
        <>
          {can('delete', 'asset') && (confirmDelete
            ? <Button variant="danger" onClick={doDelete} loading={remove.isPending}>Confirmar remoção</Button>
            : <Button variant="ghost" className="mr-auto max-sm:mr-0" onClick={() => setConfirmDelete(true)}>Remover</Button>)}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="asset-form" loading={save.isPending}>Guardar alterações</Button>
        </>
      ) : undefined}>
      <Tabs tabs={tabs} />
    </Drawer>
  )
}

function ReadOnlyDetail({ asset, inventory }: { asset: Asset; inventory: Inventory }) {
  const owner = inventory.user(asset.ownerId)
  const rows: Array<[string, string]> = [
    ['Tipo', ASSET_TYPE_LABEL[asset.type]],
    ['Serviço crítico', inventory.serviceName(asset.criticalServiceId)],
    ['Localização', asset.location ?? '—'],
    ['Responsável', owner?.name ?? '—'],
    ['Registado por', `${inventory.user(asset.createdBy)?.name ?? '—'} · ${dateTime(asset.createdAt)}`],
  ]
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-[14px]">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-soft">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
    </dl>
  )
}

function AssetRisks({ asset, inventory }: { asset: Asset; inventory: Inventory }) {
  const org = useTenant()
  const can = useCan()
  const risks = inventory.risksByAsset.get(asset.id) ?? []
  return (
    <div className="flex flex-col gap-3">
      {risks.length === 0 && <p className="text-[14px] text-ink-soft">Ainda não há riscos registados sobre este ativo.</p>}
      {risks.map((r) => {
        const { level } = computeRiskLevel(r.probability, r.impact)
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold">{r.threat}</p>
              <RiskLevelBadge level={level} />
            </div>
            <p className="mt-1 text-[13px] text-ink-soft">{can('edit', 'risk') ? r.description : r.plainLanguage ?? r.description}</p>
            <p className="mt-2 text-[12px] text-muted">{r.treatment ? TREATMENT_LABEL[r.treatment] : 'Sem tratamento'} · {RISK_STATUS_LABEL[r.status]}</p>
          </>
        )
        const to = can('edit', 'risk') ? `/clientes/${org.slug}/riscos?risco=${r.id}` : `/org/${org.slug}/riscos?risco=${r.id}`
        return <Link key={r.id} to={to} className="block rounded-[12px] border border-line-soft p-4 hover:border-line">{body}</Link>
      })}
      {can('create', 'risk') && (
        <Link to={`/clientes/${org.slug}/riscos?novo=1&ativo=${asset.id}`} className="inline-flex items-center gap-2 self-start text-[14px] font-bold text-brand hover:underline">
          <ShieldPlus className="size-4" aria-hidden />Registar risco sobre este ativo
        </Link>
      )}
    </div>
  )
}

function Comments({ asset, inventory }: { asset: Asset; inventory: Inventory }) {
  const org = useTenant()
  const can = useCan()
  const { persona } = useSession()
  const toast = useToast()
  const comments = useComments(org.id, asset.id)
  const add = useAddComment(org.id, asset.id)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string>()
  return (
    <div className="flex flex-col gap-4">
      {comments.data?.length === 0 && <p className="text-[14px] text-ink-soft">Sem comentários.</p>}
      {comments.data?.map((c) => {
        const u = inventory.user(c.authorId)
        return (
          <div key={c.id} className="flex gap-3">
            <Avatar initials={u?.initials ?? '?'} size={28} />
            <div className="min-w-0 flex-1 rounded-[12px] bg-paper-soft px-3.5 py-2.5">
              <p className="text-[13px]"><span className="font-bold">{u?.name}</span> <span className="text-muted">· {dateTime(c.createdAt)}</span></p>
              <p className="mt-1 text-[14px]">{c.body}</p>
            </div>
          </div>
        )
      })}
      {can('comment', 'asset_comment') ? (
        <form noValidate className="flex flex-col gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (!body.trim()) { setError('Escreva o comentário.'); return }
          add.mutate(body, { onSuccess: () => { setBody(''); setError(undefined); toast.show('Comentário enviado ao cliente') }, onError: (er) => toast.show(er.message, 'error') })
        }}>
          <Field label={`Comentar como ${persona.firstName}`} error={error}>{(p) => <TextArea id={p.id} invalid={p.invalid} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ex.: confirme se este equipamento tem acesso remoto." />}</Field>
          <Button type="submit" variant="secondary" size="sm" className="self-end" loading={add.isPending} icon={<MessageSquare className="size-4" aria-hidden />}>Comentar</Button>
        </form>
      ) : comments.data?.length ? <Note>Comentários da consultora sobre o inventário.</Note> : null}
    </div>
  )
}

function AssetHistory({ asset, inventory }: { asset: Asset; inventory: Inventory }) {
  const org = useTenant()
  const audit = useAudit(org.id, asset.id)
  return audit.data ? <HistoryList items={toHistory(audit.data, inventory.users)} /> : <p className="text-[14px] text-muted">A carregar…</p>
}
