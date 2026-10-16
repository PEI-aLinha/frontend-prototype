import type { Id, Risk, RiskInput, Treatment } from '../../../api/contracts'

export interface RiskFormValues {
  assetId: string
  threat: string
  description: string
  ownerId: string
  probability: number | null
  impact: number | null
  treatment: Treatment | null
  acceptanceJustification: string
  plainLanguage: string
  hasResidual: boolean
  residualProbability: number | null
  residualImpact: number | null
  actionIds: Id[]
}

export type RiskErrors = Partial<Record<'threat' | 'probability' | 'impact' | 'treatment' | 'actionIds' | 'acceptanceJustification' | 'residual', string>>

export const NO_ASSET = 'nenhum'

export function emptyRisk(assetId?: string | null): RiskFormValues {
  return {
    assetId: assetId ?? NO_ASSET, threat: '', description: '', ownerId: 'u-rui', probability: null, impact: null, treatment: null,
    acceptanceJustification: '', plainLanguage: '', hasResidual: false, residualProbability: null, residualImpact: null, actionIds: [],
  }
}

export function riskToValues(r: Risk, actionIds: Id[]): RiskFormValues {
  return {
    assetId: r.assetId ?? NO_ASSET, threat: r.threat, description: r.description, ownerId: r.ownerId ?? '', probability: r.probability, impact: r.impact,
    treatment: r.treatment, acceptanceJustification: r.acceptanceJustification ?? '', plainLanguage: r.plainLanguage ?? '',
    hasResidual: r.residualProbability !== undefined, residualProbability: r.residualProbability ?? null, residualImpact: r.residualImpact ?? null, actionIds,
  }
}

/** Regras do tratamento (ISO/IEC 27005): mitigar exige ≥1 ação; aceitar exige justificação. */
export function validateRisk(v: RiskFormValues): RiskErrors {
  const e: RiskErrors = {}
  if (v.threat.trim().length < 5) e.threat = 'Descreva a ameaça (ex.: Ransomware no servidor de produção).'
  if (v.probability === null) e.probability = 'Escolha a probabilidade.'
  if (v.impact === null) e.impact = 'Escolha o impacto.'
  if (v.treatment === 'mitigar' && v.actionIds.length === 0) e.actionIds = 'Para mitigar, ligue pelo menos uma ação do roadmap (ou proponha uma nova).'
  if (v.treatment === 'aceitar' && v.acceptanceJustification.trim().length < 10) e.acceptanceJustification = 'Explique porque é que a empresa aceita este risco.'
  if (v.hasResidual && (v.residualProbability === null || v.residualImpact === null)) e.residual = 'Indique a probabilidade e o impacto previstos depois do tratamento.'
  return e
}

export function toRiskInput(v: RiskFormValues): RiskInput {
  return {
    assetId: v.assetId === NO_ASSET ? null : v.assetId,
    threat: v.threat.trim(),
    description: v.description.trim(),
    ownerId: v.ownerId || null,
    probability: v.probability!,
    impact: v.impact!,
    treatment: v.treatment,
    acceptanceJustification: v.treatment === 'aceitar' ? v.acceptanceJustification.trim() : undefined,
    plainLanguage: v.plainLanguage.trim() || undefined,
    residualProbability: v.hasResidual ? v.residualProbability ?? undefined : undefined,
    residualImpact: v.hasResidual ? v.residualImpact ?? undefined : undefined,
    actionIds: v.treatment === 'mitigar' ? v.actionIds : [],
  }
}

/** Ações sugeridas pelo tipo de ativo (regra simples e visível, sem IA). */
export const SUGGESTED_ACTIONS: Record<string, Id[]> = {
  servidor: ['act-mfa', 'act-teste-backups'],
  armazenamento: ['act-teste-backups', 'act-politica-backups'],
  aplicacao: ['act-mfa'],
  rede: ['act-segmentar-ot'],
  sistema_producao_ot: ['act-segmentar-ot'],
  servico_cloud: ['act-mfa', 'act-formacao'],
  equipamento: ['act-formacao'],
}
