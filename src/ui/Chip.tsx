import type { ReactNode } from 'react'
import { Circle, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { Level } from '../api/contracts'
import { CRITICALITY_LABEL, RISK_LEVEL_LABEL } from '../config/labels'
import { cn } from './cn'
import { riskCellClass } from './riskStyle'

type Tone = 'signal' | 'neutral' | 'dark' | 'outline'

const TONE: Record<Tone, string> = {
  signal: 'bg-signal-soft text-brand',
  neutral: 'bg-paper-deep text-ink-soft',
  dark: 'bg-brand-deep text-white',
  outline: 'border border-line-soft text-ink-soft bg-paper',
}

export function Chip({ tone = 'signal', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-bold leading-[1.2]', TONE[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

/** Criticality: High = dark chip, Medium = signal, Low = neutral. */
export function CriticalityChip({ level }: { level: Level }) {
  const tone: Tone = level === 'alto' ? 'dark' : level === 'medio' ? 'signal' : 'neutral'
  return <Chip tone={tone}>{CRITICALITY_LABEL[level]}</Chip>
}

const RISK_ICON: Record<Level, typeof Circle> = { baixo: Circle, medio: TriangleAlert, alto: OctagonAlert }

/** Risk level: color + icon + text (never color alone). */
export function RiskLevelBadge({ level, prefix, size = 'md' }: { level: Level; prefix?: string; size?: 'md' | 'lg' }) {
  const cls = riskCellClass(level)
  const Icon = RISK_ICON[level]
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold leading-[1.2]', cls, size === 'lg' ? 'px-3 py-1.5 text-[0.9375rem]' : 'px-2.5 py-1 text-[0.75rem]')}>
      <Icon className={size === 'lg' ? 'size-4' : 'size-3.5'} strokeWidth={2.25} aria-hidden />
      {prefix}
      {RISK_LEVEL_LABEL[level]}
    </span>
  )
}

/** Mandatory label on all AI content. */
export function AIBadge({ kind = 'proposal', onDark }: { kind?: 'proposal' | 'info'; onDark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-bold leading-[1.2]', onDark ? 'bg-brand text-signal-soft' : 'border border-brand-soft bg-paper text-brand')}>
      <span aria-hidden>✦</span>
      {kind === 'proposal' ? 'Proposta pela IA · por validar' : 'Gerado por IA · apenas informativo'}
    </span>
  )
}
