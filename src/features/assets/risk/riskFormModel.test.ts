import { describe, expect, it } from 'vitest'
import { emptyRisk, toRiskInput, validateRisk } from './riskFormModel'

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
})

describe('toRiskInput', () => {
  it('drops actions unless mitigating and never sends a risk level', () => {
    const input = toRiskInput({ ...base, treatment: 'evitar', actionIds: ['act-mfa'] })
    expect(input.actionIds).toEqual([])
    expect(input).not.toHaveProperty('riskLevel')
    expect(input.assetId).toBe('ast-servidor')
  })
})
