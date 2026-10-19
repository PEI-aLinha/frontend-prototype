import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowUp, CheckCircle2, Download, Plus, ShieldAlert } from 'lucide-react'
import type { CollectedEvidence, Id, RemediationAction, User } from '../../api/contracts'
import { useActions, useAssessment, useAudit, useEvidence, useRiskLinks, useRisks, useRoadmapStatus, useUsers, useValidateRoadmap } from '../../api/queries'
import { ACTION_STATUS_LABEL, dateTime, MATURITY_LABEL, shortDate } from '../../config/labels'
import { useSession } from '../../core/session'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import {
  AIBadge, Button, Chip, EmptyState, ErrorState, Explainer, HistoryList, Modal, Note, StatCard, Term, PageHeader, RiskLevelBadge, Segmented, SkeletonRows, cn, useToast,
} from '../../ui'
import { evidenceState, type EvidenceTone } from './evidenceState'
import { printResults } from './exportResults'
import { PREVIEW_ROWS, planSummary } from './planSummary'
import { ProposeActionModal } from './ProposeActionModal'
import { prioritizeRoadmap, type PrioritizedAction, type RiskSignal } from './prioritizeRoadmap'
import { roadmapHistory } from './roadmapHistory'

type View = 'base' | 'riscos'

const NO_EVIDENCE: CollectedEvidence[] = []

const EVIDENCE_TONE: Record<EvidenceTone, string> = {
  brand: 'bg-signal-soft text-brand',
  risk: 'bg-risk-high text-risk-high-ink',
}

interface MiniRow { key: string; label: string; meta?: ReactNode }

/** Three rows of preview inside a StatCard, then how many the card left out. */
function MiniList({ label, rows, more }: { label: string; rows: MiniRow[]; more?: number }) {
  if (!rows.length) return <p className="text-[13px] text-muted">Nada a mostrar aqui.</p>
  return (
    <>
      <ul aria-label={label} className="flex flex-col">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline gap-2 border-t border-line-soft py-1.5 text-[13px]">
            <span className="line-clamp-1 min-w-0 flex-1">{r.label}</span>
            {r.meta && <span className="shrink-0 text-[12px] font-semibold text-muted">{r.meta}</span>}
          </li>
        ))}
      </ul>
      {more ? <p className="border-t border-line-soft pt-1.5 text-[12px] font-semibold text-muted">+{more}</p> : null}
    </>
  )
}

