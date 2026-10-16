import { cn } from './cn'

export function ProgressBar({ value, max, label, className, track = 'light' }: { value: number; max: number; label: string; className?: string; track?: 'light' | 'dark' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className={cn('h-1.5 overflow-hidden rounded-[3px]', track === 'dark' ? 'bg-brand' : 'bg-paper-deep', className)}>
      <div className="h-full origin-left rounded-[3px] bg-signal transition-transform duration-500 ease-[var(--ease-out-expo)]" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  )
}
