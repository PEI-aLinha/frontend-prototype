import type { ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { HelpCircle } from 'lucide-react'
import { GLOSSARY, type GlossaryKey } from '../config/glossary'
import { cn } from './cn'

/** Technical term with a plain-language explanation (click or keyboard). */
export function Term({ k, children, icon, className }: { k: GlossaryKey; children?: ReactNode; icon?: boolean; className?: string }) {
  const entry = GLOSSARY[k]
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        onClick={(e) => e.stopPropagation()}
        className={cn('inline-flex items-center gap-1 rounded-[3px] text-left underline decoration-line decoration-dotted decoration-[1.5px] underline-offset-[3px] hover:decoration-brand', className)}
        title="O que significa?"
      >
        {children ?? entry.term}
        {icon && <HelpCircle className="size-3.5 text-muted" aria-hidden />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} collisionPadding={16} onClick={(e) => e.stopPropagation()} className="z-[96] w-[300px] rounded-[12px] border border-line-soft bg-paper p-4 text-left shadow-[0_12px_32px_rgba(32,33,36,0.16)] animate-pop-in">
          <p className="eyebrow text-[0.6563rem] text-muted">O que significa</p>
          <p className="mt-1 text-[0.9375rem] font-extrabold text-ink">{entry.term}</p>
          <p className="mt-1.5 text-[0.8125rem] font-normal normal-case tracking-normal text-ink-soft">{entry.short}</p>
          {'example' in entry && entry.example && <p className="mt-2 rounded-[8px] bg-paper-soft px-2.5 py-2 text-[0.75rem] font-normal normal-case tracking-normal text-ink-soft"><span className="font-bold text-ink">Exemplo: </span>{entry.example}</p>}
          <Popover.Arrow className="fill-paper" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