/** Assessment and roadmap (minimal Assessment plugin): shows the effect of risks on priority. */
export function RoadmapPage({ signals }: { signals: RiskSignal[] }) {
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
  const [view, setView] = useState<View>('riscos')
  const [confirm, setConfirm] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const planTitle = useRef<HTMLHeadingElement>(null)
  // The card jumps to the plan it summarises, and leaves the keyboard on the section title.
  const jumpToPlan = () => {
    const h = planTitle.current
    if (!h) return
    h.scrollIntoView({ block: 'start' })
    h.focus({ preventScroll: true })
  }
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

  if (actions.isError || status.isError) {
    return <ErrorState error={actions.error ?? status.error} onRetry={() => { actions.refetch(); status.refetch() }} />
  }
  // Only the risk-prioritized order moves anything; the base order is the AI's proposal as-is.
  const byRisk = view === 'riscos'
  const ranked = actions.data ? prioritizeRoadmap(actions.data, byRisk ? signals : []) : []
  const raised = ranked.filter((r) => r.reason).length
  // An action only falls when a risk-linked one passes it, so every fall has a cause worth naming.
  const dropped = byRisk ? ranked.filter((r) => r.rank > r.baseRank).length : 0
  const validated = status.data?.validated
  // Until the status resolves, `validated` is undefined and the page would claim the roadmap is not validated yet.
  const pending = status.isPending
  // The mock stores ids, so both people are resolved from the directory the page already loads.
  const validator = users.data?.find((u) => u.id === status.data?.validatedBy)?.name
  // Whoever registered the company is its designated manager.
  const manager = users.data?.find((u) => u.id === org.registeredBy)?.name
  const { sectionTotal, answered } = summary.sections.reduce(
    (acc, s) => ({ sectionTotal: acc.sectionTotal + s.total, answered: acc.answered + s.answered }),
    { sectionTotal: 0, answered: 0 },
  )
  // Each action carries at most one useful verdict, so counting the rows is enough.
  const evidenceRows = ranked.map((r) => evidenceState(evidenceByAction.get(r.action.id) ?? NO_EVIDENCE))
  const evidenceCount = evidenceRows.filter(Boolean).length
  const provenCount = evidenceRows.filter((e) => e?.tone === 'brand').length
  const soonest = summary.deadlines[0]
  const levelCard = assessment.data
    ? <StatCard label="Nível de maturidade" value={`${summary.maturity ?? '—'} → ${summary.targetMaturity ?? '—'} de 5`} caption={`${MATURITY_LABEL[summary.targetMaturity ?? 2]} · ${answered} de ${sectionTotal} perguntas respondidas`}>
      <MiniList label="Secções com menos respostas" rows={summary.topSections.map((s) => ({ key: s.id, label: s.name, meta: `${s.answered}/${s.total}` }))} more={Math.max(0, summary.sections.length - PREVIEW_ROWS)} />
    </StatCard>
    : <StatCard label="Nível de maturidade" value="—" caption="A carregar a avaliação" />

  const riskRows = summary.topRisks.map(({ risk, level }) => ({
    key: risk.id,
    // The client reads the consequence, the consultant the threat, as in the risk register.
    label: consultant ? risk.threat : risk.plainLanguage ?? risk.threat,
    meta: <RiskLevelBadge level={level} />,
  }))
  const unproven = ranked.filter((r) => evidenceState(evidenceByAction.get(r.action.id) ?? NO_EVIDENCE)?.tone !== 'brand')
  const proofRows = unproven.slice(0, PREVIEW_ROWS).map((r) => ({
    key: r.action.id,
    label: r.action.description,
    meta: evidenceState(evidenceByAction.get(r.action.id) ?? NO_EVIDENCE)?.tone === 'risk' ? 'não comprovada' : 'sem prova',
  }))
  const planRows = ranked.slice(0, PREVIEW_ROWS).map((r) => ({ key: r.action.id, label: r.action.description, meta: r.action.dueDate ? shortDate(r.action.dueDate) : undefined }))

  return (
    <>
      <PageHeader
        eyebrow={org.name}
        title="Resultados e roadmap"
        subtitle="Ações para fechar as lacunas da avaliação NIS2 + RGPD, ordenadas por prioridade."
        actions={<>
          {!pending && ranked.length > 0 && <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={() => printResults(org.name, summary, { ranked, users: users.data ?? [], evidence: evidenceByAction, risks: risks.data ?? [] }, byRisk ? 'priorizado pelos riscos' : 'ordem proposta pela IA')}>Exportar</Button>}
          {can('create', 'roadmap') && <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setProposing(true)}>Propor ação</Button>}
          {can('view', 'history') && <Button variant="link" onClick={() => setShowHistory(true)}>Histórico</Button>}
          {!pending && can('validate', 'roadmap') && !validated && <Button icon={<CheckCircle2 className="size-4" aria-hidden />} onClick={() => setConfirm(true)}>Validar roadmap</Button>}
        </>}
      />

      {pending ? null : validated ? (
        <Note>Roadmap validado {validator ? `por ${validator}` : 'pela consultora'}{status.data?.validatedAt ? ` a ${dateTime(status.data.validatedAt)}` : ''}. {consultant ? 'O cliente vê as ações e os riscos em só leitura.' : 'Pode ver as ações e os riscos, mas não os pode alterar.'}</Note>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line-soft bg-paper-soft px-4 py-3">
          <Chip tone="signal">Avaliação concluída · 14 out.</Chip>
          <span className="text-[13px] text-ink-soft">O roadmap foi proposto pela IA a partir das lacunas. A prioridade final é decidida pela consultora.</span>
          <span className="ml-auto"><AIBadge /></span>
        </div>
      )}

      {consultant ? (
        <Explainer id="roadmap-consultant" title="Como os riscos mudam o roadmap"
          intro="A IA propôs uma ordem a partir das lacunas da avaliação. O registo de riscos acrescenta o que é mais grave para esta empresa em concreto."
          steps={[
            { title: 'Antes dos riscos', text: 'Ordem proposta pela IA, só com base nas lacunas e nas obrigações legais.' },
            { title: 'Priorizado pelos riscos', text: <>As ações ligadas a <Term k="risco">riscos</Term> altos sobem para o topo; depois as ligadas a médios. Cada uma mostra porque subiu.</> },
            { title: 'A consultora decide', text: 'Nada muda sozinho para o cliente: só depois de "Validar roadmap" o cliente vê o plano e os riscos.' },
          ]} />
      ) : (
        <Explainer id="roadmap-client" title="Como ler esta página"
          intro="Esta é a lista de ações que a empresa pode tomar para fechar as lacunas que a avaliação encontrou. A consultora validou-a."
          steps={[
            { title: 'A ordem', text: 'As ações estão ordenadas pela importância para a empresa. As que estão ligadas a riscos registados vêm primeiro.' },
            { title: 'Cada ação', text: 'Diz o que falta fazer, até quando e quem fica responsável. A prova é o documento que mostra que já está feito.' },
            { title: 'A consultora', text: 'Ela validou este plano e os riscos por trás dele. Se algo não estiver certo, fale com ela.' },
          ]} />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Only the client has an assessment route under /org; the consultant's prefix has none, so hers stays a card. */}
        {!consultant ? <Link to={`${base}/avaliacao`} className="contents">{levelCard}</Link> : levelCard}
        <Link to={`${base}/riscos`} className="contents">
          <StatCard label="Por resolver" value={`${summary.risksUnlinked} ${summary.risksUnlinked === 1 ? 'risco sem ação' : 'riscos sem ação'}`} caption={`${summary.actionsOpen} ${summary.actionsOpen === 1 ? 'ação por resolver' : 'ações por resolver'}, ${summary.actionsDone === 0 ? 'nenhuma concluída' : `${summary.actionsDone} ${summary.actionsDone === 1 ? 'concluída' : 'concluídas'}`}`}>
            <MiniList label="Riscos mais graves" rows={riskRows} more={Math.max(0, summary.openRisks - PREVIEW_ROWS)} />
          </StatCard>
        </Link>
        <Link to={`${base}/integracoes`} className="contents">
          <StatCard label="Evidências" value={`${evidenceCount} de ${summary.actionsOpen + summary.actionsDone} recolhidas`} caption={`${provenCount} comprovadas, ${evidenceCount - provenCount} por resolver`}>
            <MiniList label="Ações com a prova por resolver" rows={proofRows} more={Math.max(0, unproven.length - PREVIEW_ROWS)} />
          </StatCard>
        </Link>
        {/* It summarises the plan on the same page, so it jumps there instead of to another route. */}
        <StatCard onClick={jumpToPlan} label="Roadmap" value={`${ranked.length} ${ranked.length === 1 ? 'ação' : 'ações'}`} caption={byRisk ? 'Priorizadas pelos riscos' : 'Ordenadas pela IA'}>
          <MiniList label="Primeiras ações do plano" rows={planRows} more={Math.max(0, ranked.length - PREVIEW_ROWS)} />
        </StatCard>
      </div>

      <section aria-labelledby="plan-titulo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            {/* tabIndex lets the card above hand the keyboard to this heading; scroll-mt clears the fixed mobile header. */}
            <h2 id="plan-titulo" ref={planTitle} tabIndex={-1} className="scroll-mt-14 text-[18px] font-extrabold md:scroll-mt-0">{validated ? 'Roadmap validado' : 'Roadmap sugerido'}</h2>
            {soonest && <p className="text-[13px] text-ink-soft">Próximo prazo: {shortDate(soonest.dueDate)} · {soonest.description}.</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Segmented<View> ariaLabel="Ordem do roadmap" value={view} onChange={setView} options={[{ value: 'base', label: 'Antes dos riscos' }, { value: 'riscos', label: 'Priorizado pelos riscos' }]} />
            <p className="text-[13px] text-ink-soft" aria-live="polite">
              {byRisk ? (raised ? `${raised} ${raised === 1 ? 'ação subiu' : 'ações subiram'}${dropped ? `, ${dropped} ${dropped === 1 ? 'desceu' : 'desceram'}` : ''} por causa dos riscos registados.` : 'Ainda não há ações ligadas a riscos.') : 'Ordem proposta pela IA, sem ter em conta o registo de riscos.'}
            </p>
          </div>
        </div>

        {!actions.data || !users.data || pending ? (
          <SkeletonRows rows={6} />
        ) : ranked.length === 0 ? (
          <EmptyState title="Ainda não há ações no roadmap">Quando a avaliação identificar lacunas, as ações para as fechar aparecem aqui, ordenadas por prioridade.</EmptyState>
        ) : (
          <ol className="flex flex-col gap-2.5" aria-label={consultant ? 'Ações do roadmap por prioridade' : 'O plano da empresa, por ordem de prioridade'}>
            {ranked.map((r) => <ActionRow key={`${view}-${r.action.id}`} item={r} users={users.data} showMovement={byRisk} consultant={consultant} validated={validated} evidence={evidenceByAction.get(r.action.id) ?? NO_EVIDENCE} />)}
          </ol>
        )}
      </section>

      <ProposeActionModal open={proposing} onClose={() => setProposing(false)} />

      <Modal open={showHistory} onOpenChange={(o) => !o && setShowHistory(false)} chip={<Chip>Registo de alterações</Chip>} title="Histórico do plano"
        description="Quem propôs, ligou e validou o plano. Nenhum registo pode ser apagado." width={640}>
        {!audit.data || !users.data ? <SkeletonRows rows={4} /> : <HistoryList items={roadmapHistory(audit.data, users.data)} />}
      </Modal>

      <Modal open={confirm} onOpenChange={setConfirm} chip={<Chip>Decisão da consultora</Chip>} title="Validar o roadmap?"
        description={`${manager ? `O ${manager}` : 'O cliente'} passa a ver o roadmap e o registo de riscos (em só leitura, com linguagem simples). Pode continuar a editar depois.`}
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancelar</Button><Button loading={validate.isPending} onClick={() => validate.mutate(undefined, {
          onSuccess: () => { setConfirm(false); toast.show(`Roadmap validado · ${manager ? `o ${manager.split(' ')[0]}` : 'o cliente'} foi notificado`) },
          onError: (e) => toast.show(e.message, 'error'),
        })}>Validar roadmap</Button></>}>
        <ul className="flex flex-col gap-1.5 text-[14px] text-ink-soft">
          <li>• {ranked.length} ações, {raised} priorizadas pelos riscos</li>
          <li>• As etiquetas "Proposta pela IA" passam a "Validada pela consultora"</li>
        </ul>
      </Modal>
    </>
  )
}

function ActionRow({ item, users, showMovement, consultant, validated, evidence }: { item: PrioritizedAction<RemediationAction>; users: User[]; showMovement: boolean; consultant: boolean; validated: boolean | undefined; evidence: CollectedEvidence[] }) {
  const { action: a, rank, baseRank, topRisk, reason } = item
  const moved = showMovement ? baseRank - rank : 0
  const rose = moved > 0
  const fell = moved < 0
  const owner = users.find((u) => u.id === a.assignedTo)
  const ev = evidenceState(evidence)
  return (
    <li className={cn('flex gap-4 rounded-[16px] border bg-paper px-5 py-4 animate-pop-in max-md:flex-col max-md:gap-3', reason ? 'border-brand/40 shadow-[0_2px_12px_rgba(11,79,74,0.08)]' : 'border-line-soft')}>
      <div className="flex shrink-0 items-start gap-2">
        <span className={cn('grid size-9 place-items-center rounded-[10px] text-[15px] font-extrabold', reason ? 'bg-brand text-white' : 'bg-paper-soft text-ink-soft')} aria-label={`Prioridade ${rank}`}>{rank}</span>
        {(rose || fell) && (
          <span className={cn('mt-0.5 flex flex-col text-[11px] font-bold leading-tight', rose ? 'text-brand' : 'text-muted')} aria-label={rose ? `Subiu ${moved} posições: era a ${baseRank}.ª` : `Desceu ${-moved} posições: era a ${baseRank}.ª`}>
            <span className="inline-flex items-center">{rose ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}{Math.abs(moved)}</span>
            <span className="font-semibold text-muted line-through">era #{baseRank}</span>
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold">{a.description}</h3>
          <div className="flex flex-wrap gap-1.5">
            {topRisk && <RiskLevelBadge level={topRisk.level} prefix="Risco " />}
            <Chip tone={a.status === 'em_curso' ? 'signal' : 'neutral'}>{ACTION_STATUS_LABEL[a.status]}</Chip>
          </div>
        </div>
        {consultant ? (
          <p className="mt-1 text-[13px] text-ink-soft">{a.legalObligation}</p>
        ) : (
          <p className="mt-1 text-[13px] text-ink-soft">{a.plainLanguage ?? a.findingTitle}</p>
        )}
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
          <div><dt className="inline">Prazo: </dt><dd className="inline font-semibold text-ink-soft">{a.dueDate ? shortDate(a.dueDate) : '—'}</dd></div>
          <div><dt className="inline">Responsável: </dt><dd className="inline font-semibold text-ink-soft">{owner?.name ?? 'Por atribuir'}</dd></div>
          <div><dt className="inline">Evidência: </dt><dd className="inline font-semibold text-ink-soft">{a.requiredEvidence}</dd></div>
          {consultant && <div><dt className="inline">Origem: </dt><dd className="inline font-semibold text-ink-soft">{a.controlCode} · {a.findingTitle}</dd></div>}
        </dl>
        {reason && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] bg-signal-soft px-2.5 py-1.5 text-[13px] font-semibold text-brand">
            <ShieldAlert className="size-4" aria-hidden />{consultant ? reason : `Esta ação está ligada a um risco: ${topRisk?.riskLabel}`}
          </p>
        )}
        {fell && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] bg-paper-soft px-2.5 py-1.5 text-[13px] font-semibold text-ink-soft">
            <ArrowDown className="size-4" aria-hidden />Desceu porque outras ações ligadas a riscos subiram.
          </p>
        )}
        {ev && (
          <p className={cn('mt-2.5 inline-flex flex-wrap items-center gap-x-2 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold', EVIDENCE_TONE[ev.tone])}>
            {ev.label}<span className="font-normal text-ink-soft">{ev.detail}</span>
          </p>
        )}
        {a.aiOutputId && !validated && <div className="mt-2"><AIBadge /></div>}
        {a.aiOutputId && validated && <div className="mt-2"><Chip tone="outline">Validada pela consultora</Chip></div>}
        {a.proposedBy && <div className="mt-2"><Chip tone="outline">Proposta pela consultora</Chip></div>}
      </div>
    </li>
  )
}
