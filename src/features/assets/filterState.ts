import type { Asset, AssetType, Level } from '../../api/contracts'
import { ASSET_TYPE_LABEL } from '../../config/labels'
import type { Inventory } from './useInventory'

export interface AssetFilterState {
  q: string
  type: string
  service: string
  crit: string
  owner: string
}

export const ALL = 'all'
export const FILTER_KEYS: Array<keyof AssetFilterState> = ['q', 'type', 'service', 'crit', 'owner']

export function readFilters(params: URLSearchParams): AssetFilterState {
  return { q: params.get('q') ?? '', type: params.get('type') ?? ALL, service: params.get('service') ?? ALL, crit: params.get('crit') ?? ALL, owner: params.get('owner') ?? ALL }
}

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function applyFilters(assets: Asset[], f: AssetFilterState, inv: Inventory): Asset[] {
  const q = normalize(f.q.trim())
  return assets.filter((a) =>
    (!q || normalize(`${a.name} ${ASSET_TYPE_LABEL[a.type]} ${inv.serviceName(a.criticalServiceId)} ${a.location ?? ''}`).includes(q)) &&
    (f.type === ALL || a.type === (f.type as AssetType)) &&
    (f.service === ALL || a.criticalServiceId === f.service) &&
    (f.crit === ALL || a.criticality === (f.crit as Level)) &&
    (f.owner === ALL || a.ownerId === f.owner))
}

export function isFiltering(f: AssetFilterState): boolean {
  return !!f.q || f.type !== ALL || f.service !== ALL || f.crit !== ALL || f.owner !== ALL
}

