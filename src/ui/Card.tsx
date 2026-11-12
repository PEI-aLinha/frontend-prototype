import type { HTMLAttributes, ReactNode } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { cn } from './cn'

export function Card({ className, soft, ...rest }: HTMLAttributes<HTMLDivElement> & { soft?: boolean }) {
  return <div className={cn('rounded-[14px] border border-line-soft px-5 py-[18px]', soft ? 'bg-paper-soft' : 'bg-paper', className)} {...rest} />
}

export function Eyebrow({ children, className, as: Tag = 'p' }: { children: ReactNode; className?: string; as?: 'p' | 'span' | 'h2' | 'h3' }) {
  return <Tag className={cn('eyebrow text-xs text-muted', className)}>{children}</Tag>
}

interface StatCardProps {
  label: string
  value: ReactNode
  caption?: ReactNode
  /** Optional short preview under the caption, e.g. the first three rows of a longer list. */
  children?: ReactNode
  onClick?: () => void
  accent?: ReactNode
  className?: string
  /** Heading level for the card label, when the card sits under a section heading. */
  labelAs?: 'p' | 'h3'
}

/** Summary card: eyebrow 11 + ExtraBold 18 value + 13 caption. */
export function StatCard({ label, value, caption, children, onClick, accent, className, labelAs = 'p' }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow as={labelAs}>{label}</Eyebrow>
        {accent}
      </div>
      <p className="mt-1.5 text-lg font-extrabold leading-tight">{value}</p>
      {caption && <p className="mt-1.5 text-sm text-ink-soft">{caption}</p>}
      {children && <div className="mt-3">{children}</div>}
    </>
  )
  const cls = cn('flex-1 min-w-0 rounded-[14px] border border-line-soft bg-paper px-5 py-[18px] text-left', className)
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, 'transition-[border-color,box-shadow] hover:border-line hover:shadow-[0_2px_10px_rgb(var(--shadow-rgb)/0.06)]')}>
        {body}
      </button>
    )
  }
  return <div className={cls}>{body}</div>
}

export function HighlightCard({ eyebrow, title, children, action }: { eyebrow: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 rounded-[20px] bg-brand-deep px-8 py-[30px] text-white md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Eyebrow className="text-signal-soft">{eyebrow}</Eyebrow>
        <h2 className="text-3xl font-extrabold title-tight">{title}</h2>
        {children && <div className="text-sm font-semibold text-brand-soft">{children}</div>}
      </div>
      {action}
    </section>
  )
}

/** Aviso: fundo signal-soft, texto brand SemiBold 13, a toda a largura. `warning` usa a tinta de risco médio
 *  e um triângulo, para pedir atenção antes de uma decisão (nunca para erros). */
export function Note({ children, icon = true, tone = 'info', className }: { children: ReactNode; icon?: boolean; tone?: 'info' | 'warning'; className?: string }) {
  const Icon = tone === 'warning' ? TriangleAlert : Info
  return (
    <div role="note" className={cn('flex items-start gap-2.5 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold', tone === 'warning' ? 'bg-risk-medium text-risk-medium-ink' : 'bg-signal-soft text-brand', className)}>
      {icon && <Icon className="mt-[2px] size-4 shrink-0" aria-hidden />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
