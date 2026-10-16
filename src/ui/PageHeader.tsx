import type { ReactNode } from 'react'
import { Eyebrow } from './Card'

/** Eyebrow + 30 title + subtitle; actions on the right, aligned to the title baseline. */
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: ReactNode; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-2">
        <Eyebrow className="text-[12px]">{eyebrow}</Eyebrow>
        <h1 className="text-[30px] font-extrabold title-tight max-md:text-[26px]">{title}</h1>
        {subtitle && <p className="text-[16px] text-ink-soft max-md:text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 max-md:w-full max-md:[&>*]:flex-1">{actions}</div>}
    </header>
  )
}
