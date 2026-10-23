import { describe, expect, it } from 'vitest'
import type { AssessmentSection, AssessmentSummary, RemediationAction, Risk, RiskActionLink } from '../../api/contracts'
import { planGaps, planSummary } from './planSummary'
import { prioritizeRoadmap } from './prioritizeRoadmap'

const action = (id: string, status: RemediationAction['status'], dueDate: string | null = null): RemediationAction =>
  ({ id, organizationId: 'org', findingId: 'fnd', description: `Ação ${id}`, priority: 1, dueDate, assignedTo: 'rui', requiredEvidence: 'Comprovativo', status, aiOutputId: null, legalObligation: 'art. 21.º', findingTitle: 'Lacuna', controlCode: 'CA.03', proposedBy: null })

const risk = (id: string, o: Partial<Pick<Risk, 'probability' | 'impact' | 'status'>> = {}): Risk =>
  ({ id, organizationId: 'org', assetId: null, threat: `Ameaça ${id}`, description: '', ownerId: null, probability: 2, impact: 3, treatment: 'mitigar', status: 'em_tratamento', createdBy: 'marta', createdAt: '2026-10-16', updatedAt: '2026-10-16', ...o })

const link = (id: string, riskId: string, remediationActionId: string): RiskActionLink => ({ id, riskId, remediationActionId })

const section = (id: string, answered: number, total: number): AssessmentSection => ({ id, name: `Secção ${id}`, answered, total, delegated: [] })

const assessmentWith = (maturity: number | null, sections: AssessmentSection[]): AssessmentSummary => ({ status: 'validada', sections, maturity, targetMaturity: 3, nextQuestion: null, savedAt: null })

const assessment = (maturity: number | null): AssessmentSummary =>
  assessmentWith(maturity, [{ id: 'sec-gov', name: 'Governação e responsabilidades', answered: 8, total: 8, delegated: [] }, { id: 'sec-ativos', name: 'Gestão de ativos', answered: 6, total: 6, delegated: [] }])

const empty = planSummary({ actions: [], assessment: undefined, risks: [], links: [] })

describe('planSummary', () => {
  it('is empty without data', () => {
    expect(empty).toEqual({ maturity: null, targetMaturity: null, sections: [], topSections: [], topRisks: [], openRisks: 0, actionsOpen: 0, actionsDone: 0, risksUnlinked: 0 })
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
      risks: [risk('rsk-a'), risk('rsk-b'), risk('rsk-c'), risk('rsk-d', { status: 'arquivado' })],
      links: [link('lnk-1', 'rsk-a', 'act-mfa'), link('lnk-2', 'rsk-b', 'act-mfa'), link('lnk-3', 'rsk-c', 'act-ot')],
    })
    expect(result.risksUnlinked).toBe(0)
    expect(result.openRisks).toBe(3)
    expect(planSummary({ actions: [], assessment: undefined, risks: [risk('rsk-a'), risk('rsk-b')], links: [link('lnk-1', 'rsk-a', 'act-mfa')] }).risksUnlinked).toBe(1)
  })

  it('does not count accepted or treated risks as needing an action', () => {
    const result = planSummary({
      actions: [], assessment: undefined,
      risks: [risk('rsk-a'), risk('rsk-b', { status: 'aceite' }), risk('rsk-c', { status: 'tratado' })],
      links: [],
    })
    expect(result.openRisks).toBe(3)
    expect(result.risksUnlinked).toBe(1)
  })

  it('lists one gap per finding, skipping the consultant proposals', () => {
    const a = action('a', 'por_iniciar')
    const other = { ...action('b', 'por_iniciar'), findingId: 'fnd-b' }
    const sameFinding = { ...action('c', 'por_iniciar'), findingId: a.findingId }
    const proposed = { ...action('d', 'por_iniciar'), findingId: 'fnd-d', proposedBy: 'usr-marta' }
    const gaps = planGaps(prioritizeRoadmap([a, other, sameFinding, proposed], []))
    expect(gaps.map((g) => g.actionId)).toEqual(['a', 'b'])
  })

  it('previews the weakest sections first and leaves the full order untouched', () => {
    const result = planSummary({
      actions: [], assessment: assessmentWith(2, [section('a', 10, 10), section('b', 1, 10), section('c', 5, 10), section('d', 8, 10)]), risks: [], links: [],
    })
    expect(result.topSections.map((s) => s.id)).toEqual(['b', 'c', 'd'])
    expect(result.sections.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('previews the worst open risks by score, not by level', () => {
    const result = planSummary({
      actions: [], assessment: undefined,
      risks: [risk('baixo', { probability: 1, impact: 1 }), risk('medio', { probability: 2, impact: 2 }), risk('alto-leve', { probability: 2, impact: 3 }), risk('alto', { probability: 3, impact: 3 }), risk('velho', { probability: 3, impact: 3, status: 'arquivado' })],
      links: [],
    })
    // Two risks are 'alto', so only the score behind the level can order them.
    expect(result.topRisks.map((r) => r.risk.id)).toEqual(['alto', 'alto-leve', 'medio'])
    expect(result.topRisks.map((r) => r.level)).toEqual(['alto', 'alto', 'medio'])
    expect(result.openRisks).toBe(4)
  })

})