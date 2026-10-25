import type { Cell, Row, SheetData } from 'write-excel-file/browser'
import { RISK_LEVEL_LABEL as LEVEL_LABEL } from '../../../config/labels'
import { RISK_MATRIX, type RiskMatrixConfig, type ScaleStep } from '../../../config/riskMatrix'

/** Rows reserved in the register sheet, each with its score and level formulas already in place. */
export const REGISTER_ROWS = 30

const INPUT_FILL = '#FFF2CC'
const LEVELS_SHEET = "'Níveis'"

interface TemplateSheet {
  sheet: string
  data: SheetData
  columns: { width: number }[]
}

const header = (...labels: string[]): Row => labels.map((value): Cell => ({ value, fontWeight: 'bold' }))
const input = (value: string | number): Cell => ({ value, backgroundColor: INPUT_FILL })
const formula = (value: string): Cell => ({ type: 'Formula', value })

function scaleRows(title: string, steps: ScaleStep[]): Row[] {
  return [header(`${title} (valor)`, 'Nome', 'O que significa'), ...steps.map((s): Row => [input(s.value), input(s.label), input(s.hint)])]
}

function scalesSheet(config: RiskMatrixConfig): TemplateSheet {
  return {
    sheet: 'Escalas',
    data: [...scaleRows('Probabilidade', config.probability), [], ...scaleRows('Impacto', config.impact)],
    columns: [{ width: 22 }, { width: 16 }, { width: 70 }],
  }
}

function levelsSheet(config: RiskMatrixConfig): TemplateSheet {
  const bands = [...config.bands].sort((a, b) => a.min - b.min)
  return {
    sheet: 'Níveis',
    data: [
      header('Nível', 'Score mínimo', 'Score máximo'),
      ...bands.map((b): Row => [input(LEVEL_LABEL[b.level]), input(b.min), input(b.max)]),
      [],
      ['Score = Probabilidade × Impacto. Altere os limites e a folha "Registo" recalcula os níveis.'],
    ],
    columns: [{ width: 16 }, { width: 16 }, { width: 16 }],
  }
}

/** Nested IF from the highest band down: the score picks the first band whose minimum it reaches. */
function levelFormula(row: number, bandCount: number): string {
  const first = 2
  let expr = `${LEVELS_SHEET}!$A$${first}`
  for (let k = first + 1; k < first + bandCount; k++) expr = `IF(E${row}>=${LEVELS_SHEET}!$B$${k},${LEVELS_SHEET}!$A$${k},${expr})`
  return `=IF(E${row}="","",${expr})`
}

function registerSheet(config: RiskMatrixConfig): TemplateSheet {
  const example: Row = [input('Ransomware no servidor de produção'), input('Servidor de produção'), input(2), input(3)]
  const data: SheetData = [header('Risco', 'Ativo', 'Probabilidade (valor)', 'Impacto (valor)', 'Score', 'Nível', 'Tratamento')]
  for (let r = 2; r <= REGISTER_ROWS + 1; r++) {
    const cells: Row = r === 2 ? example : [input(''), input(''), input(''), input('')]
    data.push([...cells, formula(`=IF(OR(C${r}="",D${r}=""),"",C${r}*D${r})`), formula(levelFormula(r, config.bands.length)), input('')])
  }
  return { sheet: 'Registo', data, columns: [{ width: 42 }, { width: 28 }, { width: 22 }, { width: 18 }, { width: 10 }, { width: 12 }, { width: 24 }] }
}

/** Editable Excel template of the risk method: scales, level limits and a register that recalculates. */
export function buildRiskTemplate(config: RiskMatrixConfig): TemplateSheet[] {
  return [scalesSheet(config), levelsSheet(config), registerSheet(config)]
}

/** Downloads the template as .xlsx. The library is loaded on click, so it stays out of the main bundle. */
export async function downloadRiskTemplate(config: RiskMatrixConfig = RISK_MATRIX): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  await writeExcelFile(buildRiskTemplate(config)).toFile('template-registo-de-riscos.xlsx')
}
