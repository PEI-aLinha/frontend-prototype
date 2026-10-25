import type { CollectedEvidence } from '../../api/contracts'

export type EvidenceTone = 'brand' | 'risk'

export interface EvidenceState {
  tone: EvidenceTone
  label: string
  detail: string
}

/**
 * State of an action's evidence (RF17), or null when nothing has been collected, because a row with
 * no check and no badge already reads as not started. The report's other two states, submetida and
 * aceite, need the submission workflow of RF15/RF16, which the prototype does not have.
 */
export function evidenceState(evidence: readonly CollectedEvidence[]): EvidenceState | null {
  if (!evidence.length) return null
  // An action can have more than one check; a failing one is what the manager has to act on.
  const worst = evidence.find((e) => !e.ok) ?? evidence[0]
  return { tone: worst.ok ? 'brand' : 'risk', label: worst.ok ? 'Estado: comprovada' : 'Estado: não comprovada', detail: worst.result }
}