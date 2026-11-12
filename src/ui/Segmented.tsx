import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { cn } from './cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  value: T | null
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  ariaLabel?: string
  labelledBy?: string
  invalid?: boolean
  block?: boolean
  /** `sm` matches the height of `sm` controls so it can share a toolbar row with them. */
  size?: 'md' | 'sm'
}

/** Controlo segmentado: contentor paper-deep (raio 12, padding 4), segmento ativo em superfície elevada.
 *  Não usa o preenchimento brand para não competir com o botão primário da página. */
export function Segmented<T extends string>({ value, onChange, options, ariaLabel, labelledBy, invalid, block, size = 'md' }: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value ?? ''}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      className={cn('inline-flex gap-1 rounded-[12px] bg-paper-deep/70', size === 'sm' ? 'p-[3px]' : 'p-1', block && 'flex w-full', invalid && 'ring-1 ring-danger')}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            'rounded-[9px] font-bold text-ink-soft transition-colors duration-150',
            size === 'sm' ? 'px-3.5 py-[5px] text-[0.8125rem]' : 'px-[18px] py-2 text-[0.9375rem]',
            'hover:text-ink data-[state=on]:bg-paper data-[state=on]:text-brand',
            'data-[state=on]:shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.14)] data-[state=on]:ring-1 data-[state=on]:ring-brand/35',
            block && 'flex-1',
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
