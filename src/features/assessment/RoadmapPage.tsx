import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, CheckCircle2, Download, History, Plus, Grid3x3 } from 'lucide-react'
import type { CollectedEvidence, Id, RemediationAction, User } from '../../api/contracts'
import { useActions, useAssessment, useAudit, useEvidence, useRiskLinks, useRisks, useRoadmapStatus, useUsers, useValidateRoadmap } from '../../api/queries'
import { ACTION_STATUS_LABEL, dateTime, MATURITY_LABEL, shortDate } from '../../config/labels'
import { useSession } from '../../core/session'
import { PageTour } from '../../core/onboarding/PageTour'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import {
  AIBadge, Button, GlossaryText, Chip, EmptyState, ErrorState, HistoryList, Modal, Note, PageHeader, RiskLevelBadge, Segmented, SkeletonRows, cn, useToast,
} from '../../ui'
import { computeRiskLevel } from '../assets/public'
import { evidenceState } from './evidenceState'
import { printResults } from './exportResults'
import { planGaps, planSummary } from './planSummary'
import { ProposeActionModal } from './ProposeActionModal'
import { ReopenRoadmapModal } from './ReopenRoadmapModal'
import { RoadmapMap } from './RoadmapMap'
import { prioritizeRoadmap, type PrioritizedAction, type RiskSignal } from './prioritizeRoadmap'
import { roadmapHistory } from './roadmapHistory'

type View = 'base' | 'riscos'

const NO_EVIDENCE: CollectedEvidence[] = []

