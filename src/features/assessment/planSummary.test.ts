import { describe, expect, it } from 'vitest'
import type { AssessmentSummary, RemediationAction, Risk, RiskActionLink } from '../../api/contracts'
import { planSummary } from './planSummary'

const action = (id: string, status: RemediationAction['status'], dueDate: string | null = null): RemediationAction =>
  ({ id, organizationId: 'org', findingId: 'fnd', description: `Ação ${id}`, priority: 1, dueDate, assignedTo: 'rui', requiredEvidence: 'Comprovativo', status, aiOutputId: null, legalObligation: 'art. 21.º', findingTitle: 'Lacuna', controlCode: 'CA.03', proposedBy: null })

const risk = (id: string): Risk =>
  ({ id, organizationId: 'org', assetId: null, threat: `Ameaça ${id}`, description: '', ownerId: null, probability: 2, impact: 3, treatment: 'mitigar', status: 'em_tratamento', createdBy: 'marta', createdAt: '2026-10-16', updatedAt: '2026-10-16' })

const link = (id: string, riskId: string, remediationActionId: string): RiskActionLink => ({ id, riskId, remediationActionId })

const assessment = (maturity: number | null): AssessmentSummary =>
  ({ status: 'validada', sections: [{ id: 'sec-gov', name: 'Governação e responsabilidades', answered: 8, total: 8, delegated: [] }, { id: 'sec-ativos', name: 'Gestão de ativos', answered: 6, total: 6, delegated: [] }], maturity, targetMaturity: 3 })

const empty = planSummary({ actions: [], assessment: undefined, risks: [], links: [] })

describe('planSummary', () => {
  it('is empty without data', () => {
    expect(empty).toEqual({ maturity: null, targetMaturity: null, sections: [], actionsOpen: 0, actionsDone: 0, risksUnlinked: 0, deadlines: [] })
  })

  it('counts the actions by status', () => {
    const result = planSummary({ actions: [action('a', 'por_iniciar'), action('b', 'em_curso'), action('c', 'em_curso'), action('d', 'concluida')], assessment: undefined, risks: [], links: [] })
    expect([result.actionsOpen, result.actionsDone]).toEqual([3, 1])
  })

  it('keeps a null maturity and passes the target through', () => {
    expect(planSummary({ actions: [], assessment: assessment(null), risks: [], links: [] })).toMatchObject({ maturity: null, targetMaturity: 3 })
    expect(planSummary({ actions: [], assessment: assessment(2), risks: [], links: [] })).toMatchObject({ maturity: 2, targetMaturity: 3 })
  })

  it('copies the section rows', () => {
    expect(planSummary({ actions: [], assessment: assessment(2), risks: [], links: [] }).sections).toEqual([
      { id: 'sec-gov', name: 'Governação e responsabilidades', answered: 8, total: 8 },
      { id: 'sec-ativos', name: 'Gestão de ativos', answered: 6, total: 6 },
    ])
  })

  it('counts the risks with no linked action', () => {
    const result = planSummary({
      actions: [], assessment: assessment(2),
      risks: [risk('rsk-a'), risk('rsk-b'), risk('rsk-c')],
      links: [link('lnk-1', 'rsk-a', 'act-mfa'), link('lnk-2', 'rsk-b', 'act-mfa'), link('lnk-3', 'rsk-c', 'act-ot')],
    })
    expect(result.risksUnlinked).toBe(0)
    expect(planSummary({ actions: [], assessment: undefined, risks: [risk('rsk-a'), risk('rsk-b')], links: [link('lnk-1', 'rsk-a', 'act-mfa')] }).risksUnlinked).toBe(1)
  })

  it('orders the deadlines soonest first', () => {
    const result = planSummary({
      actions: [action('c', 'por_iniciar', '2027-01-31'), action('a', 'por_iniciar', '2026-11-15'), action('b', 'por_iniciar', '2026-12-15')],
      assessment: undefined, risks: [], links: [],
    })
    expect(result.deadlines.map((d) => d.actionId)).toEqual(['a', 'b', 'c'])
    expect(result.deadlines[0]).toEqual({ actionId: 'a', description: 'Ação a', dueDate: '2026-11-15' })
  })

  it('leaves out concluded actions and actions with no due date', () => {
    const result = planSummary({
      actions: [action('feita', 'concluida', '2026-11-15'), action('sem-prazo', 'por_iniciar'), action('aberta', 'em_curso', '2026-12-01')],
      assessment: undefined, risks: [], links: [],
    })
    expect(result.deadlines.map((d) => d.actionId)).toEqual(['aberta'])
  })
})