import type { Id, Level } from '../../api/contracts'

/** Sinal de risco recebido do plugin Riscos e Ativos, só por ID de ação (contrato). */
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
  /** Ex.: "Prioridade aumentada pelo risco: Ransomware no servidor de produção". */
  reason: string | null
}

const WEIGHT: Record<Level, number> = { baixo: 1, medio: 2, alto: 3 }

function byBase<T extends { id: Id; priority: number }>(a: T, b: T): number {
  return a.priority - b.priority || a.id.localeCompare(b.id)
}

/**
 * Reordena o roadmap pelos riscos reais (RF36): primeiro as ações ligadas aos riscos mais altos,
 * depois a prioridade de base. Função pura e determinística.
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
