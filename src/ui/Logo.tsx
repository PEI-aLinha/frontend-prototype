import { cn } from './cn'

/** Wordmark "aLinha": o "l" desce e sublinha "inha". */
export function Logo({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <span role="img" aria-label="aLinha" className={cn('inline-flex items-baseline text-[30px] font-extrabold leading-none tracking-[-0.02em]', dark ? 'text-white' : 'text-brand', className)}>
      <span aria-hidden>a</span>
      <span aria-hidden className="relative ml-[1px] pb-[6px]">
        linha
        <span className="absolute bottom-0 left-[0.07em] right-0 h-[3px] rounded-[1px] bg-current" />
      </span>
    </span>
  )
}
