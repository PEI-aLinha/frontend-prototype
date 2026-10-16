// Decisão D2: escala de risco configurável. Mudar para 5×5 é só editar este ficheiro.
export type Level = 'baixo' | 'medio' | 'alto'

export interface ScaleStep {
  value: number
  label: string
  hint: string
}

export interface RiskBand {
  level: Level
  min: number
  max: number
}

export interface RiskMatrixConfig {
  probability: ScaleStep[]
  impact: ScaleStep[]
  bands: RiskBand[]
}

export const RISK_MATRIX: RiskMatrixConfig = {
  probability: [
    { value: 1, label: 'Baixa', hint: 'Pouco provável: não aconteceu nos últimos anos.' },
    { value: 2, label: 'Média', hint: 'Pode acontecer: já aconteceu a empresas parecidas.' },
    { value: 3, label: 'Alta', hint: 'Provável: há sinais ou já aconteceu cá.' },
  ],
  impact: [
    { value: 1, label: 'Baixo', hint: 'Incómodo, resolve-se no próprio dia.' },
    { value: 2, label: 'Médio', hint: 'Atrasa o trabalho ou custa dinheiro, sem parar a empresa.' },
    { value: 3, label: 'Alto', hint: 'Para a produção ou a faturação, ou expõe dados pessoais.' },
  ],
  bands: [
    { level: 'baixo', min: 1, max: 2 },
    { level: 'medio', min: 3, max: 4 },
    { level: 'alto', min: 6, max: 9 },
  ],
}

export const LEVEL_LABEL: Record<Level, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }
