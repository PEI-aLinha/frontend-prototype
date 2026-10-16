import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, Plus, ShieldCheck } from 'lucide-react'
import type { Level, Risk } from '../../../api/contracts'
import { useActions, useAssets, useRiskLinks, useRisks, useUsers } from '../../../api/queries'
import { RISK_MATRIX } from '../../../config/riskMatrix'
import { RISK_LEVEL_LABEL, RISK_STATUS_LABEL, TREATMENT_LABEL } from '../../../config/labels'
import { useTenant } from '../../../core/tenant'
import { useCan } from '../../../core/useCan'
import {
  Button, Card, Chip, DataTable, EmptyState, ErrorState, Eyebrow, Note, PageHeader, Person, RiskLevelBadge, RiskMatrix, SkeletonRows,
  type ColumnDef,
} from '../../../ui'
import { computeRiskLevel } from './computeRiskLevel'
import { RiskEditDrawer, RiskReadDrawer } from './RiskDrawer'

const levelOf = (p: number, i: number): Level => computeRiskLevel(p, i).level

/** Registo de riscos: consultora edita; cliente vê em só leitura depois da validação (D3). */
export function RisksPage() {
  const org = useTenant()
  const can = useCan()
  const editable = can('edit', 'risk')
  const [params, setParams] = useSearchParams()
  const risks = useRisks(org.id)
  const links = useRiskLinks(org.id)
  const assets = useAssets(org.id)
  const users = useUsers(org.id)
  const actions = useActions(org.id)
  const [raisedBy, setRaisedBy] = useState<string | null>(null)

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace: true })
  }

  const cellP = Number(params.get('p')) || null
  const cellI = Number(params.get('i')) || null
  const cell = cellP && cellI ? { probability: cellP, impact: cellI } : null

  const all = useMemo(() => [...(risks.data ?? [])].sort((a, b) => computeRiskLevel(b.probability, b.impact).score - computeRiskLevel(a.probability, a.impact).score), [risks.data])
  const visible = cell ? all.filter((r) => r.probability === cell.probability && r.impact === cell.impact) : all

  const error = risks.error ?? assets.error ?? users.error ?? actions.error ?? links.error
  const ready = risks.data && assets.data && users.data && actions.data && links.data
  const base = editable ? `/clientes/${org.slug}` : `/org/${org.slug}`

  const linkedActions = (r: Risk) => (links.data ?? []).filter((l) => l.riskId === r.id).map((l) => actions.data?.find((a) => a.id === l.remediationActionId)).filter(Boolean)
  const assetName = (id: string | null) => (id ? assets.data?.find((a) => a.id === id)?.name ?? '—' : 'Toda a empresa')
  const owner = (id: string | null) => users.data?.find((u) => u.id === id)

  const columns: ColumnDef<Risk, unknown>[] = editable ? [
    { id: 'level', accessorFn: (r) => computeRiskLevel(r.probability, r.impact).score, header: 'Nível', cell: (c) => <RiskLevelBadge level={levelOf(c.row.original.probability, c.row.original.impact)} />, meta: { width: 110 } },
    { id: 'threat', accessorFn: (r) => r.threat, header: 'Risco', cell: (c) => <div><p className="font-bold">{c.row.original.threat}</p><p className="text-[13px] text-ink-soft">{assetName(c.row.original.assetId)}</p></div>, meta: { width: 330 } },
    { id: 'treatment', accessorFn: (r) => r.treatment ?? '', header: 'Tratamento', cell: (c) => (c.row.original.treatment ? <span className="font-semibold">{TREATMENT_LABEL[c.row.original.treatment]}</span> : <span className="text-muted">—</span>), meta: { width: 120 } },
    { id: 'actions', accessorFn: (r) => linkedActions(r).length, header: 'Ações ligadas', cell: (c) => { const n = linkedActions(c.row.original).length; return n ? <Chip>{n} {n === 1 ? 'ação' : 'ações'}</Chip> : <span className="text-[13px] text-muted">Nenhuma</span> }, meta: { width: 130 } },
    { id: 'status', accessorFn: (r) => r.status, header: 'Estado', cell: (c) => <span className="text-[13px] text-ink-soft">{RISK_STATUS_LABEL[c.row.original.status]}</span>, meta: { width: 130 } },
    { id: 'owner', accessorFn: (r) => owner(r.ownerId)?.name ?? '', header: 'Responsável', cell: (c) => { const u = owner(c.row.original.ownerId); return u ? <Person initials={u.initials} name={u.name} /> : '—' } },
  ] : [
    { id: 'level', accessorFn: (r) => computeRiskLevel(r.probability, r.impact).score, header: 'Nível', cell: (c) => <RiskLevelBadge level={levelOf(c.row.original.probability, c.row.original.impact)} />, meta: { width: 110 } },
    { id: 'plain', accessorFn: (r) => r.threat, header: 'O que pode acontecer', cell: (c) => <div><p className="font-bold">{c.row.original.plainLanguage ?? c.row.original.threat}</p><p className="text-[13px] text-ink-soft">{assetName(c.row.original.assetId)}</p></div>, meta: { width: 460 } },
    { id: 'doing', accessorFn: (r) => r.treatment ?? '', header: 'O que está a ser feito', cell: (c) => { const r = c.row.original; const n = linkedActions(r).length; return <span className="text-[13px]">{r.treatment ? TREATMENT_LABEL[r.treatment] : 'Por decidir'}{n ? ` · ${n} ${n === 1 ? 'ação' : 'ações'} no roadmap` : ''}</span> } },
  ]

  const selected = all.find((r) => r.id === params.get('risco')) ?? null
  const isNew = params.get('novo') === '1'
  const counts = (l: Level) => all.filter((r) => levelOf(r.probability, r.impact) === l).length

  return (
    <>
      <PageHeader
        eyebrow={org.name}
        title={editable ? 'Registo de riscos' : 'Riscos'}
        subtitle={editable ? 'Segundo a ISO/IEC 27005. O nível é calculado: probabilidade × impacto.' : 'Os riscos que a consultora identificou e o que está a ser feito para os reduzir.'}
        actions={can('create', 'risk') && <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => update({ novo: '1', ativo: null })}>Novo risco</Button>}
      />

      {raisedBy && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-brand/30 bg-signal-soft px-4 py-3 animate-pop-in" role="status">
          <ShieldCheck className="size-5 text-brand" aria-hidden />
          <p className="flex-1 text-[14px] font-semibold text-brand">As ações ligadas ao risco "{raisedBy}" subiram no roadmap.</p>
          <Link to={`${base}/roadmap`} className="inline-flex items-center gap-1 text-[14px] font-bold text-brand hover:underline">Ver antes e depois <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      )}
      {!editable && <Note>Registo validado pela consultora Marta Ferreira. Só de leitura: se algo não estiver certo, fale com ela.</Note>}

      {error ? <ErrorState error={error} onRetry={() => { risks.refetch(); links.refetch(); assets.refetch(); actions.refetch() }} /> : !ready ? <SkeletonRows rows={6} /> : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="rounded-[16px] px-6 py-5">
              <div className="mb-2 flex items-center justify-between">
                <Eyebrow>Matriz de risco · {RISK_MATRIX.probability.length}×{RISK_MATRIX.impact.length}</Eyebrow>
                {cell && <Button variant="link" size="sm" onClick={() => update({ p: null, i: null })}>Mostrar todos</Button>}
              </div>
              <RiskMatrix probability={RISK_MATRIX.probability} impact={RISK_MATRIX.impact} levelOf={levelOf}
                count={(p, i) => all.filter((r) => r.probability === p && r.impact === i).length}
                selected={cell} onSelect={(c) => update({ p: c ? String(c.probability) : null, i: c ? String(c.impact) : null })} compact />
            </Card>
            <div className="flex flex-col gap-3">
              {(['alto', 'medio', 'baixo'] as Level[]).map((l) => (
                <Card key={l} className="flex items-center justify-between">
                  <div><Eyebrow>Risco {RISK_LEVEL_LABEL[l].toLowerCase()}</Eyebrow><p className="mt-1 text-[18px] font-extrabold">{counts(l)}</p></div>
                  <RiskLevelBadge level={l} />
                </Card>
              ))}
            </div>
          </div>

          <DataTable
            caption="Registo de riscos"
            data={visible}
            columns={columns}
            getRowId={(r) => r.id}
            initialSorting={[{ id: 'level', desc: true }]}
            onRowClick={(r) => update({ risco: r.id })}
            rowLabel={(r) => `Abrir risco ${r.threat}`}
            renderCard={(r) => (
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{editable ? r.threat : r.plainLanguage ?? r.threat}</p>
                  <p className="text-[13px] text-ink-soft">{assetName(r.assetId)}</p>
                  <p className="mt-1 text-[12px] text-muted">{r.treatment ? TREATMENT_LABEL[r.treatment] : 'Sem tratamento'} · {linkedActions(r).length} ações</p>
                </div>
                <RiskLevelBadge level={levelOf(r.probability, r.impact)} />
              </div>
            )}
            empty={all.length === 0
              ? <EmptyState className="m-4" title="Ainda não há riscos registados" action={can('create', 'risk') && <Button onClick={() => update({ novo: '1' })}>Registar o primeiro risco</Button>}>Comece pelos ativos de criticidade alta.</EmptyState>
              : <p className="px-5 py-8 text-center text-[14px] text-ink-soft">Nenhum risco nesta célula da matriz.</p>}
          />
          {cell && <p className="-mt-4 text-[13px] text-ink-soft">A mostrar {visible.length} de {all.length} riscos (filtro da matriz).</p>}

          {editable ? (
            <>
              {isNew && <RiskEditDrawer key={`new-${params.get('ativo')}`} open onClose={() => update({ novo: null, ativo: null })} risk={null} initialAssetId={params.get('ativo')} assets={assets.data} users={users.data} actions={actions.data} links={links.data}
                onSaved={(r, high) => { if (high) setRaisedBy(r.threat); update({ novo: null, ativo: null }) }} />}
              {selected && <RiskEditDrawer key={selected.id} open onClose={() => update({ risco: null })} risk={selected} assets={assets.data} users={users.data} actions={actions.data} links={links.data}
                onSaved={(r, high) => { if (high) setRaisedBy(r.threat) }} />}
            </>
          ) : (
            <RiskReadDrawer open={!!selected} onClose={() => update({ risco: null })} risk={selected} assets={assets.data} users={users.data} actions={actions.data} links={links.data} />
          )}
        </>
      )}
    </>
  )
}
