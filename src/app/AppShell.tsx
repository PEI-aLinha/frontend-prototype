import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { Avatar, Logo, cn } from '../ui'

export interface NavItem {
  to: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  end?: boolean
}

export interface NavSection {
  heading?: string
  items: NavItem[]
}

interface AppShellProps {
  sections: NavSection[]
  user: { initials: string; name: string; subtitle: string }
  /** Entradas da tab bar no mobile (por omissão, todas). */
  tabs?: NavItem[]
  /** Ações globais (ex.: notificações), no topo da navegação e do cabeçalho mobile. */
  tools?: ReactNode
  children: ReactNode
}

/** Navegação lateral de 232 px no desktop; topo + tab bar no mobile (390). */
export function AppShell({ sections, user, tabs, tools, children }: AppShellProps) {
  const tabItems = tabs ?? sections.flatMap((s) => s.items)
  return (
    <div className="min-h-dvh bg-paper md:flex">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
        Saltar para o conteúdo
      </a>

      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line-soft bg-paper-soft px-5 pb-7 pt-8 md:flex">
        <div className="flex items-center justify-between pl-1"><Logo />{tools}</div>
        <nav aria-label="Navegação principal" className="mt-9 flex flex-1 flex-col gap-5 overflow-y-auto">
          {sections.map((s, i) => (
            <div key={i} className="flex flex-col gap-1">
              {s.heading && <p className="eyebrow mb-1 truncate px-3 text-[10.5px] text-muted">{s.heading}</p>}
              {s.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex h-10 items-center rounded-[10px] px-3 text-[14px] transition-colors duration-150',
                      isActive ? 'bg-brand-soft font-bold text-brand' : 'font-semibold text-ink-soft hover:bg-paper-deep/60 hover:text-ink',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 pt-4">
          <Avatar initials={user.initials} size={36} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{user.name}</p>
            <p className="truncate text-[12px] text-muted">{user.subtitle}</p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line-soft bg-paper/95 px-5 backdrop-blur md:hidden">
        <Logo className="!text-[24px]" />
        <div className="flex items-center gap-1">{tools}<Avatar initials={user.initials} size={28} label={user.name} /></div>
      </header>

      <main id="conteudo" className="min-w-0 flex-1 px-14 pb-16 pt-11 max-lg:px-8 max-md:px-5 max-md:pb-28 max-md:pt-6">
        <div className="mx-auto flex max-w-[1152px] flex-col gap-7">{children}</div>
      </main>

      <nav aria-label="Navegação principal (mobile)" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line-soft bg-paper/95 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur md:hidden">
        {tabItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px]', isActive ? 'font-bold text-brand' : 'font-semibold text-ink-soft')}
          >
            {({ isActive }) => (
              <>
                <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-brand-soft')}>
                  <item.icon className="size-[18px]" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                </span>
                {item.shortLabel ?? item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
