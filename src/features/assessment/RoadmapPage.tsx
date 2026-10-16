import { useState } from 'react'
import { ArrowUp, CheckCircle2, ShieldAlert } from 'lucide-react'
import type { RemediationAction, User } from '../../api/contracts'
import { useActions, useRoadmapStatus, useUsers, useValidateRoadmap } from '../../api/queries'
import { ACTION_STATUS_LABEL, dateTime, shortDate } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import {
  AIBadge, Button, Chip, ErrorState, Modal, Note, PageHeader, RiskLevelBadge, Segmented, SkeletonRows, cn, useToast,
} from '../../ui'
import { prioritizeRoadmap, type PrioritizedAction, type RiskSignal } from './prioritizeRoadmap'

type View = 'base' | 'riscos'

/** Avaliação e roadmap (mínimo do plugin Avaliação): mostra o efeito dos riscos na prioridade. */
export function RoadmapPage({ signals }: { signals: RiskSignal[] }) {
  const org = useTenant()
  const can = useCan()
  const toast = useToast()
  const actions = useActions(org.id)
  const users = useUsers(org.id)
  const status = useRoadmapStatus(org.id)
  const validate = useValidateRoadmap(org.id)
  const [view, setView] = useState<View>('riscos')
  const [confirm, setConfirm] = useState(false)

  if (actions.isError) return <ErrorState error={actions.error} onRetry={() => actions.refetch()} />
  const ranked = actions.data ? prioritizeRoadmap(actions.data, view === 'riscos' ? signals : []) : []
  const raised = ranked.filter((r) => r.reason).length
  const validated = status.data?.validated

  return (
    <>
      <PageHeader
        eyebrow={org.name}
        title="Avaliação e roadmap"
        subtitle="Ações para fechar as lacunas da avaliação NIS2 + RGPD, ordenadas por prioridade."
        actions={can('validate', 'roadmap') && !validated && <Button icon={<CheckCircle2 className="size-4" aria-hidden />} onClick={() => setConfirm(true)}>Validar roadmap</Button>}
      />

      {validated ? (
        <Note>Roadmap validado por Marta Ferreira{status.data?.validatedAt ? ` a ${dateTime(status.data.validatedAt)}` : ''}. O cliente vê as ações e os riscos em só leitura.</Note>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line-soft bg-paper-soft px-4 py-3">
          <Chip tone="signal">Avaliação concluída · 14 out.</Chip>
          <span className="text-[13px] text-ink-soft">O roadmap foi proposto pela IA a partir das lacunas. A prioridade final é decidida pela consultora.</span>
          <span className="ml-auto"><AIBadge /></span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<View> ariaLabel="Ordem do roadmap" value={view} onChange={setView} options={[{ value: 'base', label: 'Antes dos riscos' }, { value: 'riscos', label: 'Priorizado pelos riscos' }]} />
        <p className="text-[13px] text-ink-soft" aria-live="polite">
          {view === 'riscos' ? (raised ? `${raised} ${raised === 1 ? 'ação subiu' : 'ações subiram'} por estarem ligadas a riscos.` : 'Ainda não há ações ligadas a riscos.') : 'Ordem proposta pela IA, sem ter em conta o registo de riscos.'}
        </p>
      </div>

      {!actions.data || !users.data ? <SkeletonRows rows={6} /> : (
        <ol className="flex flex-col gap-2.5" aria-label="Ações do roadmap por prioridade">
          {ranked.map((r) => <ActionRow key={`${view}-${r.action.id}`} item={r} users={users.data} showMovement={view === 'riscos'} />)}
        </ol>
      )}

      <Modal open={confirm} onOpenChange={setConfirm} chip={<Chip>Decisão da consultora</Chip>} title="Validar o roadmap?"
        description="O Rui Santos passa a ver o roadmap e o registo de riscos (em só leitura, com linguagem simples). Pode continuar a editar depois."
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancelar</Button><Button loading={validate.isPending} onClick={() => validate.mutate(undefined, {
          onSuccess: () => { setConfirm(false); toast.show('Roadmap validado · o Rui foi notificado') },
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

function ActionRow({ item, users, showMovement }: { item: PrioritizedAction<RemediationAction>; users: User[]; showMovement: boolean }) {
  const { action: a, rank, baseRank, topRisk, reason } = item
  const moved = showMovement ? baseRank - rank : 0
  const owner = users.find((u) => u.id === a.assignedTo)
  const { data: status } = useRoadmapStatus(a.organizationId)
  return (
    <li className={cn('flex gap-4 rounded-[16px] border bg-paper px-5 py-4 animate-pop-in max-md:flex-col max-md:gap-3', reason ? 'border-brand/40 shadow-[0_2px_12px_rgba(11,79,74,0.08)]' : 'border-line-soft')}>
      <div className="flex shrink-0 items-start gap-2">
        <span className={cn('grid size-9 place-items-center rounded-[10px] text-[15px] font-extrabold', reason ? 'bg-brand text-white' : 'bg-paper-soft text-ink-soft')} aria-label={`Prioridade ${rank}`}>{rank}</span>
        {moved > 0 && <span className="mt-2 inline-flex items-center text-[12px] font-bold text-signal" aria-label={`Subiu ${moved} posições`}><ArrowUp className="size-3.5" aria-hidden />{moved}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold">{a.description}</h3>
          <div className="flex flex-wrap gap-1.5">
            {topRisk && <RiskLevelBadge level={topRisk.level} prefix="Risco " />}
            <Chip tone={a.status === 'em_curso' ? 'signal' : 'neutral'}>{ACTION_STATUS_LABEL[a.status]}</Chip>
          </div>
        </div>
        <p className="mt-1 text-[13px] text-ink-soft">{a.legalObligation}</p>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
          <div><dt className="inline">Prazo: </dt><dd className="inline font-semibold text-ink-soft">{a.dueDate ? shortDate(a.dueDate) : '—'}</dd></div>
          <div><dt className="inline">Responsável: </dt><dd className="inline font-semibold text-ink-soft">{owner?.name ?? 'Por atribuir'}</dd></div>
          <div><dt className="inline">Evidência: </dt><dd className="inline font-semibold text-ink-soft">{a.requiredEvidence}</dd></div>
          <div><dt className="inline">Origem: </dt><dd className="inline font-semibold text-ink-soft">{a.controlCode} · {a.findingTitle}</dd></div>
        </dl>
        {reason && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] bg-signal-soft px-2.5 py-1.5 text-[13px] font-semibold text-brand">
            <ShieldAlert className="size-4" aria-hidden />{reason}
          </p>
        )}
        {a.aiOutputId && !status?.validated && <div className="mt-2"><AIBadge /></div>}
        {a.proposedBy && <div className="mt-2"><Chip tone="outline">Proposta pela consultora</Chip></div>}
      </div>
    </li>
  )
}
