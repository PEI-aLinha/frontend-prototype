import { cn } from './cn'

/** Logótipo oficial aLinha (SVG em public/images). */
export function Logo({ className }: { className?: string }) {
  return <img src="/images/alinha-logo.svg" alt="aLinha" width={985} height={404} className={cn('h-9 w-auto', className)} />
}
