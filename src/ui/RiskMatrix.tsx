import type { Level } from '../api/contracts'
import type { ScaleStep } from '../config/riskMatrix'
import { RISK_LEVEL_LABEL } from '../config/labels'
import { riskCellClass } from './riskStyle'
import { cn } from './cn'

export interface MatrixCell {
  probability: number
  impact: number
}

interface RiskMatrixProps {
  probability: ScaleStep[]
  impact: ScaleStep[]
  levelOf: (probability: number, impact: number) => Level
  count: (probability: number, impact: number) => number
  selected?: MatrixCell | null
  onSelect?: (cell: MatrixCell | null) => void
  compact?: boolean
}

/** Heatmap gerado a partir da configuração (3×3 hoje, 5×5 amanhã). Probabilidade em linhas, impacto em colunas. */
export function RiskMatrix({ probability, impact, levelOf, count, selected, onSelect, compact }: RiskMatrixProps) {
  const rows = [...probability].reverse()
  const size = compact ? 'h-14' : 'h-[72px]'
  return (
    <div className="flex gap-3">
      <div className="flex items-center">
        <span className="eyebrow text-[11px] text-muted [writing-mode:vertical-rl] rotate-180">Probabilidade</span>
      </div>
      <div className="min-w-0 flex-1">
        <table className="w-full table-fixed border-separate border-spacing-1.5">
          <caption className="sr-only">Matriz de risco: probabilidade por impacto, com o número de riscos em cada célula</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Probabilidade</th>
              {impact.map((i) => <th key={i.value} scope="col">Impacto {i.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.value}>
                <th scope="row" className="w-16 pr-1 text-right text-[12px] font-semibold text-ink-soft">{p.label}</th>
                {impact.map((i) => {
                  const level = levelOf(p.value, i.value)
                  const n = count(p.value, i.value)
                  const isSel = selected?.probability === p.value && selected?.impact === i.value
                  const label = `Probabilidade ${p.label}, impacto ${i.label}: nível ${RISK_LEVEL_LABEL[level]}, ${n} ${n === 1 ? 'risco' : 'riscos'}`
                  return (
                    <td key={i.value} className="p-0">
                      <button
                        type="button"
                        disabled={!onSelect}
                        aria-pressed={isSel}
                        aria-label={label}
                        onClick={() => onSelect?.(isSel ? null : { probability: p.value, impact: i.value })}
                        className={cn(
                          'relative flex w-full flex-col items-center justify-center rounded-[10px] transition-[transform,box-shadow] duration-150',
                          size,
                          riskCellClass(level),
                          onSelect && 'hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(32,33,36,0.1)]',
                          isSel && 'ring-2 ring-ink ring-offset-2 ring-offset-paper',
                          n === 0 && 'opacity-55',
                        )}
                      >
                        <span className={cn('font-extrabold leading-none', compact ? 'text-[18px]' : 'text-[22px]')}>{n}</span>
                        {!compact && <span className="mt-1 text-[11px] font-bold opacity-80">{RISK_LEVEL_LABEL[level]}</span>}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr>
              <td />
              {impact.map((i) => <td key={i.value} className="pt-1 text-center text-[12px] font-semibold text-ink-soft">{i.label}</td>)}
            </tr>
          </tbody>
        </table>
        <p className="eyebrow mt-1 pl-[70px] text-center text-[11px] text-muted">Impacto</p>
      </div>
    </div>
  )
}
