import type { AssessmentSummary, Id, IsoDate, RemediationAction, Risk, RiskActionLink } from '../../api/contracts'
import type { Level } from '../../config/riskMatrix'
import { computeRiskLevel } from '../assets/risk/computeRiskLevel'

export interface PlanSection { id: string; name: string; answered: number; total: number }

export interface PlanDeadline { actionId: Id; description: string; dueDate: IsoDate }

export interface PlanRisk { risk: Risk; level: Level }

/** How many rows each card preview shows before it says how many it left out. */
export const PREVIEW_ROWS = 3

export interface PlanSummary {
  maturity: number | null
  /** Null while the assessment has not loaded, like maturity. */
  targetMaturity: number | null
  sections: PlanSection[]
  /** The weakest sections first, cut to PREVIEW_ROWS. These are what is holding maturity down. */
  topSections: PlanSection[]
  /** Open risks, worst first, cut to PREVIEW_ROWS. */
  topRisks: PlanRisk[]
  /** Open risks before the cut, so a card can say how many it left out. */
  openRisks: number
  /** status !== 'concluida' */
  actionsOpen: number
  /** status === 'concluida' */
  actionsDone: number
  /** Risks with no RiskActionLink row. */
  risksUnlinked: number
  /** Open actions with a dueDate, soonest first. */
  deadlines: PlanDeadline[]
}

/**
 * What the manager needs to read the plan (RF10/US15: level, target and gaps; RF27/US25: coverage,
 * gaps and next deadlines). Pure and deterministic: same inputs, same summary.
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
  const deadlines = actions
    .flatMap((a) => (a.status !== 'concluida' && a.dueDate ? [{ actionId: a.id, description: a.description, dueDate: a.dueDate }] : []))
    // ISO dates compare as text.
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const sections = (assessment?.sections ?? []).map(({ id, name, answered, total }) => ({ id, name, answered, total }))
  const topRisks = risks
    .filter((r) => r.status !== 'arquivado')
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
    risksUnlinked: risks.filter((r) => !linked.has(r.id)).length,
    deadlines,
  }
}