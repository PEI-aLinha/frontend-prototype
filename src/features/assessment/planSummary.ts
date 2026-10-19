import type { AssessmentSummary, Id, IsoDate, RemediationAction, Risk, RiskActionLink } from '../../api/contracts'

export interface PlanSection { id: string; name: string; answered: number; total: number }

export interface PlanDeadline { actionId: Id; description: string; dueDate: IsoDate }

export interface PlanSummary {
  maturity: number | null
  /** Null while the assessment has not loaded, like maturity. */
  targetMaturity: number | null
  sections: PlanSection[]
  actionsTotal: number
  /** status !== 'concluida' */
  actionsOpen: number
  /** status === 'concluida' */
  actionsDone: number
  risksTotal: number
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
  return {
    maturity: assessment?.maturity ?? null,
    targetMaturity: assessment?.targetMaturity ?? null,
    sections: (assessment?.sections ?? []).map(({ id, name, answered, total }) => ({ id, name, answered, total })),
    actionsTotal: actions.length,
    actionsOpen: actions.length - actionsDone,
    actionsDone,
    risksTotal: risks.length,
    risksUnlinked: risks.filter((r) => !linked.has(r.id)).length,
    deadlines,
  }
}