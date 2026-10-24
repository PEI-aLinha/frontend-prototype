import type { HTMLAttributes, ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from './cn'

export function Card({ className, soft, as: Tag = 'div', ...rest }: HTMLAttributes<HTMLElement> & { soft?: boolean; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={cn('rounded-[14px] border border-line-soft px-5 py-[18px]', soft ? 'bg-paper-soft' : 'bg-paper', className)} {...rest} />
}

export function Eyebrow({ children, className, as: Tag = 'p' }: { children: ReactNode; className?: string; as?: 'p' | 'span' | 'h2' | 'h3' }) {
  return <Tag className={cn('eyebrow text-[11px] text-muted', className)}>{children}</Tag>
}

interface StatCardProps {
  label: string
  value: ReactNode
  caption?: ReactNode
  onClick?: () => void
  accent?: ReactNode
}

/** Summary card: eyebrow 11 + ExtraBold 18 value + 13 caption. */
export function StatCard({ label, value, caption, onClick, accent }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>{label}</Eyebrow>
        {accent}
      </div>
      <p className="mt-1.5 text-[18px] font-extrabold leading-tight">{value}</p>
      {caption && <p className="mt-1.5 text-[13px] text-ink-soft">{caption}</p>}
    </>
  )
  const cls = 'flex-1 min-w-0 rounded-[14px] border border-line-soft bg-paper px-5 py-[18px] text-left'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, 'transition-[border-color,box-shadow] hover:border-line hover:shadow-[0_2px_10px_rgba(32,33,36,0.06)]')}>
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
        <h2 className="text-[26px] font-extrabold title-tight">{title}</h2>
        {children && <div className="text-[13px] font-semibold text-brand-soft">{children}</div>}
      </div>
      {action}
    </section>
  )
}

/** Aviso: fundo signal-soft, texto brand SemiBold 13, a toda a largura. */
export function Note({ children, icon = true, className }: { children: ReactNode; icon?: boolean; className?: string }) {
  return (
    <div role="note" className={cn('flex items-start gap-2.5 rounded-[10px] bg-signal-soft px-3.5 py-2.5 text-[13px] font-semibold text-brand', className)}>
      {icon && <Info className="mt-[2px] size-4 shrink-0" aria-hidden />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
