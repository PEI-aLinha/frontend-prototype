import { describe, expect, it } from 'vitest'
import { RISK_MATRIX, type RiskMatrixConfig } from '../../../config/riskMatrix'
import { buildRiskTemplate, REGISTER_ROWS } from './riskTemplate'

const sheet = (name: string, config: RiskMatrixConfig = RISK_MATRIX) => {
  const found = buildRiskTemplate(config).find((s) => s.sheet === name)
  if (!found) throw new Error(`Folha em falta: ${name}`)
  return found
}
const value = (cell: unknown) => (cell && typeof cell === 'object' && 'value' in cell ? (cell as { value: unknown }).value : cell)

describe('buildRiskTemplate', () => {
  it('has the three sheets the consultant edits', () => {
    expect(buildRiskTemplate(RISK_MATRIX).map((s) => s.sheet)).toEqual(['Escalas', 'Níveis', 'Registo'])
  })

  it('lists every probability and impact step from the config', () => {
    const rows = sheet('Escalas').data.map((r) => value(r[1]))
    for (const step of [...RISK_MATRIX.probability, ...RISK_MATRIX.impact]) expect(rows).toContain(step.label)
  })

  it('writes the band limits as editable numbers', () => {
    const rows = sheet('Níveis').data
    expect(rows.slice(1, 4).map((r) => [value(r[0]), value(r[1]), value(r[2])])).toEqual([
      ['Baixo', 1, 2], ['Médio', 3, 4], ['Alto', 6, 9],
    ])
  })

  it('computes score and level with live formulas that read the Níveis sheet', () => {
    const [, first] = sheet('Registo').data
    expect(first.map((c) => (c && typeof c === 'object' ? (c as { type?: unknown }).type : undefined))).toContain('Formula')
    const formulas = first.map(value).filter((v): v is string => typeof v === 'string' && v.startsWith('='))
    expect(formulas[0]).toContain('C2*D2')
    expect(formulas[1]).toContain("'Níveis'!$B$4")
  })

  it('reserves a fixed number of register rows after the header', () => {
    expect(sheet('Registo').data).toHaveLength(REGISTER_ROWS + 1)
  })

  it('follows a 5×5 config without code changes', () => {
    const steps = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: `N${v}`, hint: '' }))
    const config: RiskMatrixConfig = { probability: steps, impact: steps, bands: [{ level: 'baixo', min: 1, max: 6 }, { level: 'medio', min: 7, max: 14 }, { level: 'alto', min: 15, max: 25 }] }
    expect(sheet('Escalas', config).data.map((r) => value(r[1]))).toContain('N5')
    expect(sheet('Níveis', config).data[3].map(value)).toEqual(['Alto', 15, 25])
  })
})
