import { describe, expect, it } from 'vitest'
import { emptyRisk, RISK_STEPS, toRiskInput, validateRisk, validateRiskStep } from './riskFormModel'

const base = { ...emptyRisk('ast-servidor'), threat: 'Ransomware no servidor de produção', probability: 2, impact: 3 }

describe('validateRisk', () => {
  it('requires threat, probability and impact', () => {
    expect(Object.keys(validateRisk(emptyRisk()))).toEqual(expect.arrayContaining(['threat', 'probability', 'impact']))
  })
  it('requires at least one roadmap action to mitigate', () => {
    expect(validateRisk({ ...base, treatment: 'mitigar' }).actionIds).toBeDefined()
    expect(validateRisk({ ...base, treatment: 'mitigar', actionIds: ['act-mfa'] })).toEqual({})
  })
  it('requires a justification to accept', () => {
    expect(validateRisk({ ...base, treatment: 'aceitar' }).acceptanceJustification).toBeDefined()
    expect(validateRisk({ ...base, treatment: 'aceitar', acceptanceJustification: 'Custo maior que o impacto previsto.' })).toEqual({})
  })
  it('requires both residual values when residual risk is set', () => {
    expect(validateRisk({ ...base, hasResidual: true, residualProbability: 1 }).residual).toBeDefined()
  })
  it('rejects a residual risk higher than the current one', () => {
    expect(validateRisk({ ...base, hasResidual: true, residualProbability: 3, residualImpact: 3 }).residual).toMatch(/não pode ser maior/)
    expect(validateRisk({ ...base, hasResidual: true, residualProbability: 2, residualImpact: 3 }).residual).toBeUndefined()
    expect(validateRisk({ ...base, hasResidual: true, residualProbability: 1, residualImpact: 2 }).residual).toBeUndefined()
  })
})

describe('toRiskInput', () => {
  it('drops actions unless mitigating and never sends a risk level', () => {
    const input = toRiskInput({ ...base, treatment: 'evitar', actionIds: ['act-mfa'] })
    expect(input.actionIds).toEqual([])
    expect(input).not.toHaveProperty('riskLevel')
    expect(input.assetId).toBe('ast-servidor')
  })
})

describe('validateRiskStep', () => {
  it('only reports the errors of the step being left', () => {
    const empty = emptyRisk()
    expect(Object.keys(validateRiskStep(empty, 0))).toEqual(['threat'])
    expect(Object.keys(validateRiskStep(empty, 1))).toEqual(['probability', 'impact'])
    expect(validateRiskStep(empty, 2)).toEqual({})
  })
  it('checks the treatment rules on the last step', () => {
    expect(validateRiskStep({ ...base, treatment: 'mitigar' }, 2).actionIds).toBeDefined()
  })
  it('splits every error of validateRisk across the steps', () => {
    const v = { ...emptyRisk(), treatment: 'mitigar' as const, hasResidual: true }
    const all = Object.keys(validateRisk(v)).sort()
    const perStep = RISK_STEPS.flatMap((_, i) => Object.keys(validateRiskStep(v, i))).sort()
    expect(perStep).toEqual(all)
  })
})
