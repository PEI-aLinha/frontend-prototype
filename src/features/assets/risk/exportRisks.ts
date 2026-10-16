import type { Asset, RemediationAction, Risk, RiskActionLink, User } from '../../../api/contracts'
import { RISK_LEVEL_LABEL, RISK_STATUS_LABEL, shortDate, TREATMENT_LABEL } from '../../../config/labels'
import { RISK_MATRIX } from '../../../config/riskMatrix'
import { downloadCsv, toCsvWith } from '../exportAssets'
import { computeRiskLevel } from './computeRiskLevel'

const HEADERS = ['Risco', 'Ativo', 'Probabilidade', 'Impacto', 'Nível', 'Tratamento', 'Ações do roadmap', 'Nível residual', 'Estado', 'Responsável', 'Próxima revisão']

interface Ctx { assets: Asset[]; users: User[]; actions: RemediationAction[]; links: RiskActionLink[] }

/** Exports the risk register (ISO/IEC 27005) to CSV, for audits or for management. */
export function exportRiskRegister(risks: Risk[], ctx: Ctx): void {
  const label = (steps: typeof RISK_MATRIX.probability, v: number) => steps.find((s) => s.value === v)?.label ?? String(v)
  const rows = risks.map((r) => [
    r.threat,
    ctx.assets.find((a) => a.id === r.assetId)?.name ?? 'Toda a empresa',
    label(RISK_MATRIX.probability, r.probability),
    label(RISK_MATRIX.impact, r.impact),
    RISK_LEVEL_LABEL[computeRiskLevel(r.probability, r.impact).level],
    r.treatment ? TREATMENT_LABEL[r.treatment] : '',
    ctx.links.filter((l) => l.riskId === r.id).map((l) => ctx.actions.find((a) => a.id === l.remediationActionId)?.description ?? '').join(' | '),
    r.residualProbability && r.residualImpact ? RISK_LEVEL_LABEL[computeRiskLevel(r.residualProbability, r.residualImpact).level] : '',
    RISK_STATUS_LABEL[r.status],
    ctx.users.find((u) => u.id === r.ownerId)?.name ?? '',
    r.reviewDate ? shortDate(r.reviewDate) : '',
  ])
  downloadCsv('registo-de-riscos-componentes-agueda.csv', toCsvWith(HEADERS, rows))
}
