import { describe, expect, it, vi } from 'vitest'
import type { CollectedEvidence, RemediationAction, Risk, User } from '../../api/contracts'
import { printDocument } from '../../ui/printDocument'
import { gapRows, planRows, printResults, riskRows } from './exportResults'
import { planSummary } from './planSummary'
import { prioritizeRoadmap } from './prioritizeRoadmap'

vi.mock('../../ui/printDocument', () => ({ printDocument: vi.fn() }))

const MARTA = 'usr-marta'
const RUI = 'usr-rui'

const action = (id: string, over: Partial<RemediationAction> = {}): RemediationAction =>
  ({ id, organizationId: 'org', findingId: 'fnd', description: `Ação ${id}`, priority: 1, dueDate: '2026-11-15', assignedTo: RUI, requiredEvidence: 'Comprovativo', status: 'por_iniciar', aiOutputId: null, legalObligation: 'NIS2, art. 21.º', findingTitle: 'Lacuna', controlCode: 'CA.03', proposedBy: null, ...over })

const risk = (id: string, threat: string): Risk =>
  ({ id, organizationId: 'org', assetId: null, threat, description: '', ownerId: null, probability: 3, impact: 3, treatment: 'mitigar', status: 'em_tratamento', createdBy: MARTA, createdAt: '2026-10-16', updatedAt: '2026-10-16' })

const users = [{ id: RUI, name: 'Rui Costa', initials: 'RC', role: 'responsavel', email: '', status: 'ativo', createdAt: '2026-10-01' }] as User[]
const evidence = (rows: CollectedEvidence[]): Map<string, CollectedEvidence[]> => new Map(rows.map((r) => [r.remediationActionId!, [r]]))
const checked = (id: string, ok: boolean): CollectedEvidence => ({ id, provider: 'microsoft365', title: 'Evidência', result: '9 de 15 contas', ok, strength: 'pontual', remediationActionId: id, collectedAt: '2026-10-16T17:30' })

describe('planRows', () => {
  it('writes one row per action, numbered by display rank', () => {
    const rows = planRows({ ranked: prioritizeRoadmap([action('a'), action('b')], []), users, evidence: new Map(), risks: [] }, 'consultant')
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => [r[0], r[1]])).toEqual([['1', 'Ação a'], ['2', 'Ação b']])
  })

  it('names the owner, or says nobody has it', () => {
    const rows = planRows({ ranked: prioritizeRoadmap([action('a'), action('b', { assignedTo: null })], []), users, evidence: new Map(), risks: [] }, 'consultant')
    expect(rows[0][4]).toBe('Rui Costa')
    expect(rows[1][4]).toBe('Por atribuir')
  })

  it('separates a failed check from a check that was never made', () => {
    const rows = planRows({ ranked: prioritizeRoadmap([action('a'), action('b')], []), users, evidence: evidence([checked('a', false)]), risks: [] }, 'consultant')
    expect(rows[0][6]).toBe('não comprovada')
    expect(rows[1][6]).toBe('Sem prova recolhida')
  })

  it('carries the origin and the risk that raised the action for the consultant', () => {
    const r = risk('rsk-a', 'Ransomware')
    const rows = planRows({ ranked: prioritizeRoadmap([action('a')], [{ actionId: 'a', level: 'alto', riskLabel: r.threat, plainLabel: 'Um vírus pode parar a produção' }]), users, evidence: new Map(), risks: [r] }, 'consultant')
    expect(rows[0][8]).toBe('CA.03 · Lacuna')
    expect(rows[0][9]).toBe('alto · Ransomware')
  })

  it('drops the consultant-only columns and uses plain language for the client', () => {
    const r = { ...risk('rsk-a', 'Ransomware'), plainLanguage: 'Um vírus pode parar a produção' }
    const rows = planRows({ ranked: prioritizeRoadmap([action('a')], [{ actionId: 'a', level: 'alto', riskLabel: r.threat, plainLabel: r.plainLanguage }]), users, evidence: new Map(), risks: [r] }, 'client')
    expect(rows[0]).toHaveLength(8)
    expect(rows[0]).not.toContain('NIS2, art. 21.º')
    expect(rows[0][7]).toBe('alto · Um vírus pode parar a produção')
  })

  it('says no when the action has no date', () => {
    expect(planRows({ ranked: prioritizeRoadmap([action('a', { dueDate: null })], []), users, evidence: new Map(), risks: [] }, 'consultant')[0][3]).toBe('Sem prazo')
  })
})

describe('gapRows', () => {
  it('writes the gap and the action, with the control and obligation for the consultant', () => {
    const ranked = prioritizeRoadmap([action('a')], [])
    expect(gapRows(ranked, 'consultant')).toEqual([['Lacuna', 'CA.03', 'Ação a', 'NIS2, art. 21.º']])
    expect(gapRows(ranked, 'client')).toEqual([['Lacuna', 'Ação a']])
  })

  it('leaves out the actions the consultant proposed', () => {
    expect(gapRows(prioritizeRoadmap([action('a', { proposedBy: MARTA })], []), 'client')).toEqual([])
  })
})

describe('printResults', () => {
  const summary = planSummary({ actions: [], assessment: undefined, risks: [], links: [] })
  const ctx = { ranked: [], users: [], evidence: new Map<string, CollectedEvidence[]>(), risks: [] }
  const estado = () => (vi.mocked(printDocument).mock.lastCall?.[0].sections[0].rows[0] ?? [])[1]

  it('names the validator, and the role when the name is unknown', () => {
    printResults('Org', summary, ctx, 'ordem', 'client', { frameworks: [], validated: true, validator: 'Marta Ferreira' })
    expect(estado()).toBe('Validado por Marta Ferreira')
    printResults('Org', summary, ctx, 'ordem', 'client', { frameworks: [], validated: true })
    expect(estado()).toBe('Validado pela consultora')
  })
})

describe('riskRows', () => {
  it('carries the threat, the computed level, the status and the review date', () => {
    const rows = riskRows([risk('rsk-a', 'Ransomware no servidor'), { ...risk('rsk-b', 'Phishing'), reviewDate: '2026-12-01' }], 'consultant')
    expect(rows[0]).toEqual(['Ransomware no servidor', 'alto', 'Em tratamento', ''])
    expect(rows[1][3]).toBe('1 dez. 2026')
  })

  it('leaves out archived risks and uses plain language for the client', () => {
    const rows = riskRows([
      { ...risk('rsk-a', 'Ransomware'), plainLanguage: 'Um vírus pode parar a produção' },
      { ...risk('rsk-b', 'Phishing'), status: 'arquivado' },
    ], 'client')
    expect(rows).toEqual([['Um vírus pode parar a produção', 'alto', 'Em tratamento', '']])
  })
})