import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from './cn'

interface BaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  chip?: ReactNode
  children?: ReactNode
  footer?: ReactNode
}

/** Modal: ink 45% overlay, white window radius 20, padding 28/32, gap 18, width 540. */
export function Modal({ open, onOpenChange, title, description, chip, children, footer, width = 540 }: BaseProps & { width?: number }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45 animate-fade-in" />
        <Dialog.Content
          style={{ maxWidth: width }}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-[18px] overflow-y-auto rounded-[20px] bg-paper px-8 py-7 shadow-[0_24px_64px_rgba(6,54,50,0.22)] animate-pop-in max-sm:px-5 max-sm:py-6"
        >
          {chip && <div>{chip}</div>}
          <Dialog.Title className="text-[26px] font-extrabold title-tight">{title}</Dialog.Title>
          {description ? <Dialog.Description className="-mt-1 text-[15px] text-ink-soft">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
          {children}
          {footer && <div className="mt-1 flex flex-wrap justify-end gap-3 max-sm:[&>*]:flex-1">{footer}</div>}
          <Dialog.Close className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-paper-soft hover:text-ink" aria-label="Fechar">
            <X className="size-5" aria-hidden />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Side panel for detail and editing (full screen on mobile, sliding up from the bottom). */
export function Drawer({ open, onOpenChange, title, description, chip, children, footer, width = 520, eyebrow }: BaseProps & { width?: number; eyebrow?: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 animate-fade-in" />
        <Dialog.Content
          style={{ ['--drawer-w' as string]: `${width}px` }}
          className={cn(
            'fixed z-50 flex flex-col bg-paper shadow-[-16px_0_48px_rgba(6,54,50,0.16)]',
            'inset-y-0 right-0 w-[min(var(--drawer-w),100vw)] animate-slide-in',
            'max-md:inset-x-0 max-md:bottom-0 max-md:top-6 max-md:w-full max-md:rounded-t-[20px] max-md:animate-slide-up',
          )}
        >
          <header className="flex items-start gap-3 border-b border-line-soft px-7 pb-5 pt-6 max-md:px-5">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {eyebrow && <div className="eyebrow text-[11px] text-muted">{eyebrow}</div>}
              {chip && <div className="flex flex-wrap gap-2">{chip}</div>}
              <Dialog.Title className="text-[22px] font-extrabold title-tight">{title}</Dialog.Title>
              {description ? <Dialog.Description className="text-[14px] text-ink-soft">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close className="-mr-2 rounded-full p-2 text-muted hover:bg-paper-soft hover:text-ink" aria-label="Fechar painel">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-7 py-6 max-md:px-5">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-3 border-t border-line-soft bg-paper px-7 py-4 max-md:px-5 max-sm:[&>*]:flex-1">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