/** Assessment and roadmap (minimal Assessment plugin): shows the effect of risks on priority. */
export function RoadmapPage({ signals, frameworks }: { signals: RiskSignal[]; frameworks: string[] }) {
  const org = useTenant()
  const can = useCan()
  const toast = useToast()
  const { persona } = useSession()
  const actions = useActions(org.id)
  const users = useUsers(org.id)
  const status = useRoadmapStatus(org.id)
  const validate = useValidateRoadmap(org.id)
  const assessment = useAssessment(org.id)
  const evidence = useEvidence(org.id)
  // Already loaded by useRiskSignals in the parent, under the same query keys.
  const risks = useRisks(org.id)
  const riskLinks = useRiskLinks(org.id)
  const audit = useAudit(org.id)
  const [params, setParams] = useSearchParams()
  const [confirm, setConfirm] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [proposing, setProposing] = useState(false)
  const view: View = params.get('ordem') === 'base' ? 'base' : 'riscos'
  const showHistory = params.get('historico') === '1'
  const update = (next: Record<string, string | null>) => {
    // O URL muda antes do re-render committar: usar o estado do render aqui repõe parâmetros já removidos.
    const p = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    setParams(p, { replace: true, preventScrollReset: true })
  }
  const setView = (next: View) => update({ ordem: next === 'base' ? 'base' : null })
  const setShowHistory = (open: boolean) => update({ historico: open ? '1' : null })
  // The consultant sees the order and why each action sits where it does; the client sees the plan in plain language.
  const consultant = persona.role === 'consultor'
  // ClientLayout redirects the consultant to /clientes and ConsultantLayout redirects everyone else, so the role picks the prefix.
  const base = consultant ? `/clientes/${org.slug}` : `/org/${org.slug}`

  const summary = useMemo(() => planSummary({ actions: actions.data ?? [], assessment: assessment.data, risks: risks.data ?? [], links: riskLinks.data ?? [] }), [actions.data, assessment.data, risks.data, riskLinks.data])
  const evidenceByAction = useMemo(() => {
    const byAction = new Map<Id, CollectedEvidence[]>()
    for (const e of evidence.data ?? []) {
      if (!e.remediationActionId) continue
      byAction.set(e.remediationActionId, [...(byAction.get(e.remediationActionId) ?? []), e])
    }
    return byAction
  }, [evidence.data])

  if (actions.isError || status.isError || users.isError) {
    return <ErrorState error={actions.error ?? status.error ?? users.error} onRetry={() => { actions.refetch(); status.refetch(); users.refetch() }} />
  }
  // Only the risk-prioritized order moves anything; the base order is the AI's proposal as-is.
  const byRisk = view === 'riscos'
  const ranked = actions.data ? prioritizeRoadmap(actions.data, byRisk ? signals : []) : []
  const raised = ranked.filter((r) => r.reason).length
  // The banner above the plan already labels it as AI-proposed; a badge per row only tells apart a mixed plan.
  const allFromAi = ranked.length > 0 && ranked.every((r) => !!r.action.aiOutputId)
  // Links can exist without moving anything, so the count the message needs is not the count of moves.
  const linked = ranked.filter((r) => r.topRisk).length
  // An action only falls when a risk-linked one passes it, so every fall has a cause worth naming.
  const dropped = byRisk ? ranked.filter((r) => r.rank > r.baseRank).length : 0
  const validated = status.data?.validated
  // A plan built on an unfinished assessment must not reach the client: validation waits for the submission.
  const assessmentOpen = assessment.data?.status === 'em_curso'
  // Until the status resolves, `validated` is undefined and the page would claim the roadmap is not validated yet.
  const pending = status.isPending
  // The mock stores ids, so both people are resolved from the directory the page already loads.
  const validator = users.data?.find((u) => u.id === status.data?.validatedBy)?.name
  // What validation would lock in, counted against the risk order whatever view is on screen.
  const raisedByRisks = actions.data ? prioritizeRoadmap(actions.data, signals).filter((r) => r.reason).length : 0
  const linkedRiskIds = new Set((riskLinks.data ?? []).map((l) => l.riskId))
  const highWithoutAction = (risks.data ?? []).filter((r) => r.status !== 'arquivado' && r.status !== 'tratado' && r.status !== 'aceite'
    && computeRiskLevel(r.probability, r.impact).level === 'alto' && r.treatment !== 'aceitar' && !linkedRiskIds.has(r.id)).length
  // Whoever registered the company is its designated manager.
  const manager = users.data?.find((u) => u.id === org.registeredBy)?.name
  const gaps = planGaps(ranked)
  // Each action carries at most one useful verdict, so counting the rows is enough.
  const evidenceRows = ranked.map((r) => evidenceState(evidenceByAction.get(r.action.id) ?? NO_EVIDENCE))
  const evidenceCount = evidenceRows.filter(Boolean).length
  const provenCount = evidenceRows.filter((e) => e?.tone === 'brand').length
  const canExport = !pending && !!users.data && !!evidence.data && !!risks.data && !!riskLinks.data && !!assessment.data && ranked.length > 0
  // A failed side query gets a dash, not a false zero, and a pending one gets a placeholder.
  const risksLoading = actions.isPending || risks.isPending || riskLinks.isPending
  const risksFailed = risks.isError || riskLinks.isError
  const risksReady = !risksLoading && !risksFailed
  const evidenceLoading = actions.isPending || evidence.isPending
  const evidenceFailed = evidence.isError
  const risksUnlinkedLabel = summary.risksUnlinked === 0
    ? 'Nenhum risco sem ação'
    : `${summary.risksUnlinked} ${summary.risksUnlinked === 1 ? 'risco sem ação' : 'riscos sem ação'}`

  return (
    <>
      <PageHeader
        title="Resultados e roadmap"
        help={<PageTour id={consultant ? 'roadmap-consultor' : 'roadmap-cliente'} ready={!pending && !!actions.data} />}
        subtitle={`Ações para fechar as lacunas da avaliação, ordenadas por prioridade.${frameworks.length ? ` Âmbito: ${frameworks.join(' · ')}.` : ''}`}
        actions={<div className="flex flex-wrap items-center gap-3 max-md:grid max-md:w-full max-md:grid-cols-2 max-md:gap-2">
          {canExport && <Button className="max-md:order-2" variant="ghost" icon={<Download className="size-4" aria-hidden />} onClick={() => printResults(org.name, summary, { ranked, users: users.data ?? [], evidence: evidenceByAction, risks: risks.data ?? [] }, byRisk ? 'priorizado pelos riscos' : 'ordem proposta pela IA', consultant ? 'consultant' : 'client', { frameworks, validated: !!validated, validator, validatedAt: status.data?.validatedAt ?? undefined })} title="Abre a janela de impressão: escolha Guardar como PDF">Exportar PDF</Button>}
          {can('create', 'roadmap') && <Button className="max-md:order-1 max-md:col-span-2" variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setProposing(true)}>Propor ação</Button>}
          {can('view', 'history') && <Button className="max-md:order-2" variant="ghost" icon={<History className="size-4" aria-hidden />} onClick={() => setShowHistory(true)}>Histórico</Button>}
          {!pending && can('validate', 'roadmap') && validated && <Button className="max-md:order-first max-md:col-span-2" variant="secondary" onClick={() => setReopening(true)}>Reabrir validação</Button>}
          {!pending && !!actions.data && can('validate', 'roadmap') && !validated && <Button className="max-md:order-first max-md:col-span-2" icon={<CheckCircle2 className="size-4" aria-hidden />} disabled={assessmentOpen} aria-describedby={assessmentOpen ? 'validate-blocked' : undefined} onClick={() => setConfirm(true)}>Validar roadmap</Button>}
        </div>}
      />

      {pending ? null : validated ? (
        <Note>Roadmap validado {validator ? `por ${validator}` : 'pela consultora'}{status.data?.validatedAt ? ` a ${dateTime(status.data.validatedAt)}` : ''}. {consultant ? 'O cliente vê as ações e os riscos em só leitura.' : 'Pode ver as ações e os riscos, mas não os pode alterar.'}</Note>
      ) : (
        <div role="note" className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line-soft bg-paper-soft px-4 py-3">
          <Chip tone="signal">{status.data?.assessmentCompletedAt ? `Avaliação concluída · ${shortDate(status.data.assessmentCompletedAt)}` : 'Avaliação em curso'}</Chip>
           <span id="validate-blocked" className="text-sm text-ink-soft">{consultant && assessmentOpen ? 'Pode validar o roadmap quando o cliente submeter a avaliação. Até lá, as lacunas ainda podem mudar.' : 'O roadmap foi proposto pela IA a partir das lacunas. A prioridade final é validada pela consultora.'}</span>
          <span className="ml-auto"><AIBadge /></span>
        </div>
      )}


      {!pending && (
        <section aria-labelledby="resumo-titulo" data-tour="roadmap-summary" className="grid overflow-hidden rounded-[14px] border border-line-soft md:grid-cols-3 md:divide-x divide-line-soft max-md:divide-y">
          <h2 id="resumo-titulo" className="sr-only">Resumo do plano</h2>
          {[
            { to: consultant ? undefined : `${base}/avaliacao`, label: 'Maturidade', value: assessment.isError || !assessment.data ? '—' : `${summary.maturity ?? '?'} → ${summary.targetMaturity ?? '—'}`, unit: 'de 5', caption: assessment.isError ? 'Não foi possível carregar a avaliação' : !assessment.data ? 'A carregar a avaliação' : `Atual → objetivo (${summary.targetMaturity ? MATURITY_LABEL[summary.targetMaturity] : '—'})${summary.maturity ? '' : '. O nível atual aparece depois da submissão'}` },
            { to: `${base}/riscos`, label: 'Riscos em aberto', value: risksLoading ? '…' : risksFailed ? '—' : String(summary.openRisks), unit: risksReady ? `de ${summary.allRisks}` : '', caption: risksLoading ? 'A carregar os riscos' : risksFailed ? 'Não foi possível carregar os riscos' : `${summary.allRisks - summary.openRisks} ${summary.allRisks - summary.openRisks === 1 ? 'aceite ou tratado' : 'aceites ou tratados'} · ${risksUnlinkedLabel.toLowerCase()}` },
            { to: `${base}/integracoes`, label: 'Evidências recolhidas', value: evidenceLoading ? '…' : evidenceFailed ? '—' : String(evidenceCount), unit: `de ${ranked.length}`, caption: evidenceLoading ? 'A carregar as evidências' : evidenceFailed ? 'Não foi possível carregar as evidências' : `${provenCount} ${provenCount === 1 ? 'comprovada' : 'comprovadas'}` },
          ].map((m) => {
            const body = (
              <>
                <h3 className="text-sm font-bold text-ink-soft">{m.label}</h3>
                <p className="num mt-1 flex items-baseline gap-1.5"><span className="text-[1.75rem] font-extrabold leading-none tracking-[-0.02em]">{m.value}</span>{m.unit && <span className="text-sm font-bold text-ink-soft">{m.unit}</span>}</p>
                <p className="mt-1.5 text-sm text-ink-soft">{m.caption}</p>
              </>
            )
            return m.to
              ? <Link key={m.label} to={m.to} className="block px-5 py-4 transition-colors hover:bg-paper-soft">{body}</Link>
              : <div key={m.label} className="px-5 py-4">{body}</div>
          })}
        </section>
      )}


      {!pending && !consultant && gaps.length > 0 && (
        <section data-tour="roadmap-gaps" aria-labelledby="lacunas-titulo" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="lacunas-titulo" className="text-lg font-extrabold">O que falta à empresa <span className="font-semibold text-ink-soft">· {gaps.length}</span></h2>
            <p className="text-sm text-ink-soft">Nível de maturidade {summary.maturity ?? '—'} de 5 hoje; o objetivo é {summary.targetMaturity ?? '—'}{summary.targetMaturity ? ` (${MATURITY_LABEL[summary.targetMaturity].toLowerCase()})` : ''}.</p>
          </div>
          <ul className="grid gap-x-8 rounded-[14px] border border-line-soft px-5 md:grid-cols-2">
            {gaps.map((g) => (
              <li key={g.actionId} className="flex flex-col gap-0.5 border-b border-line-soft py-3 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0">
                <span className="font-bold"><GlossaryText>{g.findingTitle}</GlossaryText></span>
                <span className="text-sm text-ink-soft">Fica resolvido com: <GlossaryText>{g.description}</GlossaryText></span>
              </li>
            ))}
          </ul>
        </section>
      )}

       <section aria-labelledby="plan-titulo" className="flex min-w-0 flex-col gap-4">
         <div className="flex flex-col gap-3">
           <h2 id="plan-titulo" className="text-lg font-extrabold">{pending ? 'Roadmap' : validated ? 'Roadmap validado' : 'Roadmap sugerido'}</h2>
           <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
             {consultant && <Segmented<View> ariaLabel="Ordem do roadmap" value={view} onChange={setView} options={[{ value: 'base', label: 'Antes dos riscos' }, { value: 'riscos', label: 'Priorizado pelos riscos' }]} />}
             <p className="text-sm text-ink-soft" aria-live="polite">
               {actions.isPending || (byRisk && risksLoading) ? 'A carregar a ordem do roadmap.' : byRisk ? (risksFailed ? 'Não foi possível carregar os riscos ligados. A mostrar a ordem proposta pela IA.' : linked === 0 ? 'Ainda não há ações ligadas a riscos.' : raised ? `${raised} ${raised === 1 ? 'ação subiu' : 'ações subiram'}${dropped ? `, ${dropped} ${dropped === 1 ? 'desceu' : 'desceram'}` : ''} por causa dos riscos registados.` : 'Nenhuma ação mudou de posição por causa dos riscos registados.') : 'Ordem proposta pela IA, sem ter em conta o registo de riscos.'}
             </p>
           </div>
         </div>

        {!actions.data || !users.data || pending ? (
          <SkeletonRows rows={6} />
        ) : ranked.length === 0 ? (
          <EmptyState title="Ainda não há ações no roadmap">Quando a avaliação identificar lacunas, as ações para as fechar aparecem aqui, ordenadas por prioridade.</EmptyState>
        ) : (
          <>
            <RoadmapMap items={ranked.map((r) => r.action)} />
            <ol data-tour="roadmap-actions" className="flex flex-col gap-2.5" aria-label={consultant ? 'Ações do roadmap por prioridade' : 'O plano da empresa, por ordem de prioridade'}>
              {ranked.map((r) => <ActionRow key={`${view}-${r.action.id}`} item={r} users={users.data} showMovement={byRisk && consultant} consultant={consultant} validated={validated} aiBadge={!allFromAi} />)}
            </ol>
          </>
        )}
      </section>


      <ProposeActionModal open={proposing} onClose={() => setProposing(false)} />

      <Modal open={showHistory} onOpenChange={(o) => !o && setShowHistory(false)} chip={<Chip>Registo de alterações</Chip>} title="Histórico do plano"
        description="Quem propôs, ligou e validou o plano. Nenhum registo pode ser apagado." width={640}>
        {audit.isError ? <ErrorState error={audit.error} onRetry={() => audit.refetch()} /> : !audit.data || !users.data ? <SkeletonRows rows={4} /> : <HistoryList items={roadmapHistory(audit.data, users.data)} />}
      </Modal>

       <ReopenRoadmapModal org={org.id} open={reopening} onClose={() => setReopening(false)} manager={manager} />
       <Modal open={confirm} onOpenChange={setConfirm} chip={<Chip>Decisão da consultora</Chip>} title="Validar o roadmap?"
         description={`${manager ? `O ${manager}` : 'O cliente'} passa a ver o roadmap e o registo de riscos em só leitura, com linguagem simples. Se mudar alguma coisa depois, o cliente vê a alteração e fica registada no histórico.`}
         footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancelar</Button><Button loading={validate.isPending} onClick={() => validate.mutate(undefined, {
           onSuccess: () => { setConfirm(false); toast.show(`Roadmap validado · notificação enviada a ${manager ?? 'o cliente'}`) },
           onError: (e) => toast.show(e.message, 'error'),
         })}>Validar roadmap</Button></>}>
         {(raisedByRisks === 0 || highWithoutAction > 0) && (
           <Note tone="warning" className="mb-3">
             {raisedByRisks === 0 ? 'Nenhuma ação foi priorizada pelos riscos: o cliente vai ver a ordem proposta pela IA.' : `${highWithoutAction} ${highWithoutAction === 1 ? 'risco alto ainda não tem' : 'riscos altos ainda não têm'} ação ligada.`}{' '}
             <Link to={`${base}/riscos`} className="font-bold underline underline-offset-2" onClick={() => setConfirm(false)}>Rever riscos</Link>
           </Note>
         )}
         <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-soft">
           <li>{ranked.length} ações, {raisedByRisks} priorizadas pelos riscos</li>
           {summary.risksUnlinked > 0 && <li className="font-bold text-risk-medium-ink">{risksUnlinkedLabel}: o cliente vê-{summary.risksUnlinked === 1 ? 'o' : 'os'} sem plano de tratamento</li>}
           <li>As etiquetas "Proposta pela IA · por validar" desaparecem do plano</li>
         </ul>
       </Modal>
    </>
  )
}

