import type { ActionStatus } from '../../api/contracts'

export interface Pt { x: number; y: number }

/** A line through the circle centres, with one smooth S-curve per stretch between them. */
export function pathThrough(points: readonly Pt[]): string {
  if (points.length < 2) return ''
  return points.slice(1).reduce((d, p, i) => {
    const q = points[i]
    const mx = (q.x + p.x) / 2
    return `${d} C ${mx} ${q.y}, ${mx} ${p.y}, ${p.x} ${p.y}`
  }, `M ${points[0].x} ${points[0].y}`)
}

/** How much of the line is solid: through the concluded actions at the head of the order, half a stretch past the last one. */
export function progressPercent(items: Array<{ status: ActionStatus }>): number {
  const n = items.length
  let lead = 0
  while (lead < n && items[lead].status === 'concluida') lead++
  if (n < 2 || lead === 0) return 0
  return Math.min(100, Math.round(((lead - 0.5) / (n - 1)) * 1000) / 10)
}
