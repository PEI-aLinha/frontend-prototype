import type { CollectedEvidence, RemediationAction, Risk, User } from '../../api/contracts'
import { ACTION_STATUS_LABEL, MATURITY_LABEL, RISK_STATUS_LABEL, shortDate } from '../../config/labels'
import { printDocument } from '../../ui/printDocument'
import { computeRiskLevel } from '../assets/risk/computeRiskLevel'
import { evidenceState } from './evidenceState'
import type { PlanSummary } from './planSummary'
import type { PrioritizedAction } from './prioritizeRoadmap'

const NO_EVIDENCE: CollectedEvidence[] = []

export type Audience = 'client' | 'consultant'

const PLAN_HEADERS: Record<Audience, string[]> = {
  consultant: ['Prioridade', 'Ação', 'Estado', 'Prazo', 'Responsável', 'Prova necessária', 'Evidência', 'Obrigação legal', 'Origem', 'Risco ligado'],
  client: ['Prioridade', 'Ação', 'Estado', 'Prazo', 'Responsável', 'Prova necessária', 'Evidência', 'Risco ligado'],
}

const RISK_HEADERS: Record<Audience, string[]> = {
  consultant: ['Risco', 'Nível', 'Estado', 'Próxima revisão'],
  client: ['O que pode acontecer', 'Nível', 'Estado', 'Próxima revisão'],
}

export interface ResultsCtx {
  /** Already in display order, so the document matches what the reader was looking at. */
  ranked: PrioritizedAction<RemediationAction>[]
  users: User[]
  evidence: Map<string, CollectedEvidence[]>
  risks: Risk[]
}

/** One row per action. RF12: the results leave the platform. */
export function planRows({ ranked, users, evidence }: ResultsCtx, audience: Audience): string[][] {
  return ranked.map(({ action: a, rank, topRisk }) => {
    const ev = evidenceState(evidence.get(a.id) ?? NO_EVIDENCE)
    const row = [
      String(rank),
      a.description,
      ACTION_STATUS_LABEL[a.status],
      a.dueDate ? shortDate(a.dueDate) : 'Sem prazo',
      users.find((u) => u.id === a.assignedTo)?.name ?? 'Por atribuir',
      a.requiredEvidence,
      // No evidence is a normal state, not a warning, so it reads as absent rather than failed.
      ev ? ev.label.replace('Estado: ', '') : 'Sem prova recolhida',
    ]
    if (audience === 'client') return [...row, topRisk ? `${topRisk.level} · ${topRisk.plainLabel}` : '']
    return [...row, a.legalObligation, `${a.controlCode} · ${a.findingTitle}`, topRisk ? `${topRisk.level} · ${topRisk.riskLabel}` : '']
  })
}

export function riskRows(risks: Risk[], audience: Audience): string[][] {
  return risks
    .filter((r) => r.status !== 'arquivado')
    .map((r) => [audience === 'client' ? r.plainLanguage ?? r.threat : r.threat, computeRiskLevel(r.probability, r.impact).level, RISK_STATUS_LABEL[r.status], r.reviewDate ? shortDate(r.reviewDate) : ''])
}

/** RF12/US17: prints the results, which the browser saves as PDF. Exports what the reader sees. */
export function printResults(orgName: string, summary: PlanSummary, ctx: ResultsCtx, orderedBy: string, audience: Audience): void {
  printDocument({
    title: `Resultados e roadmap — ${orgName}`,
    intro: 'Gerado pelo aLinha (protótipo). Lacunas e plano de ação em NIS2 + RGPD, na ordem apresentada na plataforma.',
    sections: [
      {
        title: 'Resumo',
        headers: ['Indicador', 'Valor'],
        rows: [
          ['Nível de maturidade', `${summary.maturity ?? '—'} de 5`],
          ['Objetivo', `${summary.targetMaturity ?? '—'} de 5${summary.targetMaturity ? ` · ${MATURITY_LABEL[summary.targetMaturity]}` : ''}`],
          ['Riscos ativos', String(summary.openRisks)],
          ['Riscos sem ação ligada', String(summary.risksUnlinked)],
          ['Ações por resolver', String(summary.actionsOpen)],
          ['Ações concluídas', String(summary.actionsDone)],
        ],
      },
      { title: `Plano de ação · ${orderedBy}`, headers: PLAN_HEADERS[audience], rows: planRows(ctx, audience) },
      { title: 'Registo de riscos', headers: RISK_HEADERS[audience], rows: riskRows(ctx.risks, audience) },
    ],
  })
}