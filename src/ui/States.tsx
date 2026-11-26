import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CloudOff, SearchX } from 'lucide-react'
import { ApiError } from '../api/contracts'
import { Button } from './Button'
import { cn } from './cn'

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden style={style} className={cn('animate-pulse rounded-[8px] bg-paper-deep/70', className)} />
}

export function SkeletonRows({ rows = 4, label = 'A carregar…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="ml-auto h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, children, action, className, headingLevel = 3 }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string; headingLevel?: 1 | 2 | 3 }) {
  // Level 1 when the empty state is the whole page (e.g. "not found"), so the page still has an h1.
  const Heading = (['h1', 'h2', 'h3'] as const)[headingLevel - 1]
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-line px-6 py-12 text-center', className)}>
      {icon && <div className="grid size-11 place-items-center rounded-full bg-paper-soft text-ink-soft">{icon}</div>}
      <Heading className="text-[1.0625rem] font-bold">{title}</Heading>
      {children && <div className="max-w-[440px] text-[0.9375rem] text-ink-soft">{children}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

/** A page or record that does not exist: retrying cannot help, so offer a way out instead. */
export function NotFoundState({ headingLevel = 2, children }: { headingLevel?: 1 | 2 | 3; children?: ReactNode }) {
  return (
    <EmptyState headingLevel={headingLevel} icon={<SearchX className="size-5" aria-hidden />} title="Não encontrámos esta página"
      action={<Link to="/" className="font-bold text-brand hover:underline">Ir para o início</Link>}>
      {children ?? 'O endereço pode estar incompleto, ou o que procurava foi removido.'}
    </EmptyState>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof ApiError && error.status === 404) return <NotFoundState>{error.message}. O endereço pode estar incompleto, ou foi removido.</NotFoundState>
  const detail = error instanceof Error ? error.message : null
  return (
    <EmptyState icon={<CloudOff className="size-5" aria-hidden />} title="Não conseguimos carregar estes dados" action={onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Tentar de novo</Button>}>
      <div role="alert" className="flex flex-col gap-2">
        <p>Pode ser uma falha de ligação momentânea. O que já guardou não se perdeu: tente de novo dentro de instantes.</p>
        {detail && (
          <details className="text-[0.75rem] text-muted">
            <summary className="cursor-pointer">Detalhe técnico</summary>
            <p className="mt-1">{detail}</p>
          </details>
        )}
      </div>
    </EmptyState>
  )
}
