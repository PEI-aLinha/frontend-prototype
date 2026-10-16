import { useNavigate } from 'react-router'
import * as Popover from '@radix-ui/react-popover'
import { Bell, BellRing, CheckCheck, ClipboardList, Mail, MessageSquare, Plug, ShieldCheck, Timer } from 'lucide-react'
import type { AppNotification, NotificationKind } from '../api/contracts'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../api/queries'
import { dateTime } from '../config/labels'
import { cn } from '../ui'

const ICON: Record<NotificationKind, typeof Bell> = {
  tarefa: ClipboardList, tarefa_concluida: CheckCheck, lembrete: BellRing, prazo: Timer, comentario: MessageSquare,
  roadmap: ShieldCheck, avaliacao: ClipboardList, integracao: Plug, risco: ShieldCheck,
}

/** Notification center (in-app). The same notifications are also sent by email (simulated). */
export function NotificationBell({ compact }: { compact?: boolean }) {
  const navigate = useNavigate()
  const list = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const items = list.data ?? []
  const unread = items.filter((n) => !n.read).length

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <Popover.Root>
      <Popover.Trigger aria-label={unread ? `Notificações: ${unread} por ler` : 'Notificações'} className={cn('relative grid place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep/60 hover:text-ink', compact ? 'size-9' : 'size-10')}>
        <Bell className="size-5" aria-hidden />
        {unread > 0 && <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10.5px] font-extrabold leading-[18px] text-white ring-2 ring-paper-soft">{unread}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} collisionPadding={12} className="z-[96] flex max-h-[min(560px,80dvh)] w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[16px] border border-line-soft bg-paper shadow-[0_16px_48px_rgba(32,33,36,0.18)] animate-pop-in">
          <header className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <p className="text-[15px] font-extrabold">Notificações</p>
            {unread > 0 && <button type="button" onClick={() => markAll.mutate()} className="text-[13px] font-bold text-brand hover:underline">Marcar todas como lidas</button>}
          </header>
          <ul className="flex-1 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-[14px] text-ink-soft">Sem notificações.</li>}
            {items.map((n) => {
              const Icon = ICON[n.kind]
              return (
                <li key={n.id} className="border-b border-line-soft last:border-b-0">
                  <Popover.Close asChild>
                    <button type="button" onClick={() => open(n)} className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-paper-soft', !n.read && 'bg-signal-soft/30')}>
                      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', n.read ? 'bg-paper-soft text-ink-soft' : 'bg-brand-soft text-brand')}><Icon className="size-4" aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className={cn('flex-1 text-[14px]', n.read ? 'font-semibold' : 'font-extrabold')}>{n.title}</span>
                          {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Por ler" />}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-ink-soft">{n.body}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
                          {dateTime(n.createdAt)}
                          {n.channels.includes('email') && <><span aria-hidden>·</span><Mail className="size-3" aria-hidden />também por email</>}
                        </span>
                      </span>
                    </button>
                  </Popover.Close>
                </li>
              )
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
