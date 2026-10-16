import type { ReactNode } from 'react'
import * as RTabs from '@radix-ui/react-tabs'

export interface TabDef {
  value: string
  label: string
  count?: number
  content: ReactNode
}

export function Tabs({ tabs, value, onValueChange, defaultValue }: { tabs: TabDef[]; value?: string; onValueChange?: (v: string) => void; defaultValue?: string }) {
  return (
    <RTabs.Root value={value} onValueChange={onValueChange} defaultValue={defaultValue ?? tabs[0]?.value} className="flex flex-col gap-5">
      <RTabs.List className="flex gap-1 border-b border-line-soft">
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            className="-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-[14px] font-semibold text-ink-soft transition-colors hover:text-ink data-[state=active]:border-brand data-[state=active]:font-bold data-[state=active]:text-brand"
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-paper-deep px-1.5 text-[11px] font-bold text-ink-soft">{t.count}</span>}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((t) => (
        <RTabs.Content key={t.value} value={t.value} className="focus-visible:outline-none">
          {t.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  )
}
