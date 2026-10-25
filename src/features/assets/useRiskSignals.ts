import { useMemo } from 'react'
import { useRiskLinks, useRisks } from '../../api/queries'
import { useTenant } from '../../core/tenant'
import { useCan } from '../../core/useCan'
import type { RiskSignal } from '../assessment/public'
import { computeRiskLevel } from './risk/computeRiskLevel'

/** Risk signals per roadmap action: only IDs and levels, nothing from the plugin internals. */
export function useRiskSignals(): RiskSignal[] {
  const org = useTenant()
  const can = useCan()
  const on = can('view', 'risk')
  const risks = useRisks(org.id, on)
  const links = useRiskLinks(org.id, on)
  return useMemo(() => (links.data ?? []).flatMap((l) => {
    const r = risks.data?.find((x) => x.id === l.riskId)
    return r && r.status !== 'arquivado'
      ? [{ actionId: l.remediationActionId, level: computeRiskLevel(r.probability, r.impact).level, riskLabel: r.threat, plainLabel: r.plainLanguage ?? r.threat }]
      : []
  }), [links.data, risks.data])
}
