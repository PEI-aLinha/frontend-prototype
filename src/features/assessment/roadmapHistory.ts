import type { AuditEntry, User } from '../../api/contracts'
import type { HistoryItem } from '../../ui'

/** The entries that explain how the plan came to be: the proposal, the validation, the risks behind it. */
const RELEVANT = new Set<AuditEntry['entityType']>(['roadmap', 'remediation_action', 'risk_action', 'risk'])

const CONTEXT: Partial<Record<AuditEntry['entityType'], string>> = {
  roadmap: 'Roadmap',
  remediation_action: 'Roadmap',
  risk_action: 'Riscos ↔ roadmap',
  risk: 'Riscos',
}

/** The plan's own story (RF14/RF27), as a history list. Pure: same entries, same items. */
export function roadmapHistory(entries: AuditEntry[], users: User[]): HistoryItem[] {
  return entries.filter((e) => RELEVANT.has(e.entityType)).map((e) => {
    const u = users.find((x) => x.id === e.userId)
    return { id: e.id, who: u ? { name: u.name, initials: u.initials } : null, actorType: e.actorType, summary: e.summary, createdAt: e.createdAt, context: CONTEXT[e.entityType] }
  })
}