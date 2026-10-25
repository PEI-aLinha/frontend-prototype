import { describe, expect, it } from 'vitest'
import { computeRiskLevel, describeRule, maxLevel } from './computeRiskLevel'
import { matrix5x5 } from './matrix5x5.fixture'

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
  const config = matrix5x5()
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
