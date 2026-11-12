import { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { Boxes, Download, FileUp, Layers, Plus, CirclePlus } from 'lucide-react'
import { useTasks } from '../../api/queries'
import type { Asset, Task } from '../../api/contracts'
import { ASSET_TYPE_LABEL, authorNames, shortDay } from '../../config/labels'
import { LEVEL_ORDER } from '../../config/riskMatrix'
import { useSession } from '../../core/session'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import { PageTour } from '../../core/onboarding/PageTour'
import {
  Button, Chip, CriticalityChip, DataTable, EmptyState, ErrorState, Note, Term, PageHeader, PendingRow, Person, RiskLevelBadge,
  Segmented, SkeletonRows, type ColumnDef,
} from '../../ui'
import { AssetDrawer } from './AssetDrawer'
import { AssetFilters } from './AssetFilters'
import { applyFilters, FILTER_KEYS, readFilters, type AssetFilterState } from './filterState'
import { AssignTaskModal } from './AssignTaskModal'
import { ExportModal } from './ExportModal'
import { ServicesDrawer } from './ServicesDrawer'
import { ServiceMap } from './ServiceMap'
import { BulkBar } from './BulkBar'
import { ImportModal } from './import/ImportModal'
import { useInventory, type Inventory } from './useInventory'

function columns(inv: Inventory, opts: { risks: boolean; riskLink?: (a: Asset) => string }): ColumnDef<Asset, unknown>[] {
  const compact = opts.risks || !!opts.riskLink
  // Consultant sees both the risk column and the "Registar risco" link: tightest layout.
  const dense = opts.risks && !!opts.riskLink
  const cols: ColumnDef<Asset, unknown>[] = [
    { id: 'name', accessorFn: (a) => a.name, header: 'Ativo', cell: (c) => <span className="font-bold">{c.row.original.name}</span>, meta: { width: dense ? 210 : compact ? 260 : 300 } },
    { id: 'type', accessorFn: (a) => ASSET_TYPE_LABEL[a.type], header: 'Tipo', cell: (c) => <span className="text-ink-soft">{c.getValue() as string}</span>, meta: { width: dense ? 150 : compact ? 170 : 190 } },
    { id: 'service', accessorFn: (a) => inv.serviceName(a.criticalServiceId), header: 'Serviço crítico', cell: (c) => <span className="text-ink-soft">{c.getValue() as string}</span>, meta: { width: dense ? 180 : compact ? 200 : 230 } },
    { id: 'owner', accessorFn: (a) => inv.user(a.ownerId)?.name ?? '', header: 'Responsável', cell: (c) => { const u = inv.user(c.row.original.ownerId); return u ? <Person initials={u.initials} name={u.name} /> : '—' }, meta: { width: dense ? 160 : compact ? 180 : 210 } },
    { id: 'crit', accessorFn: (a) => LEVEL_ORDER[a.criticality], header: 'Criticidade', cell: (c) => <CriticalityChip level={c.row.original.criticality} />, meta: compact ? { width: dense ? 110 : 120 } : undefined },
  ]
  if (opts.risks) {
    cols.push({ id: 'risk', accessorFn: (a) => (inv.topRisk(a.id) ? LEVEL_ORDER[inv.topRisk(a.id)!] : 0), header: 'Risco', cell: (c) => { const l = inv.topRisk(c.row.original.id); const n = inv.risksByAsset.get(c.row.original.id)?.length ?? 0; return l ? <span className="inline-flex items-center gap-2"><RiskLevelBadge level={l} /><span className="text-xs text-muted">{n}</span></span> : <span className="text-sm text-muted">Sem riscos</span> }, meta: dense ? { width: 130 } : undefined })
  }
    if (opts.riskLink) {
      const href = opts.riskLink
      cols.push({ id: 'action', header: 'Ação', enableSorting: false, meta: { align: 'right' }, cell: (c) => (
        <Link to={href(c.row.original)} onClick={(e) => e.stopPropagation()} aria-label={`Registar risco sobre ${c.row.original.name}`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 py-1.5 text-sm font-bold text-brand hover:bg-brand-soft">
          <CirclePlus className="size-4" aria-hidden />Registar risco
        </Link>
      ) })
    }
  return cols
}

function AssetCard({ a, inv }: { a: Asset; inv: Inventory }) {
  const top = inv.topRisk(a.id)
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold">{a.name}</p>
        <p className="text-sm text-ink-soft">{ASSET_TYPE_LABEL[a.type]} · {inv.serviceName(a.criticalServiceId)}</p>
        <p className="mt-1 text-xs text-muted">{inv.user(a.ownerId)?.name}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <CriticalityChip level={a.criticality} />
        {top && <RiskLevelBadge level={top} />}
      </div>
    </div>
  )
}

function taskState(tasks: Task[]): { task: Task | null; state: 'empty' | 'assigned' | 'done' } {
  const task = tasks.filter((t) => t.kind === 'ativos').at(-1) ?? null
  if (!task) return { task, state: 'empty' }
  return { task, state: task.status === 'concluida' ? 'done' : 'assigned' }
}

/** 07 / 07b / 07c — Assets and critical services. Also serves the consultant's view. */
export function AssetsPage() {
  const org = useTenant()
  const can = useCan()
  const { persona } = useSession()
  const [params, setParams] = useSearchParams()
  const inv = useInventory()
  const myTasks = useTasks(org.id)
  const [picked, setPicked] = useState<string[]>([])
  const filters = readFilters(params)

  const update = (next: Record<string, string | null>) => {
    // O URL muda antes do re-render committar: usar o estado do render aqui repõe parâmetros já removidos.
    const p = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '' || v === 'all') p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace: true, preventScrollReset: true })
  }

  const data = inv.data
  const visible = useMemo(() => (data ? applyFilters(data.assets, filters, data) : []), [data, filters])
  const authors = authorNames(data?.assets ?? [], data?.users ?? [])

  if (persona.role === 'analista') {
    // The analyst only works on the assets of their own registration task.
    if (!myTasks.data) return <SkeletonRows rows={3} />
    const mine = myTasks.data.find((t) => t.kind === 'ativos' && t.status !== 'cancelada')
    if (mine) return <Navigate to={`/org/${org.slug}/tarefas/${mine.id}/ativos`} replace />
    return (
      <>
        <PageHeader eyebrow={org.name} title="Ativos" />
        <EmptyState icon={<Boxes className="size-5" aria-hidden />} title="Ainda não tem ativos para registar">Quando o Responsável designado lhe pedir o registo de ativos, aparece aqui e na sua lista de tarefas.</EmptyState>
      </>
    )
  }

  const consultant = persona.role === 'consultor'
  const { task, state } = taskState(inv.tasks)
  const analysts = data?.users.filter((u) => u.role === 'analista') ?? []
  const byAnalyst = data?.assets.filter((a) => a.taskId) ?? []
  const analystName = task ? data?.user(task.assigneeId)?.name : undefined
  const selected = data?.assets.find((a) => a.id === params.get('ativo')) ?? null

  const actions = consultant ? (
    <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={() => update({ exportar: '1' })}>Exportar Lista de Ativos</Button>
  ) : (
    <>
      {can('assign', 'asset_task') && <Button variant="secondary" data-tour="asset-assign" onClick={() => update({ atribuir: '1' })}>Atribuir registo</Button>}
      {can('create', 'asset') && <Button data-tour="asset-add" icon={<Plus className="size-4" aria-hidden />} onClick={() => update({ novo: '1' })}>Adicionar ativo</Button>}
    </>
  )

  const pending = !data || state === 'done' || consultant ? null : (
    <PendingRow
      assigned={state === 'assigned'}
      title={task?.scope ?? 'Servidores, rede e sistemas de produção'}
      text={state === 'assigned'
        ? `Registo atribuído ao ${analystName}. ${byAnalyst.length ? `${byAnalyst.length} de ${task?.expectedCount ?? 4} já registados.` : 'Aparece aqui quando ele os registar.'}`
        : 'Ainda não registados. O Pedro conhece estes sistemas: atribua-lhe o registo.'}
      action={state === 'assigned' && task
        ? <Chip>Atribuído{task.dueDate ? ` · até ${shortDay(task.dueDate)}` : ''}</Chip>
        : <Button variant="secondary" onClick={() => update({ atribuir: '1' })}>Atribuir ao Pedro</Button>}
    />
  )

  return (
    <>
      <PageHeader eyebrow={org.name} title={consultant ? 'Ativos' : 'Ativos e serviços críticos'} subtitle={consultant ? `Inventário preenchido${authors ? ` por ${authors}` : ''}. Use-o para registar os riscos.` : undefined} help={<PageTour id={consultant ? 'ativos-consultor' : 'ativos-cliente'} ready={!!data} />} actions={actions} />
      <Note>Este inventário é a base da análise de <Term k="risco">riscos</Term> e da <Term k="listaAtivos">Lista de Ativos</Term> que a empresa tem de comunicar ao CNCS.</Note>
      {inv.error ? <ErrorState error={inv.error} onRetry={inv.refetch} /> : !data ? (
        <div className="flex flex-col gap-4"><div className="h-6 w-2/3 animate-pulse rounded-[8px] bg-paper-soft" /><SkeletonRows rows={5} /></div>
      ) : (
        <>
          {/* One summary line instead of three stat cards: the table is the content, this only frames it. */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <dl data-tour="asset-summary" className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[0.9375rem]" aria-label="Resumo do inventário">
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Ativos registados</dt>
              <dd><strong className="font-extrabold">{data.assets.length} {data.assets.length === 1 ? 'ativo' : 'ativos'}</strong> <span className="text-ink-soft">{byAnalyst.length && analystName ? `· ${byAnalyst.length} registados pelo ${analystName}` : consultant ? '· registados pelo cliente' : '· registados por si'}</span></dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Serviços críticos</dt>
              <dd>
                <Button variant="link" className="!p-0 font-extrabold" icon={<Layers className="size-4" aria-hidden />} onClick={() => update({ servicos: '1' })}>
                  {data.services.length ? `${data.services.length} ${data.services.length === 1 ? 'serviço crítico' : 'serviços críticos'}` : 'Definir serviços críticos'}
                </Button>
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Por registar</dt>
              <dd className="text-ink-soft">{state === 'done' ? 'Inventário completo' : `Por registar: ${task?.scope ?? 'servidores, rede e sistemas de produção'}`}</dd>
            </div>
          </dl>
          {/* File actions sit with the summary they act on, not in the filter row. */}
          {(!consultant || can('create', 'asset')) && data.assets.length > 0 && (
            <div className="-mx-2 flex flex-wrap items-center gap-1">
              {!consultant && <Button variant="ghost" size="sm" icon={<Download className="size-4" aria-hidden />} onClick={() => update({ exportar: '1' })}>Exportar Lista de Ativos</Button>}
              {can('create', 'asset') && <Button variant="ghost" size="sm" icon={<FileUp className="size-4" aria-hidden />} onClick={() => update({ importar: '1' })}>Importar de Excel (CSV)</Button>}
            </div>
          )}
          </div>

          {data.assets.length > 0 && (
            <div className="flex flex-wrap items-start gap-2.5" data-tour="asset-filters">
              <div className="min-w-0 flex-1 basis-[320px]">
                <AssetFilters value={filters} inventory={data} shown={visible.length} total={data.assets.length}
                  onChange={(n: Partial<AssetFilterState>) => update(n as Record<string, string>)}
                  onClear={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))} />
              </div>
              <Segmented size="sm" ariaLabel="Vista" value={params.get('vista') === 'servicos' ? 'servicos' : 'tabela'} onChange={(v) => update({ vista: v === 'tabela' ? null : v })}
                options={[{ value: 'tabela', label: 'Tabela' }, { value: 'servicos', label: 'Por serviço' }]} />
            </div>
          )}

          {picked.length > 0 && can('edit', 'asset') && <BulkBar ids={picked} inventory={data} onDone={() => setPicked([])} />}
          <div data-tour="asset-table">{params.get('vista') === 'servicos' ? <ServiceMap assets={visible} inventory={data} onOpen={(a) => update({ ativo: a.id })} /> : <DataTable
            caption="Ativos da organização"
            data={visible}
            columns={columns(data, { risks: inv.seeRisks, riskLink: consultant && can('create', 'risk') ? (a) => `/clientes/${org.slug}/riscos?novo=1&ativo=${a.id}` : undefined })}
            getRowId={(a) => a.id}
            onRowClick={(a) => update({ ativo: a.id })}
            rowLabel={(a) => `Abrir ${a.name}`}
            renderCard={(a) => <AssetCard a={a} inv={data} />}
            footer={pending}
             empty={data.assets.length === 0
               ? <EmptyState className="m-4" title="Ainda não há ativos registados" action={can('create', 'asset') && <Button onClick={() => update({ novo: '1' })}>Adicionar o primeiro ativo</Button>}>Comece pelos sistemas sem os quais a empresa para: faturação, produção, email.</EmptyState>
               : <p className="px-5 py-8 text-center text-sm text-ink-soft">Nenhum ativo corresponde aos filtros.</p>}
             selected={picked}
             onSelectedChange={can('edit', 'asset') && !consultant ? setPicked : undefined}
           />}</div>

          <AssetDrawer key={`new-${params.get('novo')}`} inventory={data} asset={null} mode="new" open={params.get('novo') === '1'} onClose={() => update({ novo: null })} />
          <AssetDrawer key={selected?.id ?? 'none'} inventory={data} asset={selected} mode="view" open={!!selected} onClose={() => update({ ativo: null })} />
          <ServicesDrawer open={params.get('servicos') === '1'} onClose={() => update({ servicos: null })} inventory={data} />
          {can('create', 'asset') && <ImportModal key={String(params.get('importar'))} open={params.get('importar') === '1'} onClose={() => update({ importar: null })} inventory={data} />}
          <ExportModal open={params.get('exportar') === '1'} onClose={() => update({ exportar: null })} inventory={data} />
          {can('assign', 'asset_task') && <AssignTaskModal key={String(params.get('atribuir'))} open={params.get('atribuir') === '1'} onClose={() => update({ atribuir: null })} analysts={analysts} />}
        </>
      )}
    </>
  )
}
