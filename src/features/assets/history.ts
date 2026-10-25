import type { AuditEntry, User } from '../../api/contracts'
import type { HistoryItem } from '../../ui'

export function toHistory(entries: AuditEntry[], users: User[]): HistoryItem[] {
  return entries.map((e) => {
    const u = users.find((x) => x.id === e.userId)
    return { id: e.id, who: u ? { name: u.name, initials: u.initials } : null, actorType: e.actorType, summary: e.summary, createdAt: e.createdAt }
  })
}
