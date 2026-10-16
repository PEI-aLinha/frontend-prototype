import type { ReactNode } from 'react'
import * as RTooltip from '@radix-ui/react-tooltip'

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <RTooltip.Root delayDuration={250}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content sideOffset={6} className="z-[95] max-w-[280px] rounded-[8px] bg-ink px-3 py-2 text-[12px] font-semibold text-white shadow-lg animate-fade-in">
          {content}
          <RTooltip.Arrow className="fill-ink" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}

export const TooltipProvider = RTooltip.Provider
