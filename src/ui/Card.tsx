import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Info } from 'lucide-react'
import { cn } from './cn'

export function Card({ className, soft, as: Tag = 'div', ...rest }: HTMLAttributes<HTMLElement> & { soft?: boolean; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={cn('rounded-[14px] border border-line-soft px-5 py-[18px]', soft ? 'bg-paper-soft' : 'bg-paper', className)} {...rest} />
}

export function Eyebrow({ children, className, as: Tag = 'p' }: { children: ReactNode; className?: string; as?: 'p' | 'span' | 'h2' | 'h3' }) {
  return <Tag className={cn('eyebrow text-[0.6875rem] text-muted', className)}>{children}</Tag>
}

interface StatCardProps {
  label: string
  value: ReactNode
  caption?: ReactNode
  onClick?: () => void
  /** Internal route: the whole card becomes a link. */
  to?: string
  accent?: ReactNode
  /** Larger value for the figure that matters most in a group. */
  emphasis?: boolean
  /** `alert`: tinted surface for a figure that needs attention (e.g. high risks). */
  tone?: 'default' | 'alert'
  className?: string
}

const STAT_CLS = 'flex-1 min-w-0 rounded-[14px] border px-5 py-[18px] text-left'
const STAT_TONE = { default: 'border-line-soft bg-paper', alert: 'border-risk-high-ink/25 bg-risk-high/45' } as const
const STAT_HOVER = 'transition-[border-color,box-shadow] hover:border-line hover:shadow-[0_2px_10px_rgba(32,33,36,0.06)]'

/** Summary card: eyebrow 11 + ExtraBold 18 value (28 with `emphasis`) + 13 caption. A `<dl>` unless it is a button. */
export function StatCard({ label, value, caption, onClick, to, accent, emphasis, tone = 'default', className }: StatCardProps) {
  const base = cn(STAT_CLS, STAT_TONE[tone])
  const valueCls = cn('mt-1.5 font-extrabold leading-tight', emphasis ? 'text-[1.75rem]' : 'text-[1.125rem]', tone === 'alert' && 'text-risk-high-ink')
  if (onClick) {
    // Buttons only take phrasing content: same layout with spans.
    return (
      <button type="button" onClick={onClick} className={cn(base, STAT_HOVER, className)}>
        <span className="flex items-start justify-between gap-2"><Eyebrow as="span">{label}</Eyebrow>{accent}</span>
        <span className={cn('block', valueCls)}>{value}</span>
        {caption && <span className="mt-1.5 block text-[0.8125rem] text-ink-soft">{caption}</span>}
      </button>
    )
  }
  const body = (
    <dl className="flex flex-col">
      <dt className="flex items-start justify-between gap-2"><span className="eyebrow text-[0.6875rem] text-muted">{label}</span>{accent}</dt>
      <dd className={valueCls}>{value}</dd>
      {caption && <dd className="mt-1.5 text-[0.8125rem] text-ink-soft">{caption}</dd>}
    </dl>
  )
  if (to) return <Link to={to} className={cn(base, STAT_HOVER, 'block', className)}>{body}</Link>
  return <div className={cn(base, className)}>{body}</div>
}

export function HighlightCard({ eyebrow, title, children, action }: { eyebrow: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 rounded-[20px] bg-brand-deep px-8 py-[30px] text-white md:flex-row md:items-center max-md:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Eyebrow className="text-signal-soft">{eyebrow}</Eyebrow>
        <h2 id={id} className="text-[1.625rem] font-extrabold title-tight max-md:text-[1.375rem]">{title}</h2>
        {children && <div className="text-[0.8125rem] font-semibold text-brand-soft">{children}</div>}
      </div>
      {action}
    </section>
  )
}

/** Aviso: fundo signal-soft, texto brand SemiBold 13, a toda a largura. */
export function Note({ children, icon = true, plain = false, className }: { children: ReactNode; icon?: boolean; plain?: boolean; className?: string }) {
  return (
    <div role="note" className={cn('flex items-start gap-2.5 text-[0.8125rem]', plain ? 'text-ink-soft' : 'rounded-[10px] bg-signal-soft px-3.5 py-2.5 font-semibold text-brand', className)}>
      {icon && <Info className="mt-[2px] size-4 shrink-0" aria-hidden />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
