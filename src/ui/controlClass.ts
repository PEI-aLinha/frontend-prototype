import { cn } from './cn'

export const controlClass = (invalid?: boolean, size: 'md' | 'sm' = 'md') =>
  cn(
    'w-full rounded-[10px] border bg-paper text-ink placeholder:text-muted transition-[border-color,box-shadow]',
    'hover:border-ink-soft focus:outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_3px_var(--color-brand-soft)]',
    'disabled:bg-paper-soft disabled:text-muted',
    size === 'sm' ? 'px-3 py-2 text-[0.8125rem] font-semibold' : 'px-3.5 py-3 text-[0.9375rem]',
    invalid ? 'border-danger' : 'border-line',
  )
