import type { Asset } from '../../api/contracts'

/** Assets that stop working (directly or indirectly) if this one fails. */
export function affectedBy(assetId: string, assets: Asset[]): Asset[] {
  const out = new Map<string, Asset>()
  const queue = [assetId]
  while (queue.length) {
    const current = queue.shift()!
    for (const a of assets) {
      if (a.dependsOn?.includes(current) && !out.has(a.id) && a.id !== assetId) {
        out.set(a.id, a)
        queue.push(a.id)
      }
    }
  }
  return [...out.values()]
}
