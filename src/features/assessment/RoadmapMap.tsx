import { Check } from 'lucide-react'
import type { ActionStatus, Id } from '../../api/contracts'
import { ACTION_STATUS_LABEL } from '../../config/labels'
import { cn } from '../../ui'
import { MAP_H, MAP_W, progressPercent, serpentinePath } from './roadmapMap'

export interface MapNode { id: Id; description: string; status: ActionStatus }

/** Where the plan stands: one circle per action, in the order on screen, each one jumping to its row. */
export function RoadmapMap({ items }: { items: MapNode[] }) {
  const jumpTo = (id: Id) => {
    const row = document.getElementById(`acao-${id}`)
    if (!row) return
    row.scrollIntoView({ block: 'start' })
    row.focus({ preventScroll: true })
  }
  const d = serpentinePath(items.length)
  const solid = progressPercent(items)

  return (
    <div className="rounded-[16px] border border-line-soft bg-paper px-4 py-4">
      <div className="relative">
        <svg aria-hidden viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path d={d} fill="none" className="stroke-line-soft" strokeWidth={2} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
          {solid > 0 && <path d={d} pathLength={100} strokeDasharray={`${solid} 100`} fill="none" className="stroke-brand" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
        </svg>
        <ol aria-label="Progresso do plano" className="relative grid auto-cols-fr grid-flow-col justify-items-center">
          {items.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => jumpTo(a.id)}
                title={a.description}
                aria-label={`Ação ${i + 1} de ${items.length}: ${a.description}. ${ACTION_STATUS_LABEL[a.status]}.`}
                className={cn(
                  'grid size-9 place-items-center rounded-full border-2 text-[14px] font-extrabold transition-transform hover:scale-110 md:size-11',
                  a.status === 'concluida' ? 'border-brand bg-brand text-white' : a.status === 'em_curso' ? 'border-brand bg-paper text-brand' : 'border-line bg-paper text-ink-soft',
                )}
              >
                {a.status === 'concluida' ? <Check className="size-5" strokeWidth={3} aria-hidden /> : i + 1}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
