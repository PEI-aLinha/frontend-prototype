import { cn } from './cn'

export const controlClass = (invalid?: boolean) =>
  cn(
    'w-full rounded-[10px] border bg-paper px-3.5 py-3 text-[15px] text-ink placeholder:text-muted transition-[border-color,box-shadow]',
    'hover:border-ink-soft focus:outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_3px_var(--color-brand-soft)]',
    'disabled:bg-paper-soft disabled:text-muted',
    invalid ? 'border-danger' : 'border-line',
  )
