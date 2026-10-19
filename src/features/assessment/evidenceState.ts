import type { CollectedEvidence } from '../../api/contracts'

export type EvidenceTone = 'neutral' | 'brand' | 'risk'

export interface EvidenceState {
  tone: EvidenceTone
  label: string
  detail: string | null
}

/**
 * State of an action's evidence (RF17). An action without collected evidence is in falta: that is the
 * default. With evidence, the boolean `ok` says whether the check passed. The report's four states
 * are em falta, submetida, aceite and rejeitada; the last two need the submission workflow of
 * RF15/RF16, which the prototype does not have, so only the check outcome is reported.
 */
export function evidenceState(evidence: readonly CollectedEvidence[]): EvidenceState {
  // An action can have more than one check; a failing one is what the manager has to act on.
  const worst = evidence.find((e) => !e.ok) ?? evidence[0]
  if (!worst) return { tone: 'neutral', label: 'Estado: em falta', detail: null }
  return { tone: worst.ok ? 'brand' : 'risk', label: worst.ok ? 'Estado: comprovada' : 'Estado: não comprovada', detail: worst.result }
}