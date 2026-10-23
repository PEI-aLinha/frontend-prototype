import type { AssessmentSummary, Id, RemediationAction, Risk, RiskActionLink } from '../../api/contracts'
import type { Level } from '../../config/riskMatrix'
import { computeRiskLevel } from '../assets/risk/computeRiskLevel'
import type { PrioritizedAction } from './prioritizeRoadmap'

export interface PlanSection { id: string; name: string; answered: number; total: number }

export interface PlanRisk { risk: Risk; level: Level }

export interface PlanGap {
  actionId: Id
  findingId: Id
  findingTitle: string
  controlCode: string
  description: string
  legalObligation: string
}

/** How many rows each card preview shows before it says how many it left out. */
export const PREVIEW_ROWS = 3

export interface PlanSummary {
  maturity: number | null
  /** Null while the assessment has not loaded, like maturity. */
  targetMaturity: number | null
  sections: PlanSection[]
  /** The weakest sections first, cut to PREVIEW_ROWS. These are what is holding maturity down. */
  topSections: PlanSection[]
  /** Open risks (por_tratar or em_tratamento), worst first, cut to PREVIEW_ROWS. */
  topRisks: PlanRisk[]
  /** Open risks before the cut, so a card can say how many it left out. */
  openRisks: number
  /** status !== 'concluida' */
  actionsOpen: number
  /** status === 'concluida' */
  actionsDone: number
  /** Risks that still need an action (por tratar/em tratamento) and have no RiskActionLink row. */
  risksUnlinked: number
}

/**
 * What the manager needs to read the plan (RF10/US15: level, target and gaps; RF27/US25: coverage
 * and gaps). Pure and deterministic: same inputs, same summary.
 */
export function planSummary(input: {
  actions: readonly RemediationAction[]
  assessment: AssessmentSummary | undefined
  risks: readonly Risk[]
  links: readonly RiskActionLink[]
}): PlanSummary {
  const { actions, assessment, risks, links } = input
  const actionsDone = actions.filter((a) => a.status === 'concluida').length
  const linked = new Set(links.map((l) => l.riskId))
  const sections = (assessment?.sections ?? []).map(({ id, name, answered, total }) => ({ id, name, answered, total }))
  const openRisks = risks.filter((r) => r.status === 'por_tratar' || r.status === 'em_tratamento')
  const topRisks = openRisks
    // Worst first. Level alone is too coarse, so the score behind it decides.
    .map((risk) => ({ risk, level: computeRiskLevel(risk.probability, risk.impact).level }))
    .sort((a, b) => computeRiskLevel(b.risk.probability, b.risk.impact).score - computeRiskLevel(a.risk.probability, a.risk.impact).score)
  return {
    maturity: assessment?.maturity ?? null,
    targetMaturity: assessment?.targetMaturity ?? null,
    sections,
    topSections: [...sections].sort((a, b) => a.answered / a.total - b.answered / b.total).slice(0, PREVIEW_ROWS),
    topRisks: topRisks.slice(0, PREVIEW_ROWS),
    openRisks: topRisks.length,
    actionsOpen: actions.length - actionsDone,
    actionsDone,
    risksUnlinked: openRisks.filter((r) => !linked.has(r.id)).length,
  }
}

/**
 * The gaps behind the plan, one per finding. The consultant's own proposals are not assessment gaps.
 * shortcut: gaps are derived from roadmap actions, not from the assessment's requirement→evidence model; upgrade with US39.
 */
export function planGaps(ranked: readonly PrioritizedAction<RemediationAction>[]): PlanGap[] {
  const seen = new Set<Id>()
  const gaps: PlanGap[] = []
  for (const { action } of ranked) {
    if (action.proposedBy !== null || seen.has(action.findingId)) continue
    seen.add(action.findingId)
    gaps.push({
      actionId: action.id,
      findingId: action.findingId,
      findingTitle: action.findingTitle,
      controlCode: action.controlCode,
      description: action.description,
      legalObligation: action.legalObligation,
    })
  }
  return gaps
}
