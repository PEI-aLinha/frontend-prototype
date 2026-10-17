import type { Level } from '../api/contracts'

const RISK_CLASS: Record<Level, string> = {
  baixo: 'bg-risk-low text-risk-low-ink',
  medio: 'bg-risk-medium text-risk-medium-ink',
  alto: 'bg-risk-high text-risk-high-ink',
}

export const riskCellClass = (level: Level): string => RISK_CLASS[level]
