import { useLayoutEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { ActionStatus, Id } from '../../api/contracts'
import { ACTION_STATUS_LABEL } from '../../config/labels'
import { cn } from '../../ui'
import { pathThrough, progressPercent, type Pt } from './roadmapMap'

export interface MapNode { id: Id; description: string; status: ActionStatus }

interface Line { w: number; h: number; points: Pt[] }

/** Where the plan stands: one circle per action, in the order on screen, each one jumping to its row. */
export function RoadmapMap({ items }: { items: MapNode[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLOListElement>(null)
  // The grid places the circles (breakpoints, stagger, labels); the line just follows their real centres.
  const [line, setLine] = useState<Line | null>(null)

  useLayoutEffect(() => {
    const box = wrap.current
    const list = grid.current
    if (!box || !list) return
    const measure = () => {
      const frame = box.getBoundingClientRect()
      setLine({
        w: frame.width,
        h: frame.height,
        points: [...list.children].map((li) => {
          const circle = (li.firstElementChild as HTMLElement).firstElementChild as HTMLElement
          const rect = circle.getBoundingClientRect()
          return { x: rect.left + rect.width / 2 - frame.left, y: rect.top + rect.height / 2 - frame.top }
        }),
      })
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(list)
    return () => resize.disconnect()
  }, [items.length])

  const jumpTo = (id: Id) => {
    const row = document.getElementById(`acao-${id}`)
    if (!row) return
    row.scrollIntoView({ block: 'start' })
    row.focus({ preventScroll: true })
  }
  const d = pathThrough(line?.points ?? [])
  const solid = progressPercent(items)

  return (
    <div className="rounded-[16px] border border-line-soft bg-paper px-5 py-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-5">
        <div ref={wrap} className="relative min-w-0 flex-1">
          {line && (
            <svg aria-hidden viewBox={`0 0 ${line.w} ${line.h}`} className="absolute inset-0 size-full">
              <path d={d} fill="none" className="stroke-line-soft" strokeWidth={2} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
              {solid > 0 && <path d={d} pathLength={100} strokeDasharray={`${solid} 100`} fill="none" className="stroke-brand" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
            </svg>
          )}
          <ol ref={grid} aria-label="Progresso do plano" className="relative grid auto-cols-fr grid-flow-col">
            {items.map((a, i) => (
              <li key={a.id} className={cn('flex justify-center', i % 2 === 1 && 'md:pt-8')}>
                <button
                  type="button"
                  onClick={() => jumpTo(a.id)}
                  title={a.description}
                  aria-label={`Ação ${i + 1} de ${items.length}: ${a.description}. ${ACTION_STATUS_LABEL[a.status]}.`}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span className={cn(
                    'grid size-12 place-items-center rounded-full border-2 text-[15px] font-extrabold transition-transform group-hover:scale-110 md:size-14',
                    a.status === 'concluida' ? 'border-brand bg-brand text-white' : a.status === 'em_curso' ? 'border-brand bg-paper text-brand' : 'border-line bg-paper text-ink-soft',
                  )}>
                    {a.status === 'concluida' ? <Check className="size-6" strokeWidth={3} aria-hidden /> : i + 1}
                  </span>
                  <span className="hidden max-w-[15ch] md:block">
                    <span className="line-clamp-2 text-center text-[11px] leading-tight text-ink-soft">{a.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <p className="ml-auto flex w-fit flex-col items-start gap-1 text-[11px] text-ink-soft lg:self-stretch lg:justify-between">
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-full bg-brand" />Concluída</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-full border-2 border-brand" />Em curso</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-full border-2 border-line" />Por iniciar</span>
        </p>
      </div>
    </div>
  )
}
