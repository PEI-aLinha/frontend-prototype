import type { ActionStatus } from '../../api/contracts'

// Fixed viewBox: the row stretches to the width available, the SVG stretches with it.
export const MAP_W = 700
export const MAP_H = 48

/** A line that leaves the first circle, winds between the rest and lands on the last one. */
export function serpentinePath(n: number): string {
  if (n < 2) return ''
  const points = Array.from({ length: n }, (_, i) => [((i + 0.5) / n) * MAP_W, i === 0 || i === n - 1 ? MAP_H / 2 : i % 2 ? MAP_H - 9 : 9] as const)
  return points.slice(1).reduce((d, [x, y], i) => {
    const [px, py] = points[i]
    const mx = (px + x) / 2
    return `${d} C ${mx} ${py}, ${mx} ${y}, ${x} ${y}`
  }, `M ${points[0][0]} ${points[0][1]}`)
}

/** How much of the line is solid: half a stretch past the last action already started. */
export function progressPercent(items: Array<{ status: ActionStatus }>): number {
  const n = items.length
  let last = -1
  items.forEach((a, i) => { if (a.status !== 'por_iniciar') last = i })
  if (n < 2 || last < 0) return 0
  return Math.min(100, Math.round(((last + 0.5) / (n - 1)) * 1000) / 10)
}
