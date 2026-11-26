import { useLayoutEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { ActionStatus, Id } from '../../api/contracts'
import { useToday } from '../../api/queries'
import { ACTION_STATUS_LABEL, shortDate } from '../../config/labels'
import { cn } from '../../ui'
import { pathThrough, progressPercent, type Pt } from './roadmapPath'

/** Deadlines closer than this get a label under their circle. */
const SOON_DAYS = 30

export interface MapNode { id: Id; description: string; status: ActionStatus; dueDate?: string | null }

interface Line { w: number; h: number; points: Pt[] }

/** Where the plan stands: one circle per action, in the order on screen, each one jumping to its row.
 *  Under each circle goes what the list does not show at a glance: the deadline, and whether it has passed. */
export function RoadmapMap({ items }: { items: MapNode[] }) {
  const today = useToday().data
  const late = (a: MapNode) => !!(today && a.dueDate && a.status !== 'concluida' && a.dueDate < today)
  // Days until the deadline; the map only labels the urgent ones, so it never reads as a timeline out of order.
  const daysLeft = (a: MapNode) => (today && a.dueDate ? Math.round((Date.parse(a.dueDate) - Date.parse(today)) / 86_400_000) : null)
  const urgency = (a: MapNode) => {
    if (a.status === 'concluida') return 'Feita'
    const d = daysLeft(a)
    if (d === null || d > SOON_DAYS) return null
    if (d < 0) return 'Em atraso'
    return d === 0 ? 'Termina hoje' : d === 1 ? 'Termina amanhã' : `Termina em ${d} dias`
  }
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
    <div className="hidden rounded-[16px] border border-line-soft bg-paper px-5 py-5 md:block">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-ink-soft">
        <p>Por ordem de prioridade. Por baixo, as que terminam nos próximos {SOON_DAYS} dias.</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-full bg-brand" />Concluída</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-full border-2 border-dashed border-brand" />Em curso</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-full border-2 border-line" />Por iniciar</span>
        </p>
      </div>
      {/* The hover scale rises above the circles, so the scroll container needs a little room or it clips the top row. */}
      <div className="overflow-x-auto pt-1">
        <div ref={wrap} className="relative w-max min-w-full">
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
                  aria-label={`${i + 1} ${a.description}. ${ACTION_STATUS_LABEL[a.status]}${a.dueDate ? `, prazo ${shortDate(a.dueDate)}${late(a) ? ', em atraso' : ''}` : ''}, ação ${i + 1} de ${items.length}.`}
                  className="group flex flex-col items-center gap-1.5"
                >
                   <span className={cn(
                     'grid size-12 place-items-center rounded-full border-2 text-sm font-extrabold transition-transform group-hover:scale-110 md:size-14',
                     a.status === 'concluida' ? 'border-brand bg-brand text-white' : a.status === 'em_curso' ? 'border-dashed border-brand bg-paper text-brand' : 'border-line bg-paper text-ink-soft',
                   )}>
                     {a.status === 'concluida' ? <Check className="size-6" strokeWidth={3} aria-hidden /> : i + 1}
                   </span>
                   {urgency(a) && (
                     <span className={cn('num hidden max-w-[12ch] text-center text-xs leading-tight md:block', late(a) ? 'font-bold text-risk-high-ink' : 'text-ink-soft')}>{urgency(a)}</span>
                   )}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
