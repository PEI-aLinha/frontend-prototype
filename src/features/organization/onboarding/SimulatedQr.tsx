const SIZE = 25

function seeded(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return (h >>> 0) / 4294967296
  }
}

const inFinder = (x: number, y: number) =>
  [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7)

function finder(fx: number, fy: number) {
  return (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width={7} height={7} className="fill-ink" />
      <rect x={fx + 1} y={fy + 1} width={5} height={5} className="fill-paper" />
      <rect x={fx + 2} y={fy + 2} width={3} height={3} className="fill-ink" />
    </g>
  )
}

/** Simulated QR code (the prototype has no authentication server). Same seed, same drawing. */
export function SimulatedQr({ seed, size = 184 }: { seed: string; size?: number }) {
  const rand = seeded(seed)
  const cells: Array<[number, number]> = []
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!inFinder(x, y) && rand() > 0.52) cells.push([x, y])
    }
  }
  return (
    <svg role="img" aria-label="Código QR simulado para a aplicação de autenticação" viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} width={size} height={size} shapeRendering="crispEdges" className="rounded-[12px] border border-line-soft bg-paper">
      <rect x={-2} y={-2} width={SIZE + 4} height={SIZE + 4} className="fill-paper" />
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} className="fill-ink" />)}
      {finder(0, 0)}
      {finder(SIZE - 7, 0)}
      {finder(0, SIZE - 7)}
    </svg>
  )
}
