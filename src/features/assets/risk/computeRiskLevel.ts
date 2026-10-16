import { RISK_MATRIX, type Level, type RiskMatrixConfig } from '../../../config/riskMatrix'

export interface RiskScore {
  score: number
  level: Level
}

/** Nível de risco calculado por regra (probabilidade × impacto). Nunca escolhido à mão. */
export function computeRiskLevel(probability: number, impact: number, config: RiskMatrixConfig = RISK_MATRIX): RiskScore {
  const valid = (steps: RiskMatrixConfig['probability'], v: number) => steps.some((s) => s.value === v)
  if (!valid(config.probability, probability) || !valid(config.impact, impact)) {
    throw new RangeError(`Valores fora da escala: probabilidade ${probability}, impacto ${impact}`)
  }
  const score = probability * impact
  const band = config.bands.find((b) => score >= b.min && score <= b.max)
  if (!band) throw new RangeError(`Sem regra para o score ${score}`)
  return { score, level: band.level }
}

/** Texto da regra, ex.: "Média × Alto = Alto". */
export function describeRule(probability: number, impact: number, config: RiskMatrixConfig = RISK_MATRIX): string {
  const p = config.probability.find((s) => s.value === probability)?.label ?? '?'
  const i = config.impact.find((s) => s.value === impact)?.label ?? '?'
  const { level } = computeRiskLevel(probability, impact, config)
  const label = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }[level]
  return `${p} × ${i} = ${label}`
}

export const LEVEL_ORDER: Record<Level, number> = { baixo: 1, medio: 2, alto: 3 }

export function maxLevel(levels: Level[]): Level | null {
  return levels.reduce<Level | null>((acc, l) => (acc === null || LEVEL_ORDER[l] > LEVEL_ORDER[acc] ? l : acc), null)
}