function ActionRow({ item, users, showMovement, consultant, validated, aiBadge }: { item: PrioritizedAction<RemediationAction>; users: User[]; showMovement: boolean; consultant: boolean; validated: boolean | undefined; aiBadge: boolean }) {
  const { action: a, rank, baseRank, topRisk, reason } = item
  const moved = showMovement ? baseRank - rank : 0
  const rose = moved > 0
  const fell = moved < 0
  const owner = users.find((u) => u.id === a.assignedTo)
  return (
    <li id={`acao-${a.id}`} tabIndex={-1} className={cn('flex scroll-mt-14 gap-4 rounded-[16px] border bg-paper px-5 py-4 animate-pop-in max-md:flex-col max-md:gap-3 md:scroll-mt-0', reason ? 'border-brand/40' : 'border-line-soft')}>
      <div className="flex shrink-0 items-start gap-2">
        <span className="grid size-9 place-items-center rounded-[10px] bg-paper-soft text-sm font-extrabold text-ink-soft"><span className="sr-only">Prioridade </span>{rank}</span>
        {(rose || fell) && (
          <span className="mt-0.5 flex flex-col text-xs font-bold leading-tight">
            <span className={cn('inline-flex items-center', rose ? 'text-brand' : 'text-muted')} aria-hidden>
              {rose ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}{Math.abs(moved)}
            </span>
            <span className="font-semibold text-muted line-through" aria-hidden>era #{baseRank}</span>
            <span className="sr-only">{rose ? `Subiu ${moved} posições: era a ${baseRank}.ª` : `Desceu ${-moved} posições: era a ${baseRank}.ª`}</span>
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-bold"><GlossaryText>{a.description}</GlossaryText></h3>
          <div className="flex flex-wrap gap-1.5">
            {topRisk && <RiskLevelBadge level={topRisk.level} prefix="Risco " />}
            <Chip tone={a.status === 'concluida' ? 'dark' : a.status === 'em_curso' ? 'signal' : 'neutral'} icon={a.status === 'concluida' ? <CheckCircle2 className="size-3.5" aria-hidden /> : undefined}>{ACTION_STATUS_LABEL[a.status]}</Chip>
          </div>
        </div>
        {consultant ? (
          <p className="mt-1 text-sm text-ink-soft">{a.legalObligation}</p>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">{a.plainLanguage ?? a.findingTitle}</p>
        )}
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <div><dt className="inline">Prazo: </dt><dd className="inline font-semibold text-ink-soft">{a.dueDate ? shortDate(a.dueDate) : '—'}</dd></div>
          <div><dt className="inline">Responsável: </dt><dd className="inline font-semibold text-ink-soft">{owner?.name ?? 'Por atribuir'}</dd></div>
          <div><dt className="inline">Evidência: </dt><dd className="inline font-semibold text-ink-soft">{a.requiredEvidence}</dd></div>
          {consultant && <div><dt className="inline">Origem: </dt><dd className="inline font-semibold text-ink-soft">{a.controlCode} · {a.findingTitle}</dd></div>}
        </dl>
        {reason && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] bg-signal-soft px-2.5 py-1.5 text-sm font-semibold text-brand">
            <Grid3x3 className="size-4" aria-hidden />{consultant ? reason : `Esta ação está ligada a um risco: ${topRisk?.plainLabel ?? topRisk?.riskLabel}`}
          </p>
        )}

        {aiBadge && a.aiOutputId && !validated && <div className="mt-2"><AIBadge /></div>}
        {a.proposedBy && <div className="mt-2"><Chip tone="outline">Proposta pela consultora</Chip></div>}
      </div>
    </li>
  )
}
