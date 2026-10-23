import type { RiskMatrixConfig } from '../../../config/riskMatrix'

/** A 5×5 matrix for tests: proves the levels come from config, not from code. */
export function matrix5x5(label: (value: number) => string = String): RiskMatrixConfig {
  const steps = [1, 2, 3, 4, 5].map((value) => ({ value, label: label(value), hint: '' }))
  return {
    probability: steps,
    impact: steps,
    bands: [
      { level: 'baixo', min: 1, max: 6 },
      { level: 'medio', min: 7, max: 14 },
      { level: 'alto', min: 15, max: 25 },
    ],
  }
}
