import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'link' | 'danger' | 'inverse'
type Size = 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  block?: boolean
}

const VARIANT: Record<Variant, string> = {
  primary: 'border border-transparent bg-brand text-white hover:bg-brand-deep active:translate-y-px disabled:bg-silver',
  secondary: 'bg-paper text-ink border border-line hover:border-ink-soft hover:bg-paper-soft active:translate-y-px disabled:text-muted',
  ghost: 'text-ink-soft hover:bg-paper-soft hover:text-ink',
  link: 'text-brand underline-offset-4 hover:underline !p-0 !h-auto',
  danger: 'bg-paper text-danger border border-line hover:border-danger hover:bg-risk-high/40',
  inverse: 'border border-transparent bg-paper text-ink hover:bg-brand-soft active:translate-y-px',
}

const SIZE: Record<Size, string> = {
  md: 'px-6 py-[13px] text-[0.9375rem] rounded-[10px]',
  sm: 'px-3.5 py-2 text-[0.8125rem] rounded-[9px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold leading-none whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})
