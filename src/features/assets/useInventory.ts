import { useMemo } from 'react'
import { ALL_SERVICES, type Asset, type CriticalService, type Level, type Risk, type User } from '../../api/contracts'
import { useAssets, useRisks, useServices, useTasks, useUsers } from '../../api/queries'
import { useCan } from '../../core/useCan'
import { useTenant } from '../../core/tenant'
import { computeRiskLevel, maxLevel } from './risk/computeRiskLevel'

export interface Inventory {
  assets: Asset[]
  services: CriticalService[]
  users: User[]
  risksByAsset: Map<string, Risk[]>
  topRisk: (assetId: string) => Level | null
  serviceName: (id: Asset['criticalServiceId']) => string
  user: (id: string | null) => User | undefined
}

/** Combines assets, services, users and (if allowed) risks. */
export function useInventory() {
  const org = useTenant()
  const can = useCan()
  const seeRisks = can('view', 'risk')
  const assets = useAssets(org.id)
  const services = useServices(org.id)
  const users = useUsers(org.id)
  const tasks = useTasks(org.id)
  const risks = useRisks(org.id, seeRisks)

  const data = useMemo<Inventory | null>(() => {
    if (!assets.data || !services.data || !users.data) return null
    const risksByAsset = new Map<string, Risk[]>()
    for (const r of risks.data ?? []) {
      if (!r.assetId) continue
      risksByAsset.set(r.assetId, [...(risksByAsset.get(r.assetId) ?? []), r])
    }
    return {
      assets: assets.data,
      services: services.data,
      users: users.data,
      risksByAsset,
      topRisk: (id) => maxLevel((risksByAsset.get(id) ?? []).map((r) => computeRiskLevel(r.probability, r.impact).level)),
      serviceName: (id) => (id === ALL_SERVICES ? 'Todos' : services.data.find((s) => s.id === id)?.name ?? '—'),
      user: (id) => users.data.find((u) => u.id === id),
    }
  }, [assets.data, services.data, users.data, risks.data])

  const error = assets.error ?? services.error ?? users.error
  return {
    data,
    tasks: tasks.data ?? [],
    seeRisks,
    isPending: !data && !error,
    error,
    refetch: () => { assets.refetch(); services.refetch(); users.refetch(); tasks.refetch() },
  }
}
