import { useAudit, useUsers } from '../../api/queries'
import { useTenant } from '../../core/tenant'
import { ErrorState, HistoryList, PageHeader, SkeletonRows } from '../../ui'

const CONTEXT: Record<string, string> = { asset: 'Ativos', critical_service: 'Serviços críticos', risk: 'Riscos', risk_action: 'Riscos ↔ roadmap', task: 'Tarefas', remediation_action: 'Roadmap', roadmap: 'Roadmap', comment: 'Comentários' }

/** Histórico de alterações da organização (RF29): quem, quando, o quê. */
export function HistoryPage() {
  const org = useTenant()
  const audit = useAudit(org.id)
  const users = useUsers(org.id)
  return (
    <>
      <PageHeader eyebrow={org.name} title="Histórico" subtitle="Todas as alterações ficam registadas e não podem ser apagadas." />
      {audit.isError ? <ErrorState error={audit.error} onRetry={() => audit.refetch()} /> : !audit.data || !users.data ? <SkeletonRows rows={8} /> : (
        <div className="max-w-[760px]">
          <HistoryList items={audit.data.map((e) => {
            const u = users.data.find((x) => x.id === e.userId)
            return { id: e.id, who: u ? { name: u.name, initials: u.initials } : null, actorType: e.actorType, summary: e.summary, createdAt: e.createdAt, context: CONTEXT[e.entityType] }
          })} />
        </div>
      )}
    </>
  )
}
