import { describe, expect, it } from 'vitest'
import { computeRiskLevel, describeRule, maxLevel } from './computeRiskLevel'
import type { RiskMatrixConfig } from '../../../config/riskMatrix'

describe('computeRiskLevel (3×3)', () => {
  it.each([
    [1, 1, 1, 'baixo'], [1, 2, 2, 'baixo'], [2, 1, 2, 'baixo'],
    [1, 3, 3, 'medio'], [3, 1, 3, 'medio'], [2, 2, 4, 'medio'],
    [2, 3, 6, 'alto'], [3, 2, 6, 'alto'], [3, 3, 9, 'alto'],
  ])('p=%i × i=%i → score %i, %s', (p, i, score, level) => {
    expect(computeRiskLevel(p, i)).toEqual({ score, level })
  })

  it('rejects values outside the scale', () => {
    expect(() => computeRiskLevel(0, 2)).toThrow(RangeError)
    expect(() => computeRiskLevel(2, 4)).toThrow(RangeError)
  })

  it('describes the rule for the ransomware risk', () => {
    expect(describeRule(2, 3)).toBe('Média × Alto = Alto')
  })
})

describe('computeRiskLevel with a 5×5 config', () => {
  const steps = [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value), hint: '' }))
  const config: RiskMatrixConfig = {
    probability: steps,
    impact: steps,
    bands: [
      { level: 'baixo', min: 1, max: 6 },
      { level: 'medio', min: 7, max: 14 },
      { level: 'alto', min: 15, max: 25 },
    ],
  }
  it('uses the configured bands without code changes', () => {
    expect(computeRiskLevel(5, 5, config).level).toBe('alto')
    expect(computeRiskLevel(3, 3, config).level).toBe('medio')
    expect(computeRiskLevel(1, 5, config).level).toBe('baixo')
  })
})

describe('maxLevel', () => {
  it('returns the highest level or null', () => {
    expect(maxLevel([])).toBeNull()
    expect(maxLevel(['baixo', 'alto', 'medio'])).toBe('alto')
  })
})
