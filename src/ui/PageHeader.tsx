import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Kept for callers; not rendered (no label above page titles). */
  eyebrow?: ReactNode
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  /** Tertiary help (e.g. the guided tour), on the eyebrow line so it never competes with the actions. */
  help?: ReactNode
}

/** Eyebrow (+ help on the right) over a 30 title + subtitle; actions on the right, aligned to the title baseline. */
export function PageHeader({ title, subtitle, actions, help }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* The page title carries the hierarchy; the organisation is already in the navigation, so no kicker above it. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-[1.875rem] font-extrabold title-tight max-md:text-[1.625rem]">{title}</h1>
          {subtitle && <p className="text-[1rem] text-ink-soft max-md:text-[0.9375rem]">{subtitle}</p>}
        </div>
        {(actions || help) && <div className="flex flex-wrap items-center gap-3 max-md:w-full max-md:[&>*]:flex-1">{help}{actions}</div>}
      </div>
    </div>
  )
}
