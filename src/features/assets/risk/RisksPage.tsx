import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, Download, Plus, ShieldCheck } from 'lucide-react'
import type { Level, Risk } from '../../../api/contracts'
import { useActions, useAssets, useRiskLinks, useRisks, useToday, useUsers } from '../../../api/queries'
import { RISK_MATRIX } from '../../../config/riskMatrix'
import { RISK_LEVEL_LABEL, RISK_STATUS_LABEL, shortDate, TREATMENT_LABEL } from '../../../config/labels'
import { useTenant } from '../../../core/tenant'
import { useCan } from '../../../core/useCan'
import {
  Button, Card, Chip, Segmented, DataTable, EmptyState, ErrorState, Explainer, Eyebrow, NextAction, Note, PageHeader, Term, Person, RiskLevelBadge, RiskMatrix, SkeletonRows,
  type ColumnDef,
} from '../../../ui'
import { computeRiskLevel } from './computeRiskLevel'
import { RiskEditDrawer, RiskReadDrawer } from './RiskDrawer'
import { exportRiskRegister } from './exportRisks'

const levelOf = (p: number, i: number): Level => computeRiskLevel(p, i).level

/** Risk register: consultant edits; client sees it read-only after validation (D3). */
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
  const today = useToday()
  const residual = params.get('matriz') === 'residual'
  const showArchived = params.get('arquivados') === '1'

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace: true, preventScrollReset: true })
  }

  const cellP = Number(params.get('p')) || null
  const cellI = Number(params.get('i')) || null
  const cell = cellP && cellI ? { probability: cellP, impact: cellI } : null

  const everything = useMemo(() => risks.data ?? [], [risks.data])
  const archived = everything.filter((r) => r.status === 'arquivado')
  const all = useMemo(() => everything.filter((r) => showArchived || r.status !== 'arquivado').sort((a, b) => computeRiskLevel(b.probability, b.impact).score - computeRiskLevel(a.probability, a.impact).score), [everything, showArchived])
  const pos = (r: Risk) => (residual && r.residualProbability && r.residualImpact ? { p: r.residualProbability, i: r.residualImpact } : { p: r.probability, i: r.impact })
  const visible = cell ? all.filter((r) => pos(r).p === cell.probability && pos(r).i === cell.impact) : all

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
    { id: 'status', accessorFn: (r) => r.status, header: 'Estado', cell: (c) => {
      const r = c.row.original
      const late = r.reviewDate && today.data && r.reviewDate < today.data && r.status !== 'arquivado'
      return <div><p className="text-[13px] text-ink-soft">{RISK_STATUS_LABEL[r.status]}</p>{r.reviewDate && <p className={late ? 'text-[12px] font-bold text-risk-high-ink' : 'text-[12px] text-muted'}>{late ? 'Revisão atrasada' : `Rever a ${shortDate(r.reviewDate)}`}</p>}</div>
    }, meta: { width: 150 } },
    { id: 'owner', accessorFn: (r) => owner(r.ownerId)?.name ?? '', header: 'Responsável', cell: (c) => { const u = owner(c.row.original.ownerId); return u ? <Person initials={u.initials} name={u.name} /> : '—' } },
  ] : [
    { id: 'level', accessorFn: (r) => computeRiskLevel(r.probability, r.impact).score, header: 'Nível', cell: (c) => <RiskLevelBadge level={levelOf(c.row.original.probability, c.row.original.impact)} />, meta: { width: 110 } },
    { id: 'plain', accessorFn: (r) => r.threat, header: 'O que pode acontecer', cell: (c) => <div><p className="font-bold">{c.row.original.plainLanguage ?? c.row.original.threat}</p><p className="text-[13px] text-ink-soft">{assetName(c.row.original.assetId)}</p></div>, meta: { width: 460 } },
    { id: 'doing', accessorFn: (r) => r.treatment ?? '', header: 'O que está a ser feito', cell: (c) => { const r = c.row.original; const n = linkedActions(r).length; return <span className="text-[13px]">{r.treatment ? TREATMENT_LABEL[r.treatment] : 'Por decidir'}{n ? ` · ${n} ${n === 1 ? 'ação' : 'ações'} no roadmap` : ''}</span> } },
  ]

  const selected = all.find((r) => r.id === params.get('risco')) ?? null
  const isNew = params.get('novo') === '1'
  const counts = (l: Level) => all.filter((r) => levelOf(pos(r).p, pos(r).i) === l).length

  const undecided = all.filter((r) => !r.treatment && levelOf(r.probability, r.impact) === 'alto')
  const nextAction = editable && ready && undecided.length > 0 && (
    <NextAction
      title={`Decida o tratamento de ${undecided.length} ${undecided.length === 1 ? 'risco alto' : 'riscos altos'}`}
      text={`Comece por "${undecided[0].threat}". Ao mitigar, ligue ações do roadmap: sobem de prioridade.`}
      cta="Abrir risco" onClick={() => update({ risco: undecided[0].id })} />
  )

  return (
    <>
      <PageHeader
        eyebrow={org.name}
        title={editable ? 'Registo de riscos' : 'Riscos'}
        subtitle={editable ? 'Segundo a ISO/IEC 27005. O nível é calculado: probabilidade × impacto.' : 'Os riscos que a consultora identificou e o que está a ser feito para os reduzir.'}
        actions={<>
          {ready && all.length > 0 && <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={() => exportRiskRegister(all, { assets: assets.data!, users: users.data!, actions: actions.data!, links: links.data! })}>Exportar registo</Button>}
          {can('create', 'risk') && <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => update({ novo: '1', ativo: null })}>Novo risco</Button>}
        </>}
      />

      {raisedBy && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-brand/30 bg-signal-soft px-4 py-3 animate-pop-in" role="status">
          <ShieldCheck className="size-5 text-brand" aria-hidden />
          <p className="flex-1 text-[14px] font-semibold text-brand">As ações ligadas ao risco "{raisedBy}" subiram no roadmap.</p>
          <Link to={`${base}/roadmap`} className="inline-flex items-center gap-1 text-[14px] font-bold text-brand hover:underline">Ver antes e depois <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      )}
      {nextAction}
      {!editable && <Note>Registo validado pela consultora Marta Ferreira. Só de leitura: se algo não estiver certo, fale com ela.</Note>}
      {editable ? (
        <Explainer id="risks-consultant" collapseOnRevisit intro="O registo de riscos segue o método da ISO/IEC 27005 em três passos. O resultado prioriza o roadmap do cliente."
          steps={[
            { title: 'Identificar', text: <>Escolha o <Term k="ativo" /> e descreva a <Term k="ameaca">ameaça</Term>: o que pode correr mal.</> },
            { title: 'Avaliar', text: <>Indique a <Term k="probabilidade">probabilidade</Term> e o <Term k="impacto">impacto</Term>. O <Term k="nivelRisco">nível</Term> é calculado pelo sistema.</> },
            { title: 'Tratar', text: <>Decida o <Term k="tratamento">tratamento</Term>. Ao mitigar, ligue ações do <Term k="roadmap" />: as ligadas a riscos altos sobem de prioridade.</> },
          ]} />
      ) : (
        <Explainer id="risks-client" collapseOnRevisit title="Como ler esta página" intro="Cada linha é algo que pode correr mal à empresa. A consultora avaliou quão provável é e quão grave seria, e definiu o que fazer."
          steps={[
            { title: 'Nível', text: <>Alto, médio ou baixo, calculado por regra: <Term k="probabilidade">probabilidade</Term> × <Term k="impacto">impacto</Term>. Comece pelos altos.</> },
            { title: 'O que pode acontecer', text: 'Explicado em linguagem simples. Abra a linha para ver o detalhe.' },
            { title: 'O que está a ser feito', text: <>As ações do <Term k="roadmap" /> que reduzem o risco, com prazo e responsável.</> },
          ]} />
      )}

      {error ? <ErrorState error={error} onRetry={() => { risks.refetch(); links.refetch(); assets.refetch(); actions.refetch() }} /> : !ready ? <SkeletonRows rows={6} /> : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="rounded-[16px] px-6 py-5">
              <div className="mb-2 flex items-center justify-between">
                <Eyebrow><Term k="matriz">Matriz de risco</Term> · {RISK_MATRIX.probability.length}×{RISK_MATRIX.impact.length}</Eyebrow>
                {cell && <Button variant="link" size="sm" onClick={() => update({ p: null, i: null })}>Mostrar todos</Button>}
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Segmented ariaLabel="Mostrar risco" value={residual ? 'residual' : 'inerente'} onChange={(v) => update({ matriz: v === 'residual' ? 'residual' : null, p: null, i: null })}
                  options={[{ value: 'inerente', label: 'Risco atual' }, { value: 'residual', label: 'Depois das ações' }]} />
                <span className="text-[12px] text-muted">{residual ? <>Mostra o <Term k="riscoResidual">risco residual</Term> previsto. Riscos sem previsão ficam na posição atual.</> : 'Mostra o risco hoje, antes das ações.'}</span>
              </div>
              <p className="mb-3 text-[13px] text-ink-soft">
                Cada quadrado conta os riscos com essa <Term k="probabilidade">probabilidade</Term> (linhas) e esse <Term k="impacto">impacto</Term> (colunas). Quanto mais acima e à direita, mais grave. Clique num quadrado para filtrar a tabela.
              </p>
              <RiskMatrix probability={RISK_MATRIX.probability} impact={RISK_MATRIX.impact} levelOf={levelOf}
                count={(p, i) => all.filter((r) => pos(r).p === p && pos(r).i === i).length}
                selected={cell} onSelect={(c) => update({ p: c ? String(c.probability) : null, i: c ? String(c.impact) : null })} compact />
            </Card>
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              {(['alto', 'medio', 'baixo'] as Level[]).map((l) => (
                <Card key={l} className="flex items-center justify-between max-md:px-3.5 max-md:py-3">
                  <div><Eyebrow>Risco {RISK_LEVEL_LABEL[l].toLowerCase()}</Eyebrow><p className="mt-1 text-[18px] font-extrabold">{counts(l)}</p></div>
                  <span className="max-md:hidden"><RiskLevelBadge level={l} /></span>
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
                  {editable && r.reviewDate && today.data && r.reviewDate < today.data && r.status !== 'arquivado' && <p className="text-[12px] font-bold text-risk-high-ink">Revisão atrasada</p>}
                </div>
                <RiskLevelBadge level={levelOf(r.probability, r.impact)} />
              </div>
            )}
            empty={all.length === 0
              ? <EmptyState className="m-4" title="Ainda não há riscos registados" action={can('create', 'risk') && <Button onClick={() => update({ novo: '1' })}>Registar o primeiro risco</Button>}>Comece pelos ativos de criticidade alta.</EmptyState>
              : <p className="px-5 py-8 text-center text-[14px] text-ink-soft">Nenhum risco nesta célula da matriz.</p>}
          />
          {cell && <p className="-mt-4 text-[13px] text-ink-soft">A mostrar {visible.length} de {all.length} riscos (filtro da matriz).</p>}
          {editable && archived.length > 0 && (
            <label className="-mt-3 flex items-center gap-2 text-[13px] text-ink-soft">
              <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={showArchived} onChange={(e) => update({ arquivados: e.target.checked ? '1' : null })} />
              Mostrar riscos arquivados ({archived.length})
            </label>
          )}

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
