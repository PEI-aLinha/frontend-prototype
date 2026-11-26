import { Suspense, type ReactNode } from 'react'
import { Search, Sparkles, type LucideIcon } from 'lucide-react'
import { CommandMenu, Kbd } from './CommandMenu'
import { MOD_KEY, useCommandMenu } from './useCommandMenu'
import { Link, matchPath, useLocation } from 'react-router'
import { Avatar, Logo, SkeletonRows, cn } from '../ui'
import { AppearanceMenu } from './AppearanceMenu'
import { openExpandedChat } from '../features/chatbot/ChatControl'
import { MobileTabBar } from './MobileTabBar'

export interface NavItem {
  to: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  end?: boolean
  /** Overrides the default matching, e.g. when a section lives under another one's URL. */
  isActive?: (pathname: string) => boolean
}

/** Whether a navigation entry is the current one (its own rule, or its URL prefix). */
// eslint-disable-next-line react-refresh/only-export-components
export function navActive(item: NavItem, pathname: string): boolean {
  return item.isActive ? item.isActive(pathname) : !!matchPath({ path: item.to, end: !!item.end }, pathname)
}

export interface NavSection {
  heading?: string
  items: NavItem[]
}

interface AppShellProps {
  sections: NavSection[]
  user: { initials: string; name: string; subtitle: string }
  /** Mobile tab bar entries, in order (all by default; extras go under "Mais"). */
  tabs?: NavItem[]
  /** Global actions (e.g. notifications), at the top of the navigation and the mobile header. */
  tools?: ReactNode
  children: ReactNode
}

/** 232 px side navigation on desktop; top bar + tab bar on mobile (390). */
export function AppShell({ sections, user, tabs, tools, children }: AppShellProps) {
  const { pathname } = useLocation()
  const tabItems = tabs ?? sections.flatMap((s) => s.items)
  const cmd = useCommandMenu()
  return (
    <div className="min-h-dvh bg-paper md:flex">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
        Saltar para o conteúdo
      </a>

      <aside aria-label="Barra lateral" className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line-soft bg-paper-soft px-5 pb-7 pt-8 md:flex">
        <div className="flex items-center justify-between pl-1"><Logo /><div className="flex items-center gap-1">{tools}<AppearanceMenu /></div></div>
        <button type="button" onClick={() => cmd.setOpen(true)} className="mt-8 flex h-10 items-center gap-2 rounded-[10px] border border-line-soft bg-paper px-3 text-[0.9375rem] font-semibold text-muted transition-colors hover:border-line hover:text-ink-soft">
          <Search className="size-4" aria-hidden /><span className="flex-1 text-left">Procurar</span><Kbd>{MOD_KEY}</Kbd><Kbd>K</Kbd>
        </button>
        <nav aria-label="Navegação principal" data-tour="nav" className="mt-5 flex flex-1 flex-col gap-5 overflow-y-auto">
          {sections.map((s, i) => (
            <div key={i} className="flex flex-col gap-1">
              {s.heading && <p className="eyebrow mb-1 truncate px-3 text-[0.75rem] text-muted">{s.heading}</p>}
              {s.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  viewTransition
                  aria-current={navActive(item, pathname) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-10 items-center rounded-[10px] px-3 py-1.5 text-[0.9375rem] leading-tight transition-colors duration-150',
                    navActive(item, pathname) ? 'bg-brand-soft font-bold text-brand' : 'font-semibold text-ink-soft hover:bg-paper-deep/60 hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Abre o assistente já em ecrã inteiro (o botão flutuante continua a abrir o painel pequeno) */}
        <button
          type="button"
          onClick={() => openExpandedChat()}
          className="mb-12 mt-4 flex h-10 items-center gap-2 rounded-[10px] border border-line-soft bg-paper px-3 text-[0.9375rem] font-semibold text-ink-soft transition-colors duration-150 hover:border-line hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <Sparkles className="size-4 flex-none text-brand" aria-hidden />
          Assistente IA
        </button>

        <div className="flex items-center gap-2.5 pt-4">
          <Avatar initials={user.initials} size={36} />
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] font-bold">{user.name}</p>
            <p className="truncate text-[0.75rem] text-muted">{user.subtitle}</p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line-soft bg-paper/95 px-5 backdrop-blur md:hidden">
        <Logo className="h-7" />
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => cmd.setOpen(true)} aria-label="Procurar" className="grid size-11 place-items-center rounded-full text-ink-soft"><Search className="size-5" aria-hidden /></button>
          <button type="button" onClick={() => openExpandedChat()} aria-label="Assistente IA" className="grid size-11 place-items-center rounded-full text-brand"><Sparkles className="size-5" aria-hidden /></button>
          {tools}<AppearanceMenu account={user} /></div>
      </header>

      <main id="conteudo" className="min-w-0 flex-1 px-14 pb-16 pt-11 max-lg:px-8 max-md:px-5 max-md:pb-28 max-md:pt-6">
        <div className="mx-auto flex max-w-[1152px] flex-col gap-7"><Suspense fallback={<SkeletonRows rows={6} label="A carregar o ecrã…" />}>{children}</Suspense></div>
      </main>

      <MobileTabBar items={tabItems} />
      <CommandMenu open={cmd.open} onOpenChange={cmd.setOpen} sections={sections} />
    </div>
  )
}