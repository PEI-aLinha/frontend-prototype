import type { Id, Level } from '../../api/contracts'

/** Risk signal received from the Risks and Assets plugin, by action ID only (contract). */
export interface RiskSignal {
  actionId: Id
  level: Level
  riskLabel: string
}

export interface PrioritizedAction<T extends { id: Id; priority: number }> {
  action: T
  rank: number
  baseRank: number
  topRisk: RiskSignal | null
  /** E.g. "Prioridade aumentada pelo risco: Ransomware no servidor de produção". */
  reason: string | null
}

const WEIGHT: Record<Level, number> = { baixo: 1, medio: 2, alto: 3 }

function byBase<T extends { id: Id; priority: number }>(a: T, b: T): number {
  return a.priority - b.priority || a.id.localeCompare(b.id)
}

/**
 * Reorders the roadmap by actual risks (RF36): first the actions linked to the highest risks,
 * then by base priority. Pure, deterministic function.
 */
export function prioritizeRoadmap<T extends { id: Id; priority: number }>(actions: readonly T[], signals: readonly RiskSignal[]): PrioritizedAction<T>[] {
  const base = [...actions].sort(byBase)
  const baseRank = new Map(base.map((a, i) => [a.id, i + 1]))

  const top = new Map<Id, RiskSignal>()
  for (const s of signals) {
    const current = top.get(s.actionId)
    if (!current || WEIGHT[s.level] > WEIGHT[current.level]) top.set(s.actionId, s)
  }
  const weight = (a: T) => (top.has(a.id) ? WEIGHT[top.get(a.id)!.level] : 0)

  return [...base]
    .sort((a, b) => weight(b) - weight(a) || byBase(a, b))
    .map((action, i) => {
      const rank = i + 1
      const previous = baseRank.get(action.id)!
      const topRisk = top.get(action.id) ?? null
      const reason = topRisk && rank < previous ? `Prioridade aumentada pelo risco: ${topRisk.riskLabel}` : null
      return { action, rank, baseRank: previous, topRisk, reason }
    })
}
