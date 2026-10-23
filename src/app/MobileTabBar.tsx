import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Ellipsis } from 'lucide-react'
import { Drawer, cn } from '../ui'
import { navActive, type NavItem } from './AppShell'

/** More than this and the last slot becomes "Mais" (design-spec: the tab bar keeps every navigation entry). */
const MAX_TABS = 5

const tabClass = (isActive: boolean) => cn('flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px]', isActive ? 'font-bold text-brand' : 'font-semibold text-ink-soft')

function TabFace({ icon: Icon, label, isActive }: { icon: NavItem['icon']; label: string; isActive: boolean }) {
  return (
    <>
      <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-brand-soft')}>
        <Icon className="size-[18px]" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
      </span>
      {label}
    </>
  )
}

export function MobileTabBar({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const overflow = items.length > MAX_TABS
  const visible = overflow ? items.slice(0, MAX_TABS - 1) : items
  const more = overflow ? items.slice(MAX_TABS - 1) : []
  const moreActive = more.some((i) => navActive(i, pathname))

  return (
    <nav aria-label="Navegação principal (mobile)" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line-soft bg-paper/95 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur md:hidden">
      {visible.map((item) => (
        <Link key={item.to} to={item.to} aria-current={navActive(item, pathname) ? 'page' : undefined} className={tabClass(navActive(item, pathname))}>
          <TabFace icon={item.icon} label={item.shortLabel ?? item.label} isActive={navActive(item, pathname)} />
        </Link>
      ))}
      {overflow && (
        <>
          <button type="button" className={tabClass(moreActive)} aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
            <TabFace icon={Ellipsis} label="Mais" isActive={moreActive} />
          </button>
          <Drawer open={moreOpen} onOpenChange={setMoreOpen} title="Mais">
            <ul className="flex flex-col gap-1">
              {more.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} onClick={() => setMoreOpen(false)} aria-current={navActive(item, pathname) ? 'page' : undefined}
                    className={cn('flex h-12 items-center gap-3 rounded-[12px] px-3 text-[15px]', navActive(item, pathname) ? 'bg-brand-soft font-bold text-brand' : 'font-semibold text-ink hover:bg-paper-soft')}>
                    <item.icon className="size-5" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Drawer>
        </>
      )}
    </nav>
  )
}
